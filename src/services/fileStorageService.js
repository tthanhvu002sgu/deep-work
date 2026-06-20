class FileStorageService {
  constructor() {
    this.fileName = 'deepwork-data.json';
    this.data = this.getInitialData();
    // CHANGED: hỗ trợ cả open/save picker
    this.isFileAPISupported = ('showOpenFilePicker' in window) || ('showSaveFilePicker' in window);

    // NEW: giữ handle file khi user chọn để đồng bộ thủ công
    this.fileHandle = null;

    // Bind the save method to `this` to make it removable
    this.handleBeforeUnload = this.saveData.bind(this);
    
    // Load data from file or localStorage on init
    this.loadInitialData();
    
    // Auto-save every 30 seconds (mặc định: chỉ localStorage)
    this.autoSaveInterval = setInterval(() => {
      this.saveData();
    }, 30000);
    
    // Save before page unload (mặc định: chỉ localStorage)
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Get initial data structure
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

  // THAY ĐỔI CHÍNH: Tải dữ liệu khi khởi động
  async loadInitialData() {
    try {
      // 1. Ưu tiên tải từ localStorage trước
      const localData = this.loadFromLocalStorage();
      if (localData && localData.tasks && localData.tasks.length > 0) {
        console.log('✅ Tải dữ liệu từ Local Storage.');
        this.data = localData;
        return;
      }

      // 2. Nếu localStorage trống, tải từ file deepwork-data.json mặc định
      console.log('📂 Local Storage trống, tải dữ liệu từ file mặc định trong /public.');
      const response = await fetch('/deepwork-data.json');
      if (!response.ok) {
        throw new Error(`Không thể tải file mặc định: ${response.statusText}`);
      }
      const fileData = await response.json();
      this.data = { ...this.getInitialData(), ...fileData };
      
      // Lưu dữ liệu vừa tải vào localStorage để dùng cho các lần sau
      this.saveToLocalStorage();
      console.log('✅ Đã tải và đồng bộ dữ liệu từ file vào localStorage.');

    } catch (error) {
      console.error('❌ Lỗi khi tải dữ liệu ban đầu:', error);
      // Nếu có lỗi, sử dụng dữ liệu trống
      this.data = this.getInitialData();
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
      
      if (tasks.length > 0 || sessions.length > 0 || weeklyTasks.length > 0) {
        return {
          tasks,
          sessions,
          dailyTargets,
          settings: { ...this.getInitialData().settings, ...settings },
          weeklyTasks,
          metadata: { ...this.getInitialData().metadata, ...metadata }
        };
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
      throw error;
    }
  }

  // THAY ĐỔI CHÍNH: Lưu (mặc định) CHỈ vào localStorage
  async saveData() {
    try {
      // Update metadata
      this.data.metadata.lastSaved = new Date().toISOString();
      
      // 1) Luôn lưu localStorage
      this.saveToLocalStorage();

      // KHÔNG tự ghi file ở đây nữa (đồng bộ file sẽ gọi forceSave/saveToFile)
      console.log('💾 Đã lưu vào localStorage (mặc định).');
    } catch (error) {
      console.error('❌ Lỗi khi lưu dữ liệu:', error);
    }
  }

  // NEW: Save to public/deepwork-data.json using a backend endpoint
  async saveToPublicFile() {
    try {
      // Trong môi trường development với React, bạn cần tạo một endpoint API
      // để ghi file vào thư mục public. Đây là một ví dụ với fetch:
      
      const dataToSave = {
        ...this.data,
        metadata: {
          ...this.data.metadata,
          lastSaved: new Date().toISOString()
        }
      };

      // Gọi endpoint backend để lưu file
      const response = await fetch('/api/save-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        throw new Error(`Lỗi khi lưu file: ${response.statusText}`);
      }

      console.log('📝 Đã lưu vào file deepwork-data.json');
    } catch (error) {
      console.error('⚠️ Không thể lưu vào file (có thể chưa có backend API):', error);
      // Không throw error để không gián đoạn việc lưu vào localStorage
    }
  }

  // Tasks operations
  async getTasks(includeArchived = false) {
    if (includeArchived) {
      return this.data.tasks;
    }
    return this.data.tasks.filter(task => !task.isArchived);
  }

  async addTask(taskName, description = null, defaultDuration = 25, color = '#3B82F6') {
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
    await this.saveData(); // Tự động lưu sau khi thêm task
    
    return newTask;
  }

  async deleteTask(taskId) {
    // Remove task and all related sessions
    this.data.tasks = this.data.tasks.filter(task => task.id !== taskId);
    this.data.sessions = this.data.sessions.filter(session => session.taskId !== taskId);
    
    await this.saveData(); // Tự động lưu sau khi xóa task
    return true;
  }

  // NEW: Update task name
  async updateTask(taskId, updates) {
    const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
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

  // NEW: Toggle task archive status
  async toggleTaskArchive(taskId) {
    const taskIndex = this.data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    this.data.tasks[taskIndex].isArchived = !this.data.tasks[taskIndex].isArchived;
    this.data.tasks[taskIndex].updatedAt = new Date().toISOString();

    await this.saveData();
    console.log('📦 Task archive toggled:', this.data.tasks[taskIndex]);
    return this.data.tasks[taskIndex];
  }

  // NEW: Get archived tasks
  async getArchivedTasks() {
    return this.data.tasks.filter(task => task.isArchived);
  }

  // Sessions operations
  async getSessions() {
    return this.data.sessions;
  }

  async addSession(taskId, duration, plannedDuration = null) {
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
    await this.saveData(); // QUAN TRỌNG: Tự động lưu sau khi kết thúc session
    
    console.log('🎉 Đã lưu session mới:', newSession);
    return newSession;
  }

  // Daily targets operations
  async getDailyTarget(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const target = this.data.dailyTargets[targetDate];
    
    return {
      targetMinutes: target?.targetMinutes || 0,
      targetDate: targetDate
    };
  }

  async setDailyTarget(targetMinutes, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    this.data.dailyTargets[targetDate] = {
      targetMinutes: targetMinutes,
      targetDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveData(); // Tự động lưu sau khi đặt mục tiêu
    return this.data.dailyTargets[targetDate];
  }

  // Weekly Tasks operations
  async getWeeklyTasks() {
    return this.data.weeklyTasks || [];
  }

  async addWeeklyTask(dayOfWeek, time, name) {
    if (!this.data.weeklyTasks) {
      this.data.weeklyTasks = [];
    }

    const newTask = {
      id: Date.now(),
      dayOfWeek, // 0 (Sunday) to 6 (Saturday)
      time, // format "HH:MM"
      name,
      createdAt: new Date().toISOString()
    };

    this.data.weeklyTasks.push(newTask);
    await this.saveData();
    console.log('📅 Đã thêm task tuần:', newTask);
    return newTask;
  }

  async deleteWeeklyTask(taskId) {
    if (!this.data.weeklyTasks) return false;
    
    this.data.weeklyTasks = this.data.weeklyTasks.filter(task => task.id !== taskId);
    await this.saveData();
    console.log('🗑️ Đã xóa task tuần:', taskId);
    return true;
  }

  // NEW: Chọn file đích để đồng bộ (File System Access API)
  async selectFile() {
    if (!this.isFileAPISupported) {
      throw new Error('Trình duyệt không hỗ trợ File System Access API');
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: this.fileName,
      types: [
        {
          description: 'JSON File',
          accept: { 'application/json': ['.json'] }
        }
      ]
    });
    this.fileHandle = handle;
    this.fileName = handle.name || this.fileName;

    // Ghi ngay snapshot hiện tại (tùy chọn)
    await this.saveToFile();

    return true;
  }

  // NEW: Ghi ra file đã chọn
  async saveToFile() {
    if (!this.fileHandle) {
      throw new Error('Chưa chọn file để đồng bộ. Hãy bấm "Chọn File".');
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

  // NEW: Đọc dữ liệu từ file đã chọn và nạp vào app (đồng thời ghi vào localStorage)
  async loadFromFile() {
    // CHANGED: nếu chưa có fileHandle thì mở hộp thoại chọn file để đọc
    if (!this.fileHandle) {
      if ('showOpenFilePicker' in window) {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: true,
          types: [
            {
              description: 'JSON File',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
        this.fileHandle = handle;
        this.fileName = handle.name || this.fileName;
      } else {
        throw new Error('Chưa chọn file để tải dữ liệu.');
      }
    }

    const file = await this.fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);

    // Merge an toàn với cấu trúc mặc định
    this.data = { ...this.getInitialData(), ...parsed };
    this.saveToLocalStorage();
    console.log('📥 Đã nạp dữ liệu từ file và đồng bộ vào localStorage.');
    return true;
  }

  // NEW: Fallback upload từ <input type="file">
  async uploadFromInput(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    this.data = { ...this.getInitialData(), ...parsed };
    this.saveToLocalStorage();
    console.log('📥 Đã nạp dữ liệu từ file upload và đồng bộ vào localStorage.');
    return true;
  }

  // Force save (manual sync) - GIỜ sẽ đồng bộ ra file khi user bấm nút
  async forceSave() {
    try {
      // Cập nhật localStorage trước
      await this.saveData();
      // Sau đó ghi ra file nếu đã chọn file
      await this.saveToFile();
      // small delay to ensure FS completion
      await new Promise(r => setTimeout(r, 50));
      return true;
    } catch (e) {
      console.warn('❌ forceSave failed:', e);
      return false;
    }
  }

  // Download data as JSON file (fallback for backup)
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
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }
}

export default new FileStorageService();