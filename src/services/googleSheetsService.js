// src/services/googleSheetsService.js
import googleAuthService from './googleAuthService';

class GoogleSheetsService {
  constructor() {
    this.SHEET_ID = process.env.REACT_APP_GOOGLE_SHEET_ID;
    this.BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  // Helper method to make authenticated API requests
  async makeRequest(url, options = {}) {
    try {
      // Get valid access token
      const accessToken = await googleAuthService.getValidAccessToken();
      
      console.log('Making authenticated request to:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        
        // If unauthorized, clear tokens and throw specific error
        if (response.status === 401) {
          googleAuthService.clearTokens();
          throw new Error('Authentication expired. Please sign in again.');
        }
        
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Google Sheets API Error:', error);
      throw error;
    }
  }

  // Get all tasks from Google Sheets
  async getTasks() {
    const range = 'Tasks!A:C';
    const url = `${this.BASE_URL}/${this.SHEET_ID}/values/${range}`;
    
    try {
      const response = await this.makeRequest(url);
      const rows = response.values || [];
      
      return rows.slice(1).map(row => ({
        id: parseInt(row[0]) || Date.now(),
        name: row[1] || '',
        createdAt: row[2] || new Date().toISOString(),
      })).filter(task => task.name);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  // Add new task to Google Sheets
  async addTask(taskName) {
    const newTask = {
      id: Date.now(),
      name: taskName,
      createdAt: new Date().toISOString(),
    };

    const range = 'Tasks!A:C';
    const values = [[newTask.id, newTask.name, newTask.createdAt]];
    const url = `${this.BASE_URL}/${this.SHEET_ID}/values/${range}:append?valueInputOption=RAW`;
    
    try {
      await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ values }),
      });
      
      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  // Get all sessions from Google Sheets
  async getSessions() {
    const range = 'Sessions!A:D';
    const url = `${this.BASE_URL}/${this.SHEET_ID}/values/${range}`;
    
    try {
      const response = await this.makeRequest(url);
      const rows = response.values || [];
      
      return rows.slice(1).map(row => ({
        id: parseInt(row[0]) || Date.now(),
        taskId: parseInt(row[1]) || 0,
        duration: parseInt(row[2]) || 0,
        completedAt: row[3] || new Date().toISOString(),
      })).filter(session => session.taskId);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  // Add new session to Google Sheets
  async addSession(taskId, duration) {
    const newSession = {
      id: Date.now(),
      taskId: taskId,
      duration: duration,
      completedAt: new Date().toISOString(),
    };

    const range = 'Sessions!A:D';
    const values = [[newSession.id, newSession.taskId, newSession.duration, newSession.completedAt]];
    const url = `${this.BASE_URL}/${this.SHEET_ID}/values/${range}:append?valueInputOption=RAW`;
    
    try {
      await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({ values }),
      });
      
      return newSession;
    } catch (error) {
      console.error('Error adding session:', error);
      throw error;
    }
  }

  // Delete task by clearing row
  async deleteTask(taskId) {
    try {
      const tasks = await this.getTasks();
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const rowNumber = taskIndex + 2;
      const range = `Tasks!A${rowNumber}:C${rowNumber}`;
      const url = `${this.BASE_URL}/${this.SHEET_ID}/values/${range}?valueInputOption=RAW`;
      
      await this.makeRequest(url, {
        method: 'PUT',
        body: JSON.stringify({
          values: [['', '', '']],
        }),
      });

      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Delete sessions by task ID
  async deleteSessionsByTaskId(taskId) {
    try {
      const sessions = await this.getSessions();
      const sessionsToDelete = sessions.filter(session => session.taskId === taskId);

      for (const session of sessionsToDelete) {
        const sessionIndex = sessions.findIndex(s => s.id === session.id);
        if (sessionIndex !== -1) {
          const rowNumber = sessionIndex + 2;
          const range = `Sessions!A${rowNumber}:D${rowNumber}`;
          const url = `${this.BASE_URL}/${this.SHEET_ID}/values/${range}?valueInputOption=RAW`;
          
          await this.makeRequest(url, {
            method: 'PUT',
            body: JSON.stringify({
              values: [['', '', '', '']],
            }),
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting sessions by task ID:', error);
      throw error;
    }
  }
}

export default new GoogleSheetsService();