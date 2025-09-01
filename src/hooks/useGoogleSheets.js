// src/hooks/useGoogleSheets.js
import { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';

export const useGoogleSheets = () => {
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading data from Google Sheets...');
      const [tasksData, sessionsData] = await Promise.all([
        googleSheetsService.getTasks(),
        googleSheetsService.getSessions(),
      ]);
      
      console.log('Loaded tasks:', tasksData);
      console.log('Loaded sessions:', sessionsData);
      
      setTasks(tasksData);
      setSessions(sessionsData);

      // Save to localStorage as backup
      localStorage.setItem("deepwork_tasks_v3", JSON.stringify(tasksData));
      localStorage.setItem("deepwork_sessions_v3", JSON.stringify(sessionsData));
      
    } catch (err) {
      console.error('Error loading from Google Sheets:', err);
      setError('Không thể tải dữ liệu từ Google Sheets. Sử dụng dữ liệu local.');
      
      // Fallback to localStorage if Google Sheets fails
      try {
        const savedTasks = localStorage.getItem("deepwork_tasks_v3");
        const savedSessions = localStorage.getItem("deepwork_sessions_v3");
        
        setTasks(savedTasks ? JSON.parse(savedTasks) : []);
        setSessions(savedSessions ? JSON.parse(savedSessions) : []);
      } catch (localError) {
        console.error('Error loading from localStorage:', localError);
        setTasks([]);
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Add task
  const addTask = useCallback(async (taskName) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Adding task:', taskName);
      const newTask = await googleSheetsService.addTask(taskName);
      
      setTasks(prev => {
        const updated = [...prev, newTask];
        localStorage.setItem("deepwork_tasks_v3", JSON.stringify(updated));
        return updated;
      });
      
      return newTask;
    } catch (err) {
      console.error('Error adding task:', err);
      
      // Fallback: add to localStorage only
      const newTask = {
        id: Date.now(),
        name: taskName,
        createdAt: new Date().toISOString(),
      };
      
      setTasks(prev => {
        const updated = [...prev, newTask];
        localStorage.setItem("deepwork_tasks_v3", JSON.stringify(updated));
        return updated;
      });
      
      setError('Task được lưu local. Sẽ đồng bộ khi kết nối tốt.');
      return newTask;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId) => {
    setLoading(true);
    setError(null);
    
    try {
      await googleSheetsService.deleteTask(taskId);
      await googleSheetsService.deleteSessionsByTaskId(taskId);
      
      setTasks(prev => {
        const updated = prev.filter(task => task.id !== taskId);
        localStorage.setItem("deepwork_tasks_v3", JSON.stringify(updated));
        return updated;
      });
      
      setSessions(prev => {
        const updated = prev.filter(session => session.taskId !== taskId);
        localStorage.setItem("deepwork_sessions_v3", JSON.stringify(updated));
        return updated;
      });
      
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      
      // Fallback: delete from localStorage only
      setTasks(prev => {
        const updated = prev.filter(task => task.id !== taskId);
        localStorage.setItem("deepwork_tasks_v3", JSON.stringify(updated));
        return updated;
      });
      
      setSessions(prev => {
        const updated = prev.filter(session => session.taskId !== taskId);
        localStorage.setItem("deepwork_sessions_v3", JSON.stringify(updated));
        return updated;
      });
      
      setError('Task được xóa local. Sẽ đồng bộ khi kết nối tốt.');
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add session
  const addSession = useCallback(async (taskId, duration) => {
    setLoading(true);
    setError(null);
    
    try {
      const newSession = await googleSheetsService.addSession(taskId, duration);
      
      setSessions(prev => {
        const updated = [...prev, newSession];
        localStorage.setItem("deepwork_sessions_v3", JSON.stringify(updated));
        return updated;
      });
      
      return newSession;
    } catch (err) {
      console.error('Error adding session:', err);
      
      // Fallback: add to localStorage only
      const newSession = {
        id: Date.now(),
        taskId: taskId,
        duration: duration,
        completedAt: new Date().toISOString(),
      };
      
      setSessions(prev => {
        const updated = [...prev, newSession];
        localStorage.setItem("deepwork_sessions_v3", JSON.stringify(updated));
        return updated;
      });
      
      setError('Session được lưu local. Sẽ đồng bộ khi kết nối tốt.');
      return newSession;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    tasks,
    sessions,
    loading,
    error,
    addTask,
    deleteTask,
    addSession,
    refreshData: loadData,
  };
};