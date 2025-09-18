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
  const [filter, setFilter] = useState("day");
  const [isTransitioning, setIsTransitioning] = useState(false); // Track transition state
  // FIX: Add state to track the current date and trigger updates
  const [currentDateKey, setCurrentDateKey] = useState(
    new Date().toDateString()
  );

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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [tasksData, sessionsData, targetData] = await Promise.all([
          fileStorageService.getTasks(),
          fileStorageService.getSessions(),
          fileStorageService.getDailyTarget(),
        ]);

        setTasks(tasksData);
        setSessions(sessionsData);
        setDailyTarget(targetData.targetMinutes * 60); // Convert to seconds

        console.log("Initial data loaded:", {
          tasks: tasksData.length,
          sessions: sessionsData.length,
          target: targetData.targetMinutes,
        });
      } catch (error) {
        console.error("Error loading initial data:", error);
        setError("Không thể tải dữ liệu: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      fileStorageService.cleanup();
    };
  }, []);

  // Auto-refresh data when file changes (for manual sync)
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      if (isTransitioning || activeSession) return; // Skip during session or transition

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

  // Memoized filtered sessions
  const filteredSessions = useMemo(() => {
    const now = new Date();

    // FIX: Consistent week calculation (Monday to Sunday)
    const getStartOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      return new Date(d.setDate(diff));
    };

    const startOfThisWeek = getStartOfWeek(now);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.completedAt);
      switch (filter) {
        case "week":
          // Filter for the current week from Monday to Sunday
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
    // FIX: Add currentDateKey to dependency array to re-calculate on new day
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
    // FIX: Add currentDateKey to dependency array to re-calculate on new day
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

      // Update state immediately
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

  // CRITICAL FIX: Đảm bảo dữ liệu được lưu và UI được cập nhật ngay lập tức
  const addSession = useCallback(async (taskId, duration) => {
    console.log("🔄 Bắt đầu lưu phiên:", { taskId, duration });

    try {
      // Lưu phiên làm việc
      const newSession = await fileStorageService.addSession(taskId, duration);
      console.log("💾 Phiên làm việc đã lưu:", newSession);

      // Thêm session mới vào state NGAY LẬP TỨC để UI cập nhật ngay
      // (sử dụng functional update để tránh stale state)
      setSessions((prevSessions) => {
        // Kiểm tra trùng lặp để tránh double counting
        if (prevSessions.some((s) => s.id === newSession.id)) {
          return prevSessions;
        }
        // Thêm session mới vào danh sách
        return [...prevSessions, newSession];
      });

      // Đảm bảo lưu xuống storage hoàn tất
      if (typeof fileStorageService.forceSave === "function") {
        await fileStorageService.forceSave();
        console.log("✅ Đã lưu dữ liệu vào storage");
      }

      // BUGFIX: Trả về session mới để tham chiếu bên ngoài
      return newSession;
    } catch (error) {
      console.error("❌ Lỗi khi lưu phiên làm việc:", error);
      setError("Không thể lưu phiên làm việc: " + error.message);
      throw error;
    }
  }, []);

  // Phiên làm việc kết thúc - cập nhật để đảm bảo UI refresh đúng thời điểm
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

        // Lưu phiên làm việc vào storage và cập nhật state
        await addSession(activeSession.task.id, timeWorked);

        // Đảm bảo state sessions đã được cập nhật trước khi reset activeSession
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Sau khi dữ liệu đã được cập nhật, chuyển về màn hình chính
        setActiveSession(null);
        setModal(null);

        // BUGFIX: Trigger re-render sau khi đã về màn hình chính
        setTimeout(() => {
          // Trick để force re-render HistoryView
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

  // Bỏ qua phiên làm việc, không lưu dữ liệu
  const handleStopSession = useCallback(() => {
    console.log("⏹️ Dừng phiên làm việc mà không lưu");
    setActiveSession(null);
    setModal(null);
  }, []);

  const handleDeleteTask = useCallback((task) => {
    setTaskToDelete(task);
    setModal("confirmDelete");
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

  const handleCancelDelete = useCallback(() => {
    setModal(null);
    setTaskToDelete(null);
  }, []);

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

  // Debug effect
  useEffect(() => {
    console.log("📈 Current state:", {
      totalSessions: sessions.length,
      filteredSessions: filteredSessions.length,
      todayFocusTime: todayFocusTime,
      isTransitioning: isTransitioning,
      hasActiveSession: !!activeSession,
    });
  }, [
    sessions.length,
    filteredSessions.length,
    todayFocusTime,
    isTransitioning,
    activeSession,
  ]);

  // Function to handle starting a session when user selects a task
  const handleStartSession = useCallback((task, duration) => {
    const session = {
      task: task,
      duration: duration === 0 ? 0 : duration * 60, // Convert minutes to seconds
    };
    setActiveSession(session);
    setModal(null);

    console.log("Starting session:", session);
  }, []);

  // Function to handle adding a new task
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
            <HistoryView
              sessions={filteredSessions}
              tasks={tasks}
              filter={filter}
              setFilter={setFilter}
              dailyTargets={{}}
            />
            <TaskList
              tasks={tasks}
              onTaskClick={(task) => {
                setTaskToStart(task);
                setModal("startTask");
              }}
              onTaskDelete={handleDeleteTask}
            />
          </div>

          {/* Floating Action Buttons */}
          <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-20">
            <button
              onClick={() => setModal("fileManager")}
              className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-green-700 transition transform hover:scale-110"
              aria-label="Quản lý file dữ liệu"
              title="Quản lý file dữ liệu"
            >
              📁
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

      {/* Loading Modal */}
      {loading && <LoadingModal />}

      {/* Error Modal */}
      {modal === "error" && (
        <ErrorModal
          error={error}
          onClose={handleErrorClose}
          onRetry={handleRetry}
        />
      )}

      {/* File Manager Modal */}
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
    </div>
  );
};

export default App;
