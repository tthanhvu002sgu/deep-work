// src/components/FocusView.jsx

import { useState, useEffect, useRef } from "react";

const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// FIXED: Tạo Audio instance ngay lập tức để bypass autoplay policy
const createNotificationSound = () => {
  try {
    // Tạo audio instance sẵn
    const audio = new Audio(`${process.env.PUBLIC_URL}/noti2.mp3`);
    audio.volume = 0.7;
    audio.preload = "auto"; // Preload để sẵn sàng phát

    const playNotificationSound = async () => {
      try {
        // Reset audio về đầu
        audio.currentTime = 0;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          console.log("✅ Notification sound played successfully");
        }
      } catch (error) {
        console.warn(`Failed to play notification sound:`, error);
      }
    };

    return playNotificationSound;
  } catch (error) {
    console.log("Audio not supported:", error);
    return () => Promise.resolve();
  }
};

// Tab focus management utility
const TabFocusManager = {
  originalTitle: document.title,

  focusTab: () => {
    try {
      document.title = "🎉 DeepWork - Phiên hoàn thành!";

      if (window.focus) {
        window.focus();
      }

      if (window.parent && window.parent.focus) {
        window.parent.focus();
      }

      let blinkCount = 0;
      const blinkInterval = setInterval(() => {
        document.title =
          blinkCount % 2 === 0
            ? "🎉 DeepWork - Phiên hoàn thành!"
            : "⭐ Quay lại để xem kết quả!";
        blinkCount++;

        if (blinkCount >= 10) {
          clearInterval(blinkInterval);
          document.title = "🎉 DeepWork - Phiên hoàn thành!";
        }
      }, 1000);

      console.log("Tab focus requested");
    } catch (error) {
      console.warn("Could not fully focus tab:", error);
    }
  },

  restoreTitle: () => {
    try {
      document.title = TabFocusManager.originalTitle;
    } catch (error) {
      console.warn("Could not restore title:", error);
    }
  },

  setupVisibilityListener: () => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        TabFocusManager.restoreTitle();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", TabFocusManager.restoreTitle);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", TabFocusManager.restoreTitle);
    };
  },
};

const FocusView = ({ session, onSessionEnd, onStop }) => {
  const isFreeMode = session.duration === 0;
  
  // UI state - displayed values
  const [timeLeft, setTimeLeft] = useState(session.duration);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // CRITICAL: Timestamp-based tracking for accuracy
  const startTimeRef = useRef(Date.now());
  const targetEndTimeRef = useRef(Date.now() + session.duration * 1000);
  const pausedAtRef = useRef(null);
  const pausedDurationRef = useRef(0);

  // Refs for timer management
  const timerRef = useRef(null);
  const completeTimeoutRef = useRef(null);
  const endTimeoutRef = useRef(null);
  const playNotificationRef = useRef(null);
  const cleanupVisibilityListenerRef = useRef(null);
  const isProcessingEndRef = useRef(false);

  // Initialize notification sound and tab focus management
  useEffect(() => {
    playNotificationRef.current = createNotificationSound();
    cleanupVisibilityListenerRef.current =
      TabFocusManager.setupVisibilityListener();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }

      if (endTimeoutRef.current) {
        clearTimeout(endTimeoutRef.current);
        endTimeoutRef.current = null;
      }

      if (cleanupVisibilityListenerRef.current) {
        cleanupVisibilityListenerRef.current();
      }

      TabFocusManager.restoreTitle();
    };
  }, []);

  // Handle pause state changes
  useEffect(() => {
    if (isPaused) {
      pausedAtRef.current = Date.now();
      console.log("Timer paused at:", new Date(pausedAtRef.current).toLocaleTimeString());
    } else if (pausedAtRef.current !== null) {
      // Resuming from pause
      const pauseDuration = Date.now() - pausedAtRef.current;
      pausedDurationRef.current += pauseDuration;
      
      // Adjust target times to account for pause
      targetEndTimeRef.current += pauseDuration;
      
      pausedAtRef.current = null;
      console.log("Timer resumed, pause duration:", Math.round(pauseDuration / 1000), "seconds");
    }
  }, [isPaused]);

  // FIXED: Timestamp-based timer with accurate time tracking
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Don't run timer if paused or showing transition
    if (isPaused || showTransition) {
      console.log("Timer paused or in transition, not starting interval");
      return;
    }

    console.log("Starting timestamp-based timer:", {
      isFreeMode,
      currentTime: new Date().toLocaleTimeString(),
    });

    // Update timer display
    const updateTimer = () => {
      const now = Date.now();

      if (isFreeMode) {
        // FREE MODE - Count up based on elapsed time
        const elapsedMs = now - startTimeRef.current - pausedDurationRef.current;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        setTimeElapsed(elapsedSec);
      } else {
        // WORK SESSION - Calculate remaining time based on timestamp
        const remainingMs = targetEndTimeRef.current - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        
        setTimeLeft(remainingSec);

        // Check if work session completed
        if (remainingSec <= 0 && !isProcessingEndRef.current) {
          console.log("Work session completed (timestamp-based)");
          isProcessingEndRef.current = true;

          // Clear timer immediately
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // CHANGED: Gọi trực tiếp kết thúc session thay vì break
          completeTimeoutRef.current = setTimeout(() => {
            completeTimeoutRef.current = null;
            handleSessionComplete();
          }, 100);
        }
      }
    };

    // Initial update
    updateTimer();

    // Start interval for UI updates (every 100ms for smoothness)
    timerRef.current = setInterval(updateTimer, 100);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    isPaused,
    isFreeMode,
    showTransition,
    timeElapsed,
    session.duration,
  ]);

  // CHANGED: Xử lý kết thúc session - về trang chủ luôn
  const handleSessionComplete = async () => {
    console.log("🎉 Session completed, showing notification and returning home");

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setShowTransition(true);
    setIsPlayingSound(true);

    const workTimeToSave = isFreeMode ? timeElapsed : session.duration;

    console.log("Session complete:", {
      isFreeMode,
      timeElapsed,
      sessionDuration: session.duration,
      finalWorkTime: workTimeToSave,
    });

    TabFocusManager.focusTab();

    // FIXED: Phát âm thanh ngay lập tức
    try {
      if (playNotificationRef.current) {
        await playNotificationRef.current();
        console.log("✅ Sound played after session complete");
      }
    } catch (error) {
      console.warn("Failed to play notification sounds:", error);
    } finally {
      setIsPlayingSound(false);
    }

    const workTimeInMinutes = Math.round(workTimeToSave / 60);

    // Show notification
    if (Notification.permission === "granted") {
      const notification = new Notification("🎉 Phiên làm việc hoàn thành!", {
        body: `Bạn đã làm việc ${workTimeInMinutes} phút. Tuyệt vời!`,
        icon: "/favicon.ico",
        requireInteraction: true,
        tag: "session-complete",
      });

      notification.onclick = () => {
        TabFocusManager.focusTab();
        notification.close();
      };
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    // CHANGED: Tự động về trang chủ sau 3 giây
    endTimeoutRef.current = setTimeout(() => {
      endTimeoutRef.current = null;
      TabFocusManager.restoreTitle();
      onSessionEnd(workTimeToSave);
      isProcessingEndRef.current = false;
    }, 3000);
  };

  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("🎯 DeepWork sẵn sàng!", {
            body: "Bạn sẽ nhận được thông báo khi phiên làm việc kết thúc",
            icon: "/favicon.ico",
          });
        }
      });
    }
  }, []);

  const handleFinishFreeMode = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isProcessingEndRef.current = true;
    
    // Calculate actual elapsed time
    const now = Date.now();
    const elapsedMs = now - startTimeRef.current - pausedDurationRef.current;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    
    handleSessionCompleteWithTime(elapsedSec);
  };

  const handleSkipAndSave = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Calculate actual work time based on timestamps
    const now = Date.now();
    const elapsedMs = now - startTimeRef.current - pausedDurationRef.current;
    const calculatedWorkTime = Math.floor(elapsedMs / 1000);

    console.log("Skipping session with calculated time (timestamp-based):", {
      totalDuration: session.duration,
      calculatedWorkTime: calculatedWorkTime,
      minutes: Math.round(calculatedWorkTime / 60),
      startTime: new Date(startTimeRef.current).toLocaleTimeString(),
      endTime: new Date(now).toLocaleTimeString(),
    });

    isProcessingEndRef.current = true;
    handleSessionCompleteWithTime(calculatedWorkTime);
  };

  // NEW: Helper để kết thúc với custom time
  const handleSessionCompleteWithTime = async (customWorkTime) => {
    console.log("🎉 Session completed with custom time, returning home");

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setShowTransition(true);
    setIsPlayingSound(true);

    TabFocusManager.focusTab();

    // Phát âm thanh ngay
    try {
      if (playNotificationRef.current) {
        await playNotificationRef.current();
      }
    } catch (error) {
      console.warn("Failed to play notification sounds:", error);
    } finally {
      setIsPlayingSound(false);
    }

    const workTimeInMinutes = Math.round(customWorkTime / 60);

    if (Notification.permission === "granted") {
      new Notification("🎉 Phiên làm việc hoàn thành!", {
        body: `Bạn đã làm việc ${workTimeInMinutes} phút. Tuyệt vời!`,
        icon: "/favicon.ico",
        requireInteraction: true,
      });
    }

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    // Visual feedback
    const processingDiv = document.createElement("div");
    processingDiv.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.1); backdrop-filter: blur(8px); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;
    processingDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;
        background: rgba(255, 255, 255, 0.9); color: #333; padding: 32px 48px;
        border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        <div style="font-size: 48px; animation: popIn 0.5s ease-out forwards;">✅</div>
        <p style="font-weight: 500; font-size: 18px;">Đã lưu</p>
      </div>
    `;
    document.body.appendChild(processingDiv);

    endTimeoutRef.current = setTimeout(() => {
      endTimeoutRef.current = null;
      if (document.body.contains(processingDiv)) {
        document.body.removeChild(processingDiv);
      }
      TabFocusManager.restoreTitle();
      onSessionEnd(customWorkTime);
      isProcessingEndRef.current = false;
    }, 1500);
  };

  // Transition screen
  if (showTransition) {
    const displayTime = isFreeMode ? timeElapsed : session.duration;

    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div
            className="text-8xl mb-6 animate-bounce"
            style={{ animationDuration: "1.5s" }}
          >
            🎉
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-slate-100">
              Tuyệt vời!
            </h1>
            <p className="text-lg text-slate-300">
              Bạn đã hoàn thành phiên làm việc.
            </p>
          </div>

          {isPlayingSound && (
            <div className="mb-6 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-200 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 mt-3">
                Đang phát âm thanh...
              </p>
            </div>
          )}

          <div className="mb-8">
            <div className="text-6xl font-bold text-slate-100">
              {formatTimer(displayTime)}
            </div>
          </div>

          <p className="text-md text-slate-400">
            Đang quay về trang chủ...
          </p>
        </div>
      </div>
    );
  }

  const progress = isFreeMode
    ? Math.min((timeElapsed / 1800) * 100, 100)
    : ((session.duration - timeLeft) / session.duration) * 100;

  const currentTime = isFreeMode ? timeElapsed : timeLeft;

  const bgColor = isFreeMode ? "bg-purple-900" : "bg-slate-900";
  const progressColor = isFreeMode ? "bg-purple-400" : "bg-blue-500";
  const progressBg = isFreeMode ? "bg-purple-700" : "bg-slate-700";
  const buttonBg = isFreeMode ? "bg-purple-800" : "bg-slate-800";
  const textColor = isFreeMode ? "text-purple-300" : "text-slate-300";

  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full ${bgColor} text-white p-6 relative overflow-hidden`}
    >
      {/* Progress bar */}
      <div className={`w-full h-2 ${progressBg} fixed top-0 left-0 shadow-lg`}>
        <div
          className={`h-2 ${progressColor} transition-all duration-1000 ease-out relative overflow-hidden`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
        </div>
      </div>

      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div
          className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping"
          style={{ animationDelay: "0s", animationDuration: "3s" }}
        ></div>
        <div
          className="absolute top-3/4 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-ping"
          style={{ animationDelay: "1s", animationDuration: "4s" }}
        ></div>
        <div
          className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-ping"
          style={{ animationDelay: "2s", animationDuration: "5s" }}
        ></div>
      </div>

      {isFreeMode && <div className="text-6xl mb-4 animate-bounce">⏱️</div>}
      <p className={`text-xl font-semibold ${textColor} mb-4 text-center`}>
        {session.task.name}
        {isFreeMode && (
          <span className="block text-sm mt-1 animate-pulse">
            Chế độ tự do
          </span>
        )}
      </p>
      <div className="relative">
        <h2 className="text-8xl font-extrabold tracking-tighter relative z-10">
          {formatTimer(currentTime)}
        </h2>
        <div className="absolute inset-0 text-8xl font-extrabold tracking-tighter opacity-10 blur-sm">
          {formatTimer(currentTime)}
        </div>
      </div>

      {/* Control buttons */}
      <div className="fixed bottom-10 flex space-x-6">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm`}
          disabled={showTransition || isPlayingSound}
        >
          {isPaused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng"}
        </button>

        {isFreeMode ? (
          <button
            onClick={handleFinishFreeMode}
            className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm`}
            disabled={showTransition || isPlayingSound}
          >
            ✅ Kết thúc
          </button>
        ) : (
          <>
            {progress > 75 && (
              <button
                onClick={handleSkipAndSave}
                className="text-white font-semibold py-3 px-6 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm relative overflow-hidden group"
                disabled={showTransition || isPlayingSound}
                title="Hoàn thành và lưu tiến trình hiện tại"
              >
                <div className="flex items-center space-x-2 relative z-10">
                  <span>✅</span>
                  <span>Bỏ qua</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-green-300/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </button>
            )}
            <button
              onClick={onStop}
              className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm`}
              disabled={showTransition || isPlayingSound}
              title="Dừng và không lưu lại phiên"
            >
              ⏹️ Dừng
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FocusView;
