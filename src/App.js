// src/App.jsx

import { useState, useEffect, useMemo } from "react";
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
} from "./components/Modals";

const App = () => {
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("deepwork_tasks_v3");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem("deepwork_sessions_v3");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Daily target state - not saved to localStorage, resets daily
  const [dailyTarget, setDailyTarget] = useState(() => {
    const today = new Date().toDateString();
    const savedTarget = localStorage.getItem("deepwork_daily_target");
    const savedDate = localStorage.getItem("deepwork_daily_target_date");

    // Reset target if it's a new day
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

  useEffect(() => {
    localStorage.setItem("deepwork_tasks_v3", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("deepwork_sessions_v3", JSON.stringify(sessions));
  }, [sessions]);

  // Save daily target but check for date changes
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

  // Calculate today's total focus time
  const todayFocusTime = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todaySessions = sessions.filter((session) => {
      const sessionDate = new Date(session.completedAt);
      return sessionDate.setHours(0, 0, 0, 0) === today.getTime();
    });

    return todaySessions.reduce((acc, session) => acc + session.duration, 0);
  }, [sessions]);

  const handleAddTask = (taskName) => {
    const newTask = { id: Date.now(), name: taskName };
    setTasks((prevTasks) => [...prevTasks, newTask]);
    setModal(null);
  };

  const handleStartSession = (task, duration) => {
    const session = {
      task: task,
      duration: duration === 0 ? 0 : duration * 60, // Keep 0 for free mode
    };
    setActiveSession(session);
    setModal(null);
  };

  const handleAddSession = (timeWorked) => {
    if (!activeSession) return;
    const newSession = {
      id: Date.now(),
      taskId: activeSession.task.id,
      duration: timeWorked,
      completedAt: new Date().toISOString(),
    };
    setSessions((prevSessions) => [...prevSessions, newSession]);
    setActiveSession(null);
    setModal(null);
  };

  const handleStopSession = () => {
    setActiveSession(null);
    setModal(null);
  };

  const handleDeleteTask = (task) => {
    setTaskToDelete(task);
    setModal("confirmDelete");
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;

    // Remove the task
    setTasks((prevTasks) =>
      prevTasks.filter((task) => task.id !== taskToDelete.id)
    );

    // Remove all sessions related to this task
    setSessions((prevSessions) =>
      prevSessions.filter((session) => session.taskId !== taskToDelete.id)
    );

    // Close modal and reset state
    setModal(null);
    setTaskToDelete(null);
  };

  const handleCancelDelete = () => {
    setModal(null);
    setTaskToDelete(null);
  };

  const handleSetDailyTarget = (targetMinutes) => {
    setDailyTarget(targetMinutes * 60); // Convert minutes to seconds
    setModal(null);
  };

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
          currentTarget={Math.round(dailyTarget / 60)} // Convert seconds to minutes
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
