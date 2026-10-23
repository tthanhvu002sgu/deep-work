class FileStorageService {
  constructor() {
    this.fileName = 'deepwork-data.json';
    this.data = this.getInitialData();
    this.isFileAPISupported =
      typeof window !== 'undefined' &&
      (('showOpenFilePicker' in window) || ('showSaveFilePicker' in window));

    // Giữ file handle khi user chọn để đồng bộ thủ công
    this.fileHandle = null;

    // Bind save method
    this.handleBeforeUnload = this.saveData.bind(this);

    // Tải dữ liệu ban đầu (lưu promise để các hàm đọc có thể await)
    this.initPromise = this.loadInitialData();

    // Auto-save mỗi 30 giây (mặc định: localStorage)
    if (typeof window !== 'undefined') {
      this.autoSaveInterval = setInterval(() => {
        this.saveData();
      }, 30000);

      // Lưu trước khi đóng/reload trang
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  // Cấu trúc dữ liệu mặc định
  getInitialData() {
    return {
      tasks: [],
      sessions: [],
      dailyTargets: {},
      settings: {
        defaultWorkDuration: 25,
        defaultBreakDuration: 5,
        defaultLongBreakDuration: 15,
        soundEnabled: true,
        notificationEnabled: true,
        autoStartBreaks: false,
        darkMode: false
      },
      weeklyTasks: [],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        lastSaved: new Date().toISOString()
      }
    };
  }

  // Đảm bảo dữ liệu ban đầu đã sẵn sàng trước khi truy vấn
  async ensureInitialized() {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch (err) {
        console.warn('⚠️ Lỗi khi khởi tạo dữ liệu, sử dụng fallback:', err);
      }
    }
    return this.data;
  }

  // Chuẩn hóa và làm sạch dữ liệu nhập từ JSON
  sanitizeImportedData(input) {
    let root = input;
    if (
      root &&
      typeof root === 'object' &&
      root.data &&
      typeof root.data === 'object' &&
      !Array.isArray(root.data)
    ) {
      root = root.data;
    }

    const initial = this.getInitialData();
    let tasks = [];
    let sessions = [];
    let dailyTargets = {};
    let settings = { ...initial.settings };
    let weeklyTasks = [];
    let metadata = { ...initial.metadata };

    if (Array.isArray(root)) {
      if (root.length > 0 && root[0] && root[0].taskId !== undefined) {
        sessions = root;
      } else {
        tasks = root;
      }
    } else if (root && typeof root === 'object') {
      tasks = Array.isArray(root.tasks) ? root.tasks : [];
      sessions = Array.isArray(root.sessions) ? root.sessions : [];
      dailyTargets =
        root.dailyTargets && typeof root.dailyTargets === 'object' && !Array.isArray(root.dailyTargets)
          ? root.dailyTargets
          : {};
      settings =
        root.settings && typeof root.settings === 'object'
          ? { ...settings, ...root.settings }
          : settings;
      weeklyTasks = Array.isArray(root.weeklyTasks) ? root.weeklyTasks : [];
      metadata =
        root.metadata && typeof root.metadata === 'object'
          ? { ...metadata, ...root.metadata }
          : metadata;
    }

    const sanitizedTasks = tasks
      .filter((t) => t && (t.name || t.id))
      .map((t, idx) => ({
        id: Number(t.id) || Date.now() + idx,
        name: String(t.name || `Task ${idx + 1}`).trim(),
        description: t.description || null,
        defaultDuration: Number(t.defaultDuration) || 25,
        color: t.color || '#3B82F6',
        isArchived: Boolean(t.isArchived),
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString()
      }));

    const sanitizedSessions = sessions
      .filter((s) => s && (s.taskId || s.duration))
      .map((s, idx) => ({
        id: Number(s.id) || Date.now() + idx,
        taskId: Number(s.taskId),
        duration: Number(s.duration) || 0,
        plannedDuration: s.plannedDuration ? Number(s.plannedDuration) : null,
        sessionType: s.sessionType || 'work',
        completedAt: s.completedAt || new Date().toISOString(),
        createdAt: s.createdAt || s.completedAt || new Date().toISOString()
      }));

    metadata.lastSaved = new Date().toISOString();
    metadata.lastLoaded = new Date().toISOString();

    return {
      tasks: sanitizedTasks,
      sessions: sanitizedSessions,
      dailyTargets,
      settings,
      weeklyTasks,
      metadata
    };
  }

  // Import từ chuỗi JSON (xử lý BOM UTF-8, cấu trúc linh hoạt)
  importFromJSONString(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Nội dung file rỗng hoặc không hợp lệ.');
    }

    // Loại bỏ BOM \uFEFF nếu có (thường xảy ra khi lưu trên Windows Notepad)
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
      throw new Error('File JSON rỗng.');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      throw new Error(`File không phải JSON hợp lệ: ${parseErr.message}`);
    }

    const sanitized = this.sanitizeImportedData(parsed);
    this.data = sanitized;
    this.saveToLocalStorage();
    console.log(
      `📥 Đã nạp thành công: ${sanitized.tasks.length} tasks, ${sanitized.sessions.length} sessions.`
    );
    return sanitized;
  }

  // Thử tải file dữ liệu mặc định từ các URL tiềm năng (hỗ trợ GitHub Pages subpath)
  async fetchDefaultData() {
    const urlsToTry = [
      `${process.env.PUBLIC_URL || ''}/deepwork-data.json`.replace(/\/\//g, '/'),
      './deepwork-data.json',
      '/deepwork-data.json'
    ];
    const uniqueUrls = [...new Set(urlsToTry.filter(Boolean))];

    for (const url of uniqueUrls) {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          const text = await response.text();
          const cleanText = text.replace(/^\uFEFF/, '').trim();
          // Kiểm tra để tránh trang 404 HTML fallback trả về 200
          if (cleanText.startsWith('{') || cleanText.startsWith('[')) {
            const parsed = JSON.parse(cleanText);
            console.log(`✅ Đã tải file mặc định từ: ${url}`);
            return parsed;
          }
        }
      } catch (err) {
        // Bỏ qua và thử đường dẫn tiếp theo
      }
    }
    return null;
  }

  // Tải dữ liệu khi khởi động
  async loadInitialData() {
    try {
      // 1. Ưu tiên tải từ localStorage trước nếu đã có dữ liệu
      const localData = this.loadFromLocalStorage();
      if (
        localData &&
        ((localData.tasks && localData.tasks.length > 0) ||
          (localData.sessions && localData.sessions.length > 0))
      ) {
        console.log('✅ Tải dữ liệu từ Local Storage.');
        this.data = localData;
        return this.data;
      }

      // 2. Nếu localStorage trống, tải từ file deepwork-data.json mặc định
      console.log('📂 Local Storage trống, tìm tải dữ liệu từ file mặc định trong /public.');
      const fileData = await this.fetchDefaultData();
      if (fileData) {
        this.data = this.sanitizeImportedData(fileData);
        this.saveToLocalStorage();
        console.log('✅ Đã nạp dữ liệu mặc định vào localStorage.');
        return this.data;
      }

      // 3. Nếu không có file mặc định, khởi tạo dữ liệu trống
      console.log('ℹ️ Không có dữ liệu mặc định, khởi tạo dữ liệu mới.');
      this.data = this.getInitialData();
      return this.data;
    } catch (error) {
      console.warn('⚠️ Lỗi khi tải dữ liệu ban đầu:', error);
      this.data = this.getInitialData();
      return this.data;
    }
  }

  // Load from localStorage as fallback
  loadFromLocalStorage() {
    try {
      const tasks = JSON.parse(localStorage.getItem('deepwork_tasks_v3') || '[]');
      const sessions = JSON.parse(localStorage.getItem('deepwork_sessions_v3') || '[]');
      const dailyTargets = JSON.parse(localStorage.getItem('deepwork_daily_targets') || '{}');
      const settings = JSON.parse(localStorage.getItem('deepwork_settings') || '{}');
      const weeklyTasks = JSON.parse(localStorage.getItem('deepwork_weekly_tasks') || '[]');
      const metadata = JSON.parse(localStorage.getItem('deepwork_metadata') || '{}');

      if (
        tasks.length > 0 ||
        sessions.length > 0 ||
        weeklyTasks.length > 0 ||
        Object.keys(dailyTargets).length > 0
      ) {
        return this.sanitizeImportedData({
          tasks,
          sessions,
          dailyTargets,
          settings,
          weeklyTasks,
          metadata
        });
      }
    } catch (error) {
      console.error('❌ Lỗi khi đọc từ Local Storage:', error);
    }
    return null;
  }

  // Save to localStorage
  saveToLocalStorage() {
    try {
      const dataToSave = {
        ...this.data,
        metadata: {
          ...this.data.metadata,
          lastSaved: new Date().toISOString()
        }
      };

      localStorage.setItem('deepwork_tasks_v3', JSON.stringify(dataToSave.tasks));
      localStorage.setItem('deepwork_sessions_v3', JSON.stringify(dataToSave.sessions));
      localStorage.setItem('deepwork_daily_targets', JSON.stringify(dataToSave.dailyTargets));
      localStorage.setItem('deepwork_settings', JSON.stringify(dataToSave.settings));
      localStorage.setItem('deepwork_weekly_tasks', JSON.stringify(dataToSave.weeklyTasks));
      localStorage.setItem('deepwork_metadata', JSON.stringify(dataToSave.metadata));

      console.log('💾 Đã lưu vào localStorage');
    } catch (error) {
      console.error('❌ Lỗi khi lưu vào localStorage:', error);
    }
  }

  // Lưu mặc định vào localStorage
  async saveData() {
    try {
      this.data.metadata.lastSaved = new Date().toISOString();
      this.saveToLocalStorage();
    } catch (error) {
      console.error('❌ Lỗi khi lưu dữ liệu:', error);
    }
  }

  // Lưu file lên backend (cho môi trường dev hỗ trợ API)
  async saveToPublicFile() {
    try {
      const dataToSave = {
        ...this.data,
        metadata: {
          ...this.data.metadata,
          lastSaved: new Date().toISOString()
        }
      };

      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        throw new Error(`Lỗi khi lưu file: ${response.statusText}`);
      }

      console.log('📝 Đã lưu vào file deepwork-data.json trên server');
    } catch (error) {
      console.warn('⚠️ Không thể lưu vào server file:', error);
    }
  }

  // Tasks operations
  async getTasks(includeArchived = false) {
    await this.ensureInitialized();
    if (includeArchived) {
      return this.data.tasks;
    }
    return this.data.tasks.filter((task) => !task.isArchived);
  }

  async addTask(taskName, description = null, defaultDuration = 25, color = '#3B82F6') {
    await this.ensureInitialized();
    const newTask = {
      id: Date.now(),
      name: taskName,
      description,
      defaultDuration,
      color,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.tasks.push(newTask);
    await this.saveData();
    return newTask;
  }

  async deleteTask(taskId) {
    await this.ensureInitialized();
    this.data.tasks = this.data.tasks.filter((task) => task.id !== taskId);
    this.data.sessions = this.data.sessions.filter((session) => session.taskId !== taskId);
    await this.saveData();
    return true;
  }

  async updateTask(taskId, updates) {
    await this.ensureInitialized();
    const taskIndex = this.data.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    this.data.tasks[taskIndex] = {
      ...this.data.tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveData();
    console.log('✏️ Task updated:', this.data.tasks[taskIndex]);
    return this.data.tasks[taskIndex];
  }

  async toggleTaskArchive(taskId) {
    await this.ensureInitialized();
    const taskIndex = this.data.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    this.data.tasks[taskIndex].isArchived = !this.data.tasks[taskIndex].isArchived;
    this.data.tasks[taskIndex].updatedAt = new Date().toISOString();

    await this.saveData();
    console.log('📦 Task archive toggled:', this.data.tasks[taskIndex]);
    return this.data.tasks[taskIndex];
  }

  async getArchivedTasks() {
    await this.ensureInitialized();
    return this.data.tasks.filter((task) => task.isArchived);
  }

  // Sessions operations
  async getSessions() {
    await this.ensureInitialized();
    return this.data.sessions;
  }

  async addSession(taskId, duration, plannedDuration = null) {
    await this.ensureInitialized();
    const newSession = {
      id: Date.now(),
      taskId: taskId,
      duration: duration,
      plannedDuration: plannedDuration,
      sessionType: 'work',
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.data.sessions.push(newSession);
    await this.saveData();
    console.log('🎉 Đã lưu session mới:', newSession);
    return newSession;
  }

  async deleteSession(sessionId) {
    await this.ensureInitialized();
    this.data.sessions = this.data.sessions.filter((session) => session.id !== sessionId);
    await this.saveData();
    console.log('🗑️ Đã xóa session:', sessionId);
    return true;
  }

  // Daily targets operations
  async getDailyTarget(date = null) {
    await this.ensureInitialized();
    const targetDate = date || new Date().toISOString().split('T')[0];
    const target = this.data.dailyTargets[targetDate];
    const targetMinutes =
      typeof target === 'object' && target !== null
        ? Number(target.targetMinutes) || 0
        : Number(target) || 0;

    return {
      targetMinutes,
      targetDate
    };
  }

  async getDailyTargets() {
    await this.ensureInitialized();
    return this.data.dailyTargets || {};
  }

  async setDailyTarget(targetMinutes, date = null) {
    await this.ensureInitialized();
    const targetDate = date || new Date().toISOString().split('T')[0];

    this.data.dailyTargets[targetDate] = {
      targetMinutes: Number(targetMinutes) || 0,
      targetDate,
      createdAt: this.data.dailyTargets[targetDate]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveData();
    return this.data.dailyTargets[targetDate];
  }

  // Weekly Tasks operations
  async getWeeklyTasks() {
    await this.ensureInitialized();
    return this.data.weeklyTasks || [];
  }

  async addWeeklyTask(dayOfWeek, time, name) {
    await this.ensureInitialized();
    if (!this.data.weeklyTasks) {
      this.data.weeklyTasks = [];
    }

    const newTask = {
      id: Date.now(),
      dayOfWeek,
      time,
      name,
      createdAt: new Date().toISOString()
    };

    this.data.weeklyTasks.push(newTask);
    await this.saveData();
    console.log('📅 Đã thêm task tuần:', newTask);
    return newTask;
  }

  async deleteWeeklyTask(taskId) {
    await this.ensureInitialized();
    if (!this.data.weeklyTasks) return false;

    this.data.weeklyTasks = this.data.weeklyTasks.filter((task) => task.id !== taskId);
    await this.saveData();
    console.log('🗑️ Đã xóa task tuần:', taskId);
    return true;
  }

  // Chọn file đích để đồng bộ (File System Access API)
  async selectFile() {
    if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) {
      throw new Error('Trình duyệt không hỗ trợ File System Access API');
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: this.fileName,
      types: [
        {
          description: 'JSON Files (*.json)',
          accept: {
            'application/json': ['.json'],
            'text/plain': ['.json']
          }
        }
      ]
    });
    this.fileHandle = handle;
    this.fileName = handle.name || this.fileName;

    // Ghi snapshot hiện tại ra file đã chọn
    await this.saveToFile();
    return true;
  }

  // Ghi ra file đã chọn
  async saveToFile() {
    if (!this.fileHandle) {
      throw new Error('Chưa chọn file để đồng bộ. Hãy bấm "Chọn File để Lưu".');
    }
    const dataToSave = {
      ...this.data,
      metadata: {
        ...this.data.metadata,
        lastSaved: new Date().toISOString()
      }
    };
    const writable = await this.fileHandle.createWritable();
    await writable.write(JSON.stringify(dataToSave, null, 2));
    await writable.close();
    console.log('📝 Đã đồng bộ dữ liệu ra file:', this.fileName);
  }

  // Đọc dữ liệu từ file qua File System Access API
  async loadFromFile() {
    if (typeof window === 'undefined' || !('showOpenFilePicker' in window)) {
      throw new Error(
        'Trình duyệt không hỗ trợ mở file trực tiếp. Vui lòng dùng mục "Xuất/Nhập Thủ công" bên dưới.'
      );
    }

    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [
        {
          description: 'JSON Files (*.json)',
          accept: {
            'application/json': ['.json'],
            'text/plain': ['.json']
          }
        }
      ]
    });

    this.fileHandle = handle;
    this.fileName = handle.name || this.fileName;

    const file = await this.fileHandle.getFile();
    const text = await file.text();
    return this.importFromJSONString(text);
  }

  // Fallback upload từ <input type="file">
  async uploadFromInput(file) {
    if (!file) {
      throw new Error('Không có file nào được chọn.');
    }
    const text = await file.text();
    return this.importFromJSONString(text);
  }

  // Force save (đồng bộ ra file nếu có và lưu localStorage)
  async forceSave() {
    try {
      await this.saveData();
      if (this.fileHandle) {
        await this.saveToFile();
      }
      await new Promise((r) => setTimeout(r, 50));
      return true;
    } catch (e) {
      console.warn('❌ forceSave failed:', e);
      return false;
    }
  }

  // Tải file backup JSON về máy
  downloadAsFile() {
    try {
      const dataToSave = {
        ...this.data,
        metadata: {
          ...this.data.metadata,
          exportedAt: new Date().toISOString()
        }
      };

      const dataStr = JSON.stringify(dataToSave, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `deepwork-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      console.log('📥 File backup đã được tải xuống');
    } catch (error) {
      console.error('❌ Lỗi khi tải xuống file:', error);
      throw error;
    }
  }

  // Check if File API is supported
  isFileAPIAvailable() {
    return this.isFileAPISupported;
  }

  // Get current file status
  getFileStatus() {
    return {
      isFileAPISupported: this.isFileAPISupported,
      hasFileHandle: !!this.fileHandle,
      fileName: this.fileHandle?.name || this.fileName,
      lastSaved: this.data.metadata?.lastSaved
    };
  }

  // Cleanup
  cleanup() {
    console.log('🧹 Dọn dẹp các tài nguyên của FileStorageService.');
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
}

const fileStorageService = new FileStorageService();
export default fileStorageService;
