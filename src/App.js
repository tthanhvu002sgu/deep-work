// src/App.jsx

import { useState, useEffect, useMemo } from "react";
import Header from "./components/Header";
import TaskList from "./components/TaskList";
import FocusView from "./components/FocusView";
import HistoryView from "./components/HistoryView";
import GoogleAuth from "./components/GoogleAuth";
import {
  TaskModal,
  SessionEndModal,
  ConfirmStopModal,
  ConfirmDeleteModal,
  DailyTargetModal,
  LoadingModal,
  ErrorModal,
} from "./components/Modals";
import { useGoogleSheets } from "./hooks/useGoogleSheets";
import googleAuthService from "./services/googleAuthService";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Use Google Sheets hook
  const {
    tasks,
    sessions,
    loading,
    error,
    addTask,
    deleteTask,
    addSession,
    refreshData,
  } = useGoogleSheets();

  // Daily target state
  const [dailyTarget, setDailyTarget] = useState(() => {
    const today = new Date().toDateString();
    const savedTarget = localStorage.getItem("deepwork_daily_target");
    const savedDate = localStorage.getItem("deepwork_daily_target_date");

    if (savedDate !== today) {
      localStorage.removeItem("deepwork_daily_target");
      localStorage.removeItem("deepwork_daily_target_date");
      return 0;
    }

    return savedTarget ? parseInt(savedTarget) : 0;
  });

  const [activeSession, setActiveSession] = useState(null);
  const [modal, setModal] = useState(null);
  const [taskToStart, setTaskToStart] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [filter, setFilter] = useState("day");

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const isAuth = googleAuthService.isAuthenticated();
      setIsAuthenticated(isAuth);

      // Show session info in console for debugging
      const sessionInfo = googleAuthService.getSessionInfo();
      if (sessionInfo) {
        console.log("Session Info:", sessionInfo);
      }
    };

    checkAuth();

    // Check auth status periodically (every 5 minutes)
    const interval = setInterval(checkAuth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle authentication success
  const handleAuthSuccess = () => {
    setIsAuthenticated(googleAuthService.isAuthenticated());
    setShowAuth(false);
    refreshData(); // Refresh data after authentication

    // Show success message
    console.log("Authentication successful with persistent session");
  };

  // Save daily target
  useEffect(() => {
    const today = new Date().toDateString();
    if (dailyTarget > 0) {
      localStorage.setItem("deepwork_daily_target", dailyTarget.toString());
      localStorage.setItem("deepwork_daily_target_date", today);
    }
  }, [dailyTarget]);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sessions.filter((session) => {
      const sessionDate = new Date(session.completedAt);
      switch (filter) {
        case "week":
          const oneWeekAgo = new Date(today).setDate(today.getDate() - 7);
          return sessionDate >= oneWeekAgo;
        case "month":
          return (
            sessionDate.getMonth() === now.getMonth() &&
            sessionDate.getFullYear() === now.getFullYear()
          );
        case "day":
        default:
          return sessionDate.setHours(0, 0, 0, 0) === today.getTime();
      }
    });
  }, [sessions, filter]);

  const todayFocusTime = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySessions = sessions.filter((session) => {
      const sessionDate = new Date(session.completedAt);
      return sessionDate.setHours(0, 0, 0, 0) === today.getTime();
    });

    return todaySessions.reduce((acc, session) => acc + session.duration, 0);
  }, [sessions]);

  // Event handlers (same as before)
  const handleAddTask = async (taskName) => {
    try {
      await addTask(taskName);
      setModal(null);
    } catch (error) {
      if (!isAuthenticated) {
        setShowAuth(true);
      } else {
        setModal("error");
      }
    }
  };

  const handleStartSession = (task, duration) => {
    const session = {
      task: task,
      duration: duration === 0 ? 0 : duration * 60,
    };
    setActiveSession(session);
    setModal(null);
  };

  const handleAddSession = async (timeWorked) => {
    if (!activeSession) return;

    try {
      await addSession(activeSession.task.id, timeWorked);
      setActiveSession(null);
      setModal(null);
    } catch (error) {
      if (!isAuthenticated) {
        setShowAuth(true);
      } else {
        setModal("error");
      }
    }
  };

  const handleStopSession = () => {
    setActiveSession(null);
    setModal(null);
  };

  const handleDeleteTask = (task) => {
    setTaskToDelete(task);
    setModal("confirmDelete");
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete.id);
      setModal(null);
      setTaskToDelete(null);
    } catch (error) {
      if (!isAuthenticated) {
        setShowAuth(true);
      } else {
        setModal("error");
      }
    }
  };

  const handleCancelDelete = () => {
    setModal(null);
    setTaskToDelete(null);
  };

  const handleSetDailyTarget = (targetMinutes) => {
    setDailyTarget(targetMinutes * 60);
    setModal(null);
  };

  const handleErrorClose = () => {
    setModal(null);
  };

  const handleRetry = () => {
    refreshData();
    setModal(null);
  };

  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-800 antialiased overflow-hidden flex flex-col">
      {showAuth && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <GoogleAuth onAuthSuccess={handleAuthSuccess} />
            <div className="p-4 border-t">
              <button
                onClick={() => setShowAuth(false)}
                className="w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Tiếp tục với dữ liệu local
              </button>
            </div>
          </div>
        </div>
      )}

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
            {/* Show auth status */}
            <div className="mb-4">
              <GoogleAuth onAuthSuccess={handleAuthSuccess} />
            </div>

            <HistoryView
              sessions={filteredSessions}
              tasks={tasks}
              filter={filter}
              setFilter={setFilter}
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

          <button
            onClick={() => setModal("addTask")}
            className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition transform hover:scale-110 z-20"
            aria-label="Thêm task mới"
            disabled={loading}
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
        </>
      ) : (
        <FocusView
          session={activeSession}
          onSessionEnd={handleAddSession}
          onStop={() => setModal("confirmStop")}
        />
      )}

      {/* Modals (same as before) */}
      {loading && <LoadingModal />}

      {modal === "error" && (
        <ErrorModal
          error={error}
          onClose={handleErrorClose}
          onRetry={handleRetry}
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
