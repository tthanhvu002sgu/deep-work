class FileStorageService {
  constructor() {
    this.fileName = 'deepwork-data.json';
    this.data = this.getInitialData();
    this.fileHandle = null;
    this.isFileAPISupported = 'showSaveFilePicker' in window;
    
    // Load data from file or localStorage on init
    this.loadData();
    
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveData();
    }, 30000);
    
    // Save before page unload
    window.addEventListener('beforeunload', () => {
      this.saveData();
    });
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
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        lastSaved: new Date().toISOString()
      }
    };
  }

  // Load data from file or localStorage
  async loadData() {
    try {
      // First try to load from localStorage (fallback)
      const localData = this.loadFromLocalStorage();
      if (localData) {
        this.data = { ...this.getInitialData(), ...localData };
      }

      // If File API is supported, try to load from file
      if (this.isFileAPISupported) {
        const savedFileHandle = localStorage.getItem('deepwork_file_handle');
        if (savedFileHandle) {
          try {
            // Note: File handles can't be serialized, so we'll ask user to select file again
            console.log('File API supported but need user to select file again');
          } catch (error) {
            console.warn('Could not restore file handle:', error);
          }
        }
      }
      
      console.log('Data loaded successfully:', this.data);
    } catch (error) {
      console.error('Error loading data:', error);
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
      
      if (tasks.length > 0 || sessions.length > 0) {
        return {
          tasks,
          sessions,
          dailyTargets,
          settings: { ...this.getInitialData().settings, ...settings }
        };
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return null;
  }

  // Save data to file and localStorage
  async saveData() {
    try {
      // Always save to localStorage as backup
      this.saveToLocalStorage();
      
      // Try to save to file if supported
      if (this.isFileAPISupported && this.fileHandle) {
        await this.saveToFile();
      }
      
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
      // At least localStorage should work
      this.saveToLocalStorage();
    }
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
      localStorage.setItem('deepwork_metadata', JSON.stringify(dataToSave.metadata));
      
      console.log('Saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  }

  // Save to file using File System Access API
  async saveToFile() {
    try {
      if (!this.fileHandle) {
        await this.selectFile();
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
      
      console.log('Saved to file successfully');
    } catch (error) {
      console.error('Error saving to file:', error);
      // Don't throw error, fallback to localStorage
    }
  }

  // Let user select file to save/load
  async selectFile() {
    try {
      if (!this.isFileAPISupported) {
        throw new Error('File System Access API not supported');
      }

      this.fileHandle = await window.showSaveFilePicker({
        suggestedName: this.fileName,
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      return this.fileHandle;
    } catch (error) {
      console.error('Error selecting file:', error);
      throw error;
    }
  }

  // Load from selected file
  async loadFromFile() {
    try {
      if (!this.isFileAPISupported) {
        throw new Error('File System Access API not supported');
      }

      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON files',
          accept: { 'application/json': ['.json'] }
        }]
      });

      const file = await fileHandle.getFile();
      const content = await file.text();
      const importedData = JSON.parse(content);

      // Validate data structure
      if (!importedData.tasks || !Array.isArray(importedData.tasks)) {
        throw new Error('Invalid data format: tasks must be an array');
      }

      if (!importedData.sessions || !Array.isArray(importedData.sessions)) {
        throw new Error('Invalid data format: sessions must be an array');
      }

      // Merge with current data
      this.data = {
        ...this.getInitialData(),
        ...importedData,
        metadata: {
          ...importedData.metadata,
          lastLoaded: new Date().toISOString()
        }
      };

      // Save the file handle for future saves
      this.fileHandle = fileHandle;
      
      // Update localStorage backup
      this.saveToLocalStorage();
      
      console.log('Data loaded from file successfully');
      return this.data;
    } catch (error) {
      console.error('Error loading from file:', error);
      throw error;
    }
  }

  // Download data as JSON file (fallback for unsupported browsers)
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
      link.download = `deepwork-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      console.log('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // Upload file input (fallback for unsupported browsers)
  async uploadFromInput(file) {
    try {
      const content = await file.text();
      const importedData = JSON.parse(content);

      // Validate data structure
      if (!importedData.tasks || !Array.isArray(importedData.tasks)) {
        throw new Error('Invalid data format: tasks must be an array');
      }

      // Merge with current data
      this.data = {
        ...this.getInitialData(),
        ...importedData,
        metadata: {
          ...importedData.metadata,
          lastLoaded: new Date().toISOString()
        }
      };

      // Update localStorage backup
      this.saveToLocalStorage();
      
      console.log('Data uploaded successfully');
      return this.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Tasks operations
  async getTasks() {
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
    this.saveData();
    
    return newTask;
  }

  async deleteTask(taskId) {
    // Remove task and all related sessions
    this.data.tasks = this.data.tasks.filter(task => task.id !== taskId);
    this.data.sessions = this.data.sessions.filter(session => session.taskId !== taskId);
    
    this.saveData();
    return true;
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
    this.saveData();
    
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
      targetMinutes,
      targetDate,
      createdAt: this.data.dailyTargets[targetDate]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveData();
    return this.data.dailyTargets[targetDate];
  }

  // Force save (manual save)
  async forceSave() {
    try {
      if (typeof this.saveToLocalStorage === 'function') {
        this.saveToLocalStorage();
      }
      if (this.isFileAPISupported && this.fileHandle && typeof this.saveToFile === 'function') {
        await this.saveToFile();
      }
      // small delay to ensure FS completion
      await new Promise(r => setTimeout(r, 50));
      return true;
    } catch (e) {
      console.warn('forceSave failed:', e);
      return false;
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
      fileName: this.fileHandle?.name || 'Chưa chọn file',
      lastSaved: this.data.metadata?.lastSaved
    };
  }

  // Cleanup
  cleanup() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }
}

export default new FileStorageService();