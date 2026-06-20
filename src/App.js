// src/App.jsx

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Header from "./components/Header";
import TaskList from "./components/TaskList";
import FocusView from "./components/FocusView";
import HistoryView from "./components/HistoryView";
import {
  TaskModal,
  SessionEndModal,
  ConfirmStopModal,
  ConfirmDeleteModal,
  DailyTargetModal,
  LoadingModal,
  ErrorModal,
  EditTaskModal,
  ConfirmArchiveModal,
  ArchivedTasksModal,
  DailySummaryModal,
  ManualSessionModal,
  SettingsModal,
  WeeklyScheduleModal, // NEW
  AddWeeklyTaskModal,  // NEW
} from "./components/Modals";
import { FileManagerModal } from "./components/FileManagerModal";
import fileStorageService from "./services/fileStorageService";
import BreakScreen from "./components/BreakScreen";

const App = () => {
  // State management
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [weeklyTasks, setWeeklyTasks] = useState([]); // NEW: Weekly schedule tasks
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyTarget, setDailyTarget] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [modal, setModal] = useState(null);
  const [taskToStart, setTaskToStart] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // NEW: States for edit and archive
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToArchive, setTaskToArchive] = useState(null);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);

  const [filter, setFilter] = useState("day");
  const [activeBreak, setActiveBreak] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentDateKey, setCurrentDateKey] = useState(
    new Date().toDateString()
  );
  
  // NEW: State for weekly task addition
  const [weeklyDayToAdd, setWeeklyDayToAdd] = useState(0);
  const [upcomingWeeklyTasks, setUpcomingWeeklyTasks] = useState([]);

  // NEW: Daily summary state
  const [dailySummaryDate, setDailySummaryDate] = useState(null);

  // NEW: Preset settings (persisted to localStorage)
  const [presetSettings, setPresetSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('deepwork_preset_settings');
      return saved ? JSON.parse(saved) : { sessionPresets: [25, 50, 90], targetPresets: [30, 60, 90, 120, 180] };
    } catch {
      return { sessionPresets: [25, 50, 90], targetPresets: [30, 60, 90, 120, 180] };
    }
  });

  const handleSaveSettings = useCallback((newSettings) => {
    setPresetSettings(newSettings);
    try {
      localStorage.setItem('deepwork_preset_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Could not save settings to localStorage:', e);
    }
  }, []);

  // FIX: Add effect to detect when a new day starts
  useEffect(() => {
    const dayCheckInterval = setInterval(() => {
      const newDateKey = new Date().toDateString();
      if (newDateKey !== currentDateKey) {
        console.log("🎉 New day detected! Refreshing daily stats...");
        setCurrentDateKey(newDateKey);
      }
    }, 30 * 1000); // Check every 30 seconds

    return () => clearInterval(dayCheckInterval);
  }, [currentDateKey]);

  // Load initial data - SIMPLIFIED (removed startTime logic)
  useEffect(() => {
    const loadApp = async () => {
      setLoading(true);
      try {
        const [tasksData, sessionsData, targetData, archivedData, weeklyData] = await Promise.all([
          fileStorageService.getTasks(),
          fileStorageService.getSessions(),
          fileStorageService.getDailyTarget(),
          fileStorageService.getArchivedTasks(),
          fileStorageService.getWeeklyTasks(), // NEW
        ]);

        setTasks(tasksData);
        setSessions(sessionsData);
        setDailyTarget(targetData.targetMinutes * 60);
        setArchivedTasks(archivedData);
        setWeeklyTasks(weeklyData); // NEW

        console.log('Initial data loaded:', {
          tasks: tasksData.length,
          sessions: sessionsData.length,
          target: targetData.targetMinutes,
          archived: archivedData.length,
          weeklyTasks: weeklyData.length, // NEW
        });
      } catch (error) {
        console.error("Error loading initial data:", error);
        setError("Không thể tải dữ liệu: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadApp();

    return () => {
      fileStorageService.cleanup();
    };
  }, []);

  // Auto-refresh data when file changes (for manual sync)
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (isTransitioning || activeSession) return;

      try {
        const [tasksData, sessionsData] = await Promise.all([
          fileStorageService.getTasks(),
          fileStorageService.getSessions(),
        ]);

        const tasksChanged =
          JSON.stringify(tasksData) !== JSON.stringify(tasks);
        const sessionsChanged =
          JSON.stringify(sessionsData) !== JSON.stringify(sessions);

        if (tasksChanged || sessionsChanged) {
          console.log("Auto-refresh: External data changed");
          if (tasksChanged) setTasks(tasksData);
          if (sessionsChanged) setSessions(sessionsData);
        }
      } catch (error) {
        console.warn("Error auto-refreshing data:", error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(refreshInterval);
  }, [tasks, sessions, isTransitioning, activeSession]);

  // Helper function to get start of week (Monday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Memoized filtered sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = getStartOfWeek(now);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.completedAt);
      switch (filter) {
        case "week":
          return sessionDate >= startOfThisWeek;
        case "month":
          return (
            sessionDate.getMonth() === now.getMonth() &&
            sessionDate.getFullYear() === now.getFullYear()
          );
        case "day":
        default:
          return sessionDate.toDateString() === today.toDateString();
      }
    });

    console.log("Filtered sessions:", {
      filter,
      totalSessions: sessions.length,
      filteredCount: filtered.length,
      latestSession: sessions[sessions.length - 1]?.completedAt,
    });

    return filtered;
  }, [sessions, filter, currentDateKey]);

  // Memoized today focus time
  const todayFocusTime = useMemo(() => {
    const today = new Date();

    const todaySessions = sessions.filter((session) => {
      const sessionDate = new Date(session.completedAt);
      return sessionDate.toDateString() === today.toDateString();
    });

    const totalTime = todaySessions.reduce(
      (acc, session) => acc + session.duration,
      0
    );

    console.log("Today focus time:", {
      todaySessionsCount: todaySessions.length,
      totalTime: totalTime,
    });

    return totalTime;
  }, [sessions, currentDateKey]);

  // Task management functions
  const addTask = useCallback(async (taskName) => {
    setLoading(true);
    setError(null);

    try {
      const newTask = await fileStorageService.addTask(taskName);
      setTasks((prev) => [...prev, newTask]);

      console.log("Task added:", newTask);
      return newTask;
    } catch (error) {
      console.error("Error adding task:", error);
      setError("Không thể thêm task mới: " + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    setLoading(true);
    setError(null);

    try {
      await fileStorageService.deleteTask(taskId);

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setSessions((prev) =>
        prev.filter((session) => session.taskId !== taskId)
      );

      console.log("Task deleted:", taskId);
      return true;
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Không thể xóa task: " + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Session handling
  const addSession = useCallback(async (taskId, duration) => {
    console.log("🔄 Bắt đầu lưu phiên:", { taskId, duration });

    try {
      const newSession = await fileStorageService.addSession(taskId, duration);
      console.log("💾 Phiên làm việc đã lưu:", newSession);

      setSessions((prevSessions) => {
        if (prevSessions.some((s) => s.id === newSession.id)) {
          return prevSessions;
        }
        return [...prevSessions, newSession];
      });

      if (typeof fileStorageService.forceSave === "function") {
        await fileStorageService.forceSave();
        console.log("✅ Đã lưu dữ liệu vào storage");
      }

      return newSession;
    } catch (error) {
      console.error("❌ Lỗi khi lưu phiên làm việc:", error);
      setError("Không thể lưu phiên làm việc: " + error.message);
      throw error;
    }
  }, []);

  const handleAddSession = useCallback(
    async (timeWorked) => {
      if (!activeSession) {
        console.warn("⚠️ Không có phiên làm việc đang hoạt động");
        return;
      }

      console.log("🏁 Kết thúc phiên làm việc:", {
        taskId: activeSession.task.id,
        timeWorked: timeWorked,
        taskName: activeSession.task.name,
      });

      try {
        setIsTransitioning(true);

        await addSession(activeSession.task.id, timeWorked);

        await new Promise((resolve) => setTimeout(resolve, 50));

        setActiveSession(null);
        setActiveBreak(true);
        setModal(null);

        setTimeout(() => {
          setSessions((prevSessions) => [...prevSessions]);
          console.log("🔄 Đã force re-render sau khi về màn hình chính");
        }, 100);

        console.log("✅ Hoàn tất quá trình kết thúc phiên làm việc");
      } catch (error) {
        console.error("❌ Lỗi khi kết thúc phiên làm việc:", error);
        setModal("error");
      } finally {
        setTimeout(() => setIsTransitioning(false), 150);
      }
    },
    [activeSession, addSession]
  );

  const handleStopSession = useCallback(() => {
    console.log("⏹️ Dừng phiên làm việc mà không lưu");
    setActiveSession(null);
    setModal(null);
  }, []);

  const handleDeleteTask = useCallback((task) => {
    setTaskToDelete(task);
    setModal("confirmDelete");
  }, []);

  // NEW: Add missing handleCancelDelete
  const handleCancelDelete = useCallback(() => {
    setModal(null);
    setTaskToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete.id);
      setModal(null);
      setTaskToDelete(null);
    } catch (error) {
      setModal("error");
    }
  }, [taskToDelete, deleteTask]);

  const handleSetDailyTarget = useCallback(async (targetMinutes) => {
    setLoading(true);
    try {
      await fileStorageService.setDailyTarget(targetMinutes);
      setDailyTarget(targetMinutes * 60);
      setModal(null);

      console.log("🎯 Daily target set:", targetMinutes);
    } catch (error) {
      console.error("Error setting daily target:", error);
      setError("Không thể lưu mục tiêu hàng ngày: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleErrorClose = useCallback(() => {
    setModal(null);
    setError(null);
  }, []);

  const handleRetry = useCallback(async () => {
    setError(null);
    setModal(null);

    try {
      setLoading(true);
      const [tasksData, sessionsData] = await Promise.all([
        fileStorageService.getTasks(),
        fileStorageService.getSessions(),
      ]);

      setTasks(tasksData);
      setSessions(sessionsData);

      console.log("🔄 Data reloaded after retry");
    } catch (error) {
      console.error("Retry failed:", error);
      setError("Vẫn không thể tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileManagerSuccess = useCallback(async () => {
    try {
      const [tasksData, sessionsData] = await Promise.all([
        fileStorageService.getTasks(),
        fileStorageService.getSessions(),
      ]);

      setTasks(tasksData);
      setSessions(sessionsData);

      console.log("📁 Data reloaded after file operation");
    } catch (error) {
      console.error("Error reloading after file operation:", error);
    }
  }, []);

  // SIMPLIFIED: handleStartSession (removed hasStartedFirstSession logic)
  const handleStartSession = useCallback((task, duration) => {
    const session = {
      task: task,
      duration: duration === 0 ? 0 : duration * 60,
    };
    setActiveSession(session);
    setModal(null);

    console.log("Starting session:", session);
  }, []);

  const handleAddTask = useCallback(
    async (taskName) => {
      try {
        await addTask(taskName);
        setModal(null);
      } catch (error) {
        setModal("error");
      }
    },
    [addTask]
  );

  // NEW: Check for daily summary popup
  useEffect(() => {
    const checkDailySummary = () => {
      const now = new Date();
      const lastShownKey = 'deepwork_last_summary_shown';
      const lastShown = localStorage.getItem(lastShownKey);
      const todayKey = now.toISOString().split('T')[0];

      // Check if it's 11 PM or later (23:00)
      const isAfter11PM = now.getHours() >= 23;

      // Or if it's a new day and we haven't shown summary for yesterday
      const isNewDay = lastShown !== todayKey;

      if ((isAfter11PM || isNewDay) && lastShown !== todayKey) {
        // Get yesterday's date if it's a new day, or today if it's 11 PM
        const summaryDate = isNewDay && now.getHours() < 23
          ? new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday
          : now; // Today

        const summaryDateKey = summaryDate.toISOString().split('T')[0];

        // Check if there are any sessions for that day
        const daySessions = sessions.filter(s => {
          const sessionDate = new Date(s.completedAt).toISOString().split('T')[0];
          return sessionDate === summaryDateKey;
        });

        // Show summary even if no sessions (to encourage user)
        setDailySummaryDate(summaryDateKey);
        setModal('dailySummary');
        localStorage.setItem(lastShownKey, todayKey);
      }
    };

    // Check immediately on mount
    checkDailySummary();

    // Check every 10 minutes
    const interval = setInterval(checkDailySummary, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sessions]);

  const handleCloseDailySummary = useCallback(() => {
    setModal(null);
    setDailySummaryDate(null);
  }, []);

  // NEW: Handle edit task
  const handleEditTask = useCallback((task) => {
    setTaskToEdit(task);
    setModal("editTask");
  }, []);

  const handleSaveTaskEdit = useCallback(async (taskId, updates) => {
    try {
      const updatedTask = await fileStorageService.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      setModal(null);
      setTaskToEdit(null);
      console.log("✅ Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      setError("Không thể cập nhật task: " + error.message);
      setModal("error");
    }
  }, []);

  // NEW: Handle archive task
  const handleArchiveTask = useCallback((task) => {
    setTaskToArchive(task);
    setModal("confirmArchive");
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    if (!taskToArchive) return;

    try {
      const updatedTask = await fileStorageService.toggleTaskArchive(taskToArchive.id);

      if (updatedTask.isArchived) {
        // Move to archived
        setTasks(prev => prev.filter(t => t.id !== taskToArchive.id));
        setArchivedTasks(prev => [...prev, updatedTask]);
      } else {
        // Restore from archived
        setArchivedTasks(prev => prev.filter(t => t.id !== taskToArchive.id));
        setTasks(prev => [...prev, updatedTask]);
      }

      setModal(null);
      setTaskToArchive(null);
      console.log("✅ Task archive status toggled");
    } catch (error) {
      console.error("Error archiving task:", error);
      setError("Không thể ẩn/hiện task: " + error.message);
      setModal("error");
    }
  }, [taskToArchive]);

  const handleCancelArchive = useCallback(() => {
    setModal(null);
    setTaskToArchive(null);
  }, []);

  // NEW: Handle show archived tasks
  const handleShowArchivedTasks = useCallback(() => {
    setShowArchivedTasks(true);
  }, []);

  const handleCloseArchivedTasks = useCallback(() => {
    setShowArchivedTasks(false);
  }, []);

  // NEW: Handle manual session (thêm thời gian thủ công)
  const handleManualSession = useCallback(async (taskId, durationInSeconds) => {
    console.log("🔄 Thêm phiên thủ công:", { taskId, durationInSeconds });

    try {
      const newSession = await fileStorageService.addSession(taskId, durationInSeconds);
      console.log("💾 Phiên thủ công đã lưu:", newSession);

      setSessions((prevSessions) => {
        if (prevSessions.some((s) => s.id === newSession.id)) {
          return prevSessions;
        }
        return [...prevSessions, newSession];
      });

      if (typeof fileStorageService.forceSave === "function") {
        await fileStorageService.forceSave();
        console.log("✅ Đã lưu dữ liệu vào storage");
      }

      setModal(null);
      return newSession;
    } catch (error) {
      console.error("❌ Lỗi khi thêm phiên thủ công:", error);
      setError("Không thể lưu phiên làm việc: " + error.message);
      throw error;
    }
  }, []);

  // NEW: Weekly Task Handlers
  const handleAddWeeklyTask = useCallback(async (dayOfWeek, time, name) => {
    try {
      const newTask = await fileStorageService.addWeeklyTask(dayOfWeek, time, name);
      setWeeklyTasks(prev => [...prev, newTask]);
      setModal("weeklySchedule"); // Go back to schedule modal
    } catch (error) {
      console.error("Error adding weekly task:", error);
      setError("Không thể thêm task tuần: " + error.message);
      setModal("error");
    }
  }, []);

  const handleDeleteWeeklyTask = useCallback(async (taskId) => {
    try {
      await fileStorageService.deleteWeeklyTask(taskId);
      setWeeklyTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error("Error deleting weekly task:", error);
      setError("Không thể xóa task tuần: " + error.message);
      setModal("error");
    }
  }, []);

  // Helper to format remaining time
  const formatRemainingTime = (diffMs) => {
    if (diffMs < 0) return "Đã qua";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes === 0) return "Sắp bắt đầu!";
    if (minutes < 60) return `Còn ${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    return `Còn ${hours} giờ ${remainMin} phút`;
  };

  // Check upcoming weekly tasks
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkUpcomingTasks = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 is Sunday, 1-6 is Mon-Sat
      
      const todaysTasks = weeklyTasks.filter(t => t.dayOfWeek === currentDay);
      if (todaysTasks.length === 0) {
        setUpcomingWeeklyTasks([]);
        return;
      }

      const upcoming = todaysTasks.map(task => {
        const [hours, minutes] = task.time.split(':').map(Number);
        const taskTime = new Date();
        taskTime.setHours(hours, minutes, 0, 0);
        
        const diffMs = taskTime - now;
        
        // Notify if it's exactly the minute
        // This runs every 10s, so we check if diff is between 0 and 10s
        if (diffMs > 0 && diffMs <= 10000) {
           if ('Notification' in window && Notification.permission === 'granted') {
             new Notification('Đến giờ!', {
               body: task.name,
             });
           }
           try {
             const audio = new Audio(`${process.env.PUBLIC_URL}/noti2.mp3`);
             audio.volume = 0.7;
             audio.play();
           } catch (err) {
             console.warn("Could not play notification audio:", err);
           }
        }
        
        return {
          ...task,
          diffMs,
          remainingText: formatRemainingTime(diffMs),
          isPast: diffMs < 0,
          isActive: diffMs >= -60000 && diffMs <= 0 // Just triggered within 1 min
        };
      }).sort((a, b) => {
        // Sort future tasks by time remaining, then past tasks
        if (a.diffMs >= 0 && b.diffMs >= 0) return a.diffMs - b.diffMs;
        if (a.diffMs < 0 && b.diffMs < 0) return b.diffMs - a.diffMs; // Most recent past first
        return a.diffMs >= 0 ? -1 : 1;
      });

      setUpcomingWeeklyTasks(upcoming);
    };

    checkUpcomingTasks();
    const interval = setInterval(checkUpcomingTasks, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [weeklyTasks]);

  const handleBreakEnd = useCallback(() => {
    setActiveBreak(false);
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 antialiased overflow-hidden flex flex-col">
      {activeBreak ? (
        <BreakScreen duration={300} onComplete={handleBreakEnd} />
      ) : !activeSession ? (
        <>
          <Header
            sessions={filteredSessions}
            filter={filter}
            dailyTarget={dailyTarget}
            todayFocusTime={todayFocusTime}
            onSetTarget={() => setModal("dailyTarget")}
          />

          <div className="flex-grow overflow-y-auto px-4 pb-24">
            {isTransitioning && (
              <div className="fixed inset-0 z-30 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-lg font-medium">Đang lưu kết quả...</span>
                  </div>
                </div>
              </div>
            )}

            {/* NEW: Upcoming Tasks Banner */}
            {upcomingWeeklyTasks.length > 0 && (
              <div className="mb-4 bg-white rounded-xl p-4 shadow-sm border-2 border-black">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <span className="mr-2">📅</span> Lịch trình hôm nay
                </h3>
                <div className="space-y-2">
                  {upcomingWeeklyTasks.map(task => (
                    <div key={task.id} className={`flex justify-between items-center p-2 rounded-lg border-2 ${task.isActive ? 'border-red-500 bg-red-50 animate-pulse' : task.isPast ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-blue-200 bg-blue-50'}`}>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{task.time}</span>
                        <span className="text-sm text-gray-700">{task.name}</span>
                      </div>
                      <div className={`font-semibold text-sm px-2 py-1 rounded ${task.isActive ? 'text-red-700 bg-red-100' : task.isPast ? 'text-gray-500' : 'text-blue-700 bg-blue-100'}`}>
                        {task.remainingText}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <HistoryView
              sessions={filteredSessions}
              tasks={tasks}
              filter={filter}
              setFilter={setFilter}
              dailyTargets={{}}
              allSessions={sessions}
            />
            <TaskList
              tasks={tasks}
              onTaskClick={(task) => {
                setTaskToStart(task);
                setModal("startTask");
              }}
              onTaskEdit={handleEditTask} // NEW
              onTaskArchive={handleArchiveTask} // NEW
              onTaskDelete={handleDeleteTask}
            />
          </div>

          {/* Floating Action Buttons */}
          <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-20">
            {/* NEW: Schedule Button */}
            <button
              onClick={() => setModal("weeklySchedule")}
              className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-indigo-700 transition transform hover:scale-110"
              aria-label="Thời khóa biểu"
              title="Thời khóa biểu tuần"
            >
              📅
            </button>

            {/* NEW: Archived Tasks Button */}
            {archivedTasks.length > 0 && (
              <button
                onClick={handleShowArchivedTasks}
                className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-orange-700 transition transform hover:scale-110 relative"
                aria-label="Xem tasks đã ẩn"
                title="Tasks đã ẩn"
              >
                📦
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {archivedTasks.length}
                </span>
              </button>
            )}

            <button
              onClick={() => setModal("fileManager")}
              className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-green-700 transition transform hover:scale-110"
              aria-label="Quản lý file dữ liệu"
              title="Quản lý file dữ liệu"
            >
              📁
            </button>

            {/* NEW: Thêm thời gian thủ công Button */}
            <button
              onClick={() => setModal("manualSession")}
              className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-purple-700 transition transform hover:scale-110"
              aria-label="Thêm thời gian thủ công"
              title="Thêm thời gian thủ công"
            >
              ⏱️
            </button>

            <button
              onClick={() => setModal("settings")}
              className="bg-gray-800 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-gray-900 transition transform hover:scale-110"
              aria-label="Cài đặt khung thời gian"
              title="Cài đặt khung thời gian"
            >
              ⚙️
            </button>

            <button
              onClick={() => setModal("addTask")}
              className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition transform hover:scale-110"
              aria-label="Thêm task mới"
              disabled={loading || isTransitioning}
            >
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
            </button>
          </div>
        </>
      ) : (
        <FocusView
          session={activeSession}
          onSessionEnd={handleAddSession}
          onStop={() => setModal("confirmStop")}
        />
      )}

      {loading && <LoadingModal />}

      {modal === "error" && (
        <ErrorModal
          error={error}
          onClose={handleErrorClose}
          onRetry={handleRetry}
        />
      )}

      {modal === "fileManager" && (
        <FileManagerModal
          onClose={() => setModal(null)}
          onSuccess={handleFileManagerSuccess}
        />
      )}

      {(modal === "addTask" || modal === "startTask") && (
        <TaskModal
          task={taskToStart}
          onClose={() => {
            setModal(null);
            setTaskToStart(null);
          }}
          onStartSession={handleStartSession}
          onAddTask={handleAddTask}
          sessionPresets={presetSettings.sessionPresets}
        />
      )}

      {/* NEW: Edit Task Modal */}
      {modal === "editTask" && taskToEdit && (
        <EditTaskModal
          task={taskToEdit}
          onClose={() => {
            setModal(null);
            setTaskToEdit(null);
          }}
          onSave={handleSaveTaskEdit}
        />
      )}

      {/* NEW: Confirm Archive Modal */}
      {modal === "confirmArchive" && taskToArchive && (
        <ConfirmArchiveModal
          task={taskToArchive}
          onConfirm={handleConfirmArchive}
          onCancel={handleCancelArchive}
        />
      )}

      {/* NEW: Archived Tasks Modal */}
      {showArchivedTasks && (
        <ArchivedTasksModal
          tasks={archivedTasks}
          onClose={handleCloseArchivedTasks}
          onUnarchive={(task) => {
            setTaskToArchive(task);
            setModal("confirmArchive");
            setShowArchivedTasks(false);
          }}
          onDelete={(task) => {
            setTaskToDelete(task);
            setModal("confirmDelete");
            setShowArchivedTasks(false);
          }}
        />
      )}

      {modal === "dailyTarget" && (
        <DailyTargetModal
          currentTarget={Math.round(dailyTarget / 60)}
          onClose={() => setModal(null)}
          onSetTarget={handleSetDailyTarget}
          presetTargets={presetSettings.targetPresets}
        />
      )}

      {modal === "sessionEnd" && (
        <SessionEndModal
          onComplete={() => handleAddSession(activeSession.duration)}
          onPause={handleStopSession}
        />
      )}

      {modal === "confirmStop" && (
        <ConfirmStopModal
          onConfirm={handleStopSession}
          onCancel={() => setModal(null)}
        />
      )}

      {modal === "confirmDelete" && (
        <ConfirmDeleteModal
          task={taskToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {modal === "dailySummary" && dailySummaryDate && (
        <DailySummaryModal
          date={dailySummaryDate}
          sessions={sessions.filter(s =>
            new Date(s.completedAt).toISOString().split('T')[0] === dailySummaryDate
          )}
          tasks={tasks}
          dailyTarget={Math.round(dailyTarget / 60)} // Convert to minutes
          onClose={handleCloseDailySummary}
        />
      )}

      {/* NEW: Manual Session Modal */}
      {modal === "manualSession" && (
        <ManualSessionModal
          tasks={tasks}
          onClose={() => setModal(null)}
          onSubmit={handleManualSession}
        />
      )}

      {/* Settings Modal */}
      {modal === "settings" && (
        <SettingsModal
          settings={presetSettings}
          onClose={() => setModal(null)}
          onSave={handleSaveSettings}
        />
      )}

      {/* NEW: Weekly Schedule Modals */}
      {modal === "weeklySchedule" && (
        <WeeklyScheduleModal
          weeklyTasks={weeklyTasks}
          onClose={() => setModal(null)}
          onAddTask={(dayId) => {
            setWeeklyDayToAdd(dayId);
            setModal("addWeeklyTask");
          }}
          onDeleteTask={handleDeleteWeeklyTask}
        />
      )}

      {modal === "addWeeklyTask" && (
        <AddWeeklyTaskModal
          dayOfWeek={weeklyDayToAdd}
          onClose={() => setModal("weeklySchedule")}
          onSave={handleAddWeeklyTask}
        />
      )}
    </div>
  );
};

export default App;
