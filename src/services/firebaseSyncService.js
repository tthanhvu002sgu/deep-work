// src/services/firebaseSyncService.js
import { 
  auth, 
  signInWithPopup, 
  firebaseSignOut, 
  firebaseOnAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc,
  isFirebaseConfigured,
  initFirebaseApp
} from "./firebase";
import fileStorageService from "./fileStorageService";

const STORAGE_KEY_LAST_SYNC = "deepwork_last_cloud_sync_timestamp";
const STORAGE_KEY_AUTO_SYNC_ENABLED = "deepwork_auto_sync_enabled";
const AUTO_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 giờ

class FirebaseSyncService {
  constructor() {
    this.currentUser = null;
    this.isSyncing = false;
    this.listeners = new Set();
    this.autoSyncTimer = null;

    // Lắng nghe trạng thái đăng nhập Firebase
    this.initAuthListener();
  }

  initAuthListener() {
    try {
      if (!auth) {
        const instances = initFirebaseApp();
        if (!instances.auth) return;
      }

      firebaseOnAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        this.notifyListeners({ type: "AUTH_STATE_CHANGED", user });

        if (user) {
          console.log(`👤 Đã đăng nhập Firebase: ${user.email} (${user.uid})`);
          // Kiểm tra và tự động sync nếu đã qua 24h
          this.checkAndAutoSync();
        } else {
          console.log("👤 Đã đăng xuất khỏi Firebase");
        }
      });
    } catch (err) {
      console.warn("⚠️ Không thể khởi tạo auth listener:", err);
    }
  }

  // Đăng ký nhận thông báo thay đổi (auth, sync status)
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error("Lỗi listener:", err);
      }
    });
  }

  isConfigured() {
    return isFirebaseConfigured();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Đăng nhập Google
  async loginWithGoogle() {
    if (!this.isConfigured()) {
      throw new Error("Firebase chưa được cấu hình. Vui lòng nhập Firebase Config trước.");
    }
    const { auth: currentAuth, googleProvider: currentProvider } = initFirebaseApp();
    if (!currentAuth || !currentProvider) {
      throw new Error("Không thể khởi tạo dịch vụ xác thực Firebase.");
    }

    try {
      const result = await signInWithPopup(currentAuth, currentProvider);
      this.currentUser = result.user;
      this.notifyListeners({ type: "AUTH_STATE_CHANGED", user: result.user });
      
      // Đồng bộ ngay sau khi đăng nhập thành công
      await this.sync();
      return result.user;
    } catch (error) {
      console.error("❌ Lỗi đăng nhập Google:", error);
      throw error;
    }
  }

  // Đăng xuất
  async logout() {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      this.currentUser = null;
      this.notifyListeners({ type: "AUTH_STATE_CHANGED", user: null });
    } catch (error) {
      console.error("❌ Lỗi đăng xuất:", error);
      throw error;
    }
  }

  // Quản lý cấu hình Tự động sync 24h
  isAutoSyncEnabled() {
    const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC_ENABLED);
    return val === null ? true : val === "true"; // Mặc định là bật (true)
  }

  setAutoSyncEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC_ENABLED, String(enabled));
    this.notifyListeners({ type: "CONFIG_CHANGED", autoSyncEnabled: enabled });
  }

  getLastSyncTimestamp() {
    const val = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    return val ? parseInt(val, 10) : null;
  }

  getNextSyncTimestamp() {
    const last = this.getLastSyncTimestamp();
    return last ? last + AUTO_SYNC_INTERVAL_MS : Date.now();
  }

  // Kiểm tra điều kiện tự động đồng bộ mỗi 24h
  shouldAutoSync() {
    if (!this.isConfigured() || !this.currentUser || !this.isAutoSyncEnabled()) {
      return false;
    }
    const lastSync = this.getLastSyncTimestamp();
    if (!lastSync) return true; // Chưa sync lần nào
    
    return Date.now() - lastSync >= AUTO_SYNC_INTERVAL_MS;
  }

  async checkAndAutoSync() {
    if (this.shouldAutoSync() && !this.isSyncing) {
      console.log("⏰ Đã đến chu kỳ 24h tự động đồng bộ lên Firebase...");
      try {
        await this.sync();
      } catch (e) {
        console.warn("⚠️ Tự động đồng bộ 24h thất bại:", e);
      }
    }
  }

  // Bắt đầu timer kiểm tra định kỳ (mỗi 15 phút kiểm tra xem đã qua 24h chưa)
  startPeriodicCheck() {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);

    // Kiểm tra ngay khi khởi động
    this.checkAndAutoSync();

    // Check mỗi 15 phút
    this.autoSyncTimer = setInterval(() => {
      this.checkAndAutoSync();
    }, 15 * 60 * 1000);

    // Lắng nghe khi tab trình duyệt focus lại hoặc khi mạng online
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => this.checkAndAutoSync());
      window.addEventListener("online", () => this.checkAndAutoSync());
    }
  }

  // Thuật toán Smart Merge giữa Local và Cloud Data
  mergeData(local, remote) {
    if (!remote) return local;
    if (!local) return remote;

    // 1. Merge Tasks (Dựa vào id, ưu tiên bản ghi có updatedAt mới hơn)
    const taskMap = new Map();
    (local.tasks || []).forEach((t) => taskMap.set(t.id, t));
    (remote.tasks || []).forEach((rTask) => {
      if (!taskMap.has(rTask.id)) {
        taskMap.set(rTask.id, rTask);
      } else {
        const lTask = taskMap.get(rTask.id);
        const lTime = new Date(lTask.updatedAt || lTask.createdAt || 0).getTime();
        const rTime = new Date(rTask.updatedAt || rTask.createdAt || 0).getTime();
        if (rTime > lTime) {
          taskMap.set(rTask.id, { ...lTask, ...rTask });
        }
      }
    });

    // 2. Merge Sessions (Tập hợp không trùng lặp các phiên làm việc theo id)
    const sessionMap = new Map();
    (local.sessions || []).forEach((s) => sessionMap.set(s.id, s));
    (remote.sessions || []).forEach((s) => {
      if (!sessionMap.has(s.id)) {
        sessionMap.set(s.id, s);
      }
    });

    // 3. Merge Daily Targets (Theo date key YYYY-MM-DD)
    const mergedDailyTargets = { ...(local.dailyTargets || {}) };
    Object.entries(remote.dailyTargets || {}).forEach(([dateKey, rTarget]) => {
      if (!mergedDailyTargets[dateKey]) {
        mergedDailyTargets[dateKey] = rTarget;
      } else {
        const lTarget = mergedDailyTargets[dateKey];
        const lTime = new Date(lTarget.updatedAt || lTarget.createdAt || 0).getTime();
        const rTime = new Date(rTarget.updatedAt || rTarget.createdAt || 0).getTime();
        if (rTime > lTime) {
          mergedDailyTargets[dateKey] = rTarget;
        }
      }
    });

    // 4. Merge Weekly Tasks
    const weeklyTaskMap = new Map();
    (local.weeklyTasks || []).forEach((w) => weeklyTaskMap.set(w.id, w));
    (remote.weeklyTasks || []).forEach((w) => {
      if (!weeklyTaskMap.has(w.id)) {
        weeklyTaskMap.set(w.id, w);
      }
    });

    // 5. Merge Settings
    const mergedSettings = {
      ...(local.settings || {}),
      ...(remote.settings || {})
    };

    const merged = {
      tasks: Array.from(taskMap.values()),
      sessions: Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
      ),
      dailyTargets: mergedDailyTargets,
      weeklyTasks: Array.from(weeklyTaskMap.values()),
      settings: mergedSettings,
      metadata: {
        ...(local.metadata || {}),
        lastSaved: new Date().toISOString(),
        lastCloudSync: new Date().toISOString(),
        version: "1.0.0"
      }
    };

    return fileStorageService.sanitizeImportedData(merged);
  }

  // Thực hiện đồng bộ 2 chiều (Bidirectional Sync)
  async sync() {
    if (!this.isConfigured()) {
      throw new Error("Firebase chưa được cấu hình.");
    }
    if (!this.currentUser) {
      throw new Error("Bạn cần đăng nhập để thực hiện đồng bộ Cloud.");
    }
    if (this.isSyncing) {
      console.log("⏳ Quá trình đồng bộ đang chạy, bỏ qua gọi trùng.");
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: "SYNC_START" });

    try {
      const { db: currentDb } = initFirebaseApp();
      const userDocRef = doc(currentDb, "deepwork_users", this.currentUser.uid);

      // 1. Tải dữ liệu từ Cloud Firestore
      console.log("☁️ Đang đọc dữ liệu từ Cloud Firestore...");
      const docSnap = await getDoc(userDocRef);
      const remoteData = docSnap.exists() ? docSnap.data() : null;

      // 2. Lấy dữ liệu local hiện tại
      await fileStorageService.ensureInitialized();
      const localData = fileStorageService.data;

      // 3. Tiến hành Smart Merge
      const mergedData = this.mergeData(localData, remoteData);

      // 4. Cập nhật dữ liệu đã merge vào LocalStorage
      fileStorageService.data = mergedData;
      fileStorageService.saveToLocalStorage();

      // 5. Ghi dữ liệu đã merge lên Firestore
      console.log("☁️ Đang đẩy dữ liệu hợp nhất lên Cloud Firestore...");
      const cloudPayload = {
        ...mergedData,
        lastSyncedAt: new Date().toISOString(),
        userEmail: this.currentUser.email,
        updatedByUid: this.currentUser.uid
      };
      await setDoc(userDocRef, cloudPayload);

      // 6. Cập nhật mốc thời gian sync
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, String(now));

      console.log(`✅ Đồng bộ thành công! ${mergedData.tasks.length} tasks, ${mergedData.sessions.length} sessions.`);

      const result = {
        success: true,
        timestamp: now,
        tasksCount: mergedData.tasks.length,
        sessionsCount: mergedData.sessions.length,
        data: mergedData
      };

      this.notifyListeners({ type: "SYNC_SUCCESS", result });
      return result;
    } catch (error) {
      console.error("❌ Lỗi khi đồng bộ Firebase:", error);
      this.notifyListeners({ type: "SYNC_ERROR", error });
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
}

const firebaseSyncService = new FirebaseSyncService();
export default firebaseSyncService;
