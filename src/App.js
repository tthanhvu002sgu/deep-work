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
  ManualSessionModal, // NEW: Thêm thời gian thủ công
} from "./components/Modals";
import { FileManagerModal } from "./components/FileManagerModal";
import fileStorageService from "./services/fileStorageService";

const App = () => {
  // State management
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentDateKey, setCurrentDateKey] = useState(
    new Date().toDateString()
  );

  // NEW: Daily summary state
  const [dailySummaryDate, setDailySummaryDate] = useState(null);

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
        const [tasksData, sessionsData, targetData, archivedData] = await Promise.all([
          fileStorageService.getTasks(),
          fileStorageService.getSessions(),
          fileStorageService.getDailyTarget(),
          fileStorageService.getArchivedTasks(), // NEW
        ]);

        setTasks(tasksData);
        setSessions(sessionsData);
        setDailyTarget(targetData.targetMinutes * 60);
        setArchivedTasks(archivedData); // NEW

        console.log('Initial data loaded:', {
          tasks: tasksData.length,
          sessions: sessionsData.length,
          target: targetData.targetMinutes,
          archived: archivedData.length, // NEW
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

  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 antialiased overflow-hidden flex flex-col">
      {!activeSession ? (
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
    </div>
  );
};

export default App;
