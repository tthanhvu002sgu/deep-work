// src/components/FocusView.jsx

import { useState, useEffect, useRef } from "react";

const formatTimer = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// Create notification sound player using HTML5 Audio
const createNotificationSound = () => {
  try {
    const playNotificationSound = async () => {
      try {
        const audio = new Audio("/noti2.mp3");
        audio.volume = 0.7;

        const playPromise = new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = reject;
          audio.oncanplaythrough = () => {
            audio.play().catch(reject);
          };
        });

        audio.load();
        await playPromise;
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
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(300);
  const [showTransition, setShowTransition] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [actualWorkTime, setActualWorkTime] = useState(null);

  // CRITICAL: Timestamp-based tracking for accuracy
  const startTimeRef = useRef(Date.now());
  const targetEndTimeRef = useRef(Date.now() + session.duration * 1000);
  const breakStartTimeRef = useRef(null);
  const breakTargetEndTimeRef = useRef(null);
  const pausedAtRef = useRef(null);
  const pausedDurationRef = useRef(0);

  // Refs for timer management
  const timerRef = useRef(null);
  const playNotificationRef = useRef(null);
  const cleanupVisibilityListenerRef = useRef(null);
  const isProcessingEndRef = useRef(false);

  const handleSkipTransition = () => {
    setShowTransition(false);
    setIsBreakTime(true);
    setBreakTimeLeft(300);
    breakStartTimeRef.current = Date.now();
    breakTargetEndTimeRef.current = Date.now() + 300 * 1000;
  };

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
      if (isBreakTime) {
        breakTargetEndTimeRef.current += pauseDuration;
      } else {
        targetEndTimeRef.current += pauseDuration;
      }
      
      pausedAtRef.current = null;
      console.log("Timer resumed, pause duration:", Math.round(pauseDuration / 1000), "seconds");
    }
  }, [isPaused, isBreakTime]);

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
      isBreakTime,
      isFreeMode,
      currentTime: new Date().toLocaleTimeString(),
    });

    // Update timer display
    const updateTimer = () => {
      const now = Date.now();

      if (isBreakTime) {
        // BREAK TIME - Calculate remaining time based on timestamp
        const remainingMs = breakTargetEndTimeRef.current - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        
        setBreakTimeLeft(remainingSec);

        // Check if break time completed
        if (remainingSec <= 0 && !isProcessingEndRef.current) {
          console.log("Break time completed (timestamp-based)");
          isProcessingEndRef.current = true;

          // Clear timer immediately
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // Handle break end
          setTimeout(() => {
            const timeToSave =
              actualWorkTime !== null
                ? actualWorkTime
                : isFreeMode
                ? timeElapsed
                : session.duration;

            console.log("Saving session after break:", timeToSave);

            TabFocusManager.focusTab();

            if (Notification.permission === "granted") {
              new Notification("⏰ Hết giờ nghỉ!", {
                body: "Sẵn sàng cho phiên làm việc tiếp theo?",
                icon: "/favicon.ico",
                requireInteraction: true,
              });
            }

            onSessionEnd(timeToSave);
            isProcessingEndRef.current = false;
          }, 100);
        }
      } else if (isFreeMode) {
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

          // Show transition and start break
          setTimeout(() => {
            showSessionEndNotification();
            isProcessingEndRef.current = false;
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
    isBreakTime,
    isFreeMode,
    showTransition,
    actualWorkTime,
    timeElapsed,
    session.duration,
    onSessionEnd,
  ]);

  // Show transition animation and notifications
  const showSessionEndNotification = async (customWorkTime = null) => {
    // Prevent re-entry
    if (showTransition) {
      console.log("Already in transition, skipping");
      return;
    }

    console.log("Showing session end notification");

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setShowTransition(true);
    setIsPlayingSound(true);

    const workTimeToSave =
      customWorkTime || (isFreeMode ? timeElapsed : session.duration);
    setActualWorkTime(workTimeToSave);

    console.log("Session end notification:", {
      customWorkTime,
      isFreeMode,
      timeElapsed,
      sessionDuration: session.duration,
      finalWorkTime: workTimeToSave,
    });

    TabFocusManager.focusTab();

    try {
      if (playNotificationRef.current) {
        await playNotificationRef.current();
      }
    } catch (error) {
      console.warn("Failed to play notification sounds:", error);
    } finally {
      setIsPlayingSound(false);
    }

    const workTimeInMinutes = Math.round(workTimeToSave / 60);

    if (Notification.permission === "granted") {
      const notification = new Notification("🎉 Phiên làm việc hoàn thành!", {
        body: customWorkTime
          ? `Bạn đã làm việc ${workTimeInMinutes} phút. Thời gian nghỉ ngơi 5 phút bắt đầu`
          : "Thời gian nghỉ ngơi 5 phút bắt đầu",
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

    setTimeout(() => {
      setShowTransition(false);
      setIsBreakTime(true);
      setBreakTimeLeft(300);
      breakStartTimeRef.current = Date.now();
      breakTargetEndTimeRef.current = Date.now() + 300 * 1000;
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
    
    showSessionEndNotification(elapsedSec);
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
    showSessionEndNotification(calculatedWorkTime);
  };

  const handleSkipBreak = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    TabFocusManager.restoreTitle();

    const timeToSave =
      actualWorkTime !== null
        ? actualWorkTime
        : isFreeMode
        ? timeElapsed
        : session.duration;

    console.log("Skipping break, saving with time:", timeToSave);

    // Visual feedback
    if (typeof window !== "undefined") {
      const processingDiv = document.createElement("div");
      processingDiv.id = "processing-overlay";
      processingDiv.style.cssText = `
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              background: rgba(0, 0, 0, 0.1);
              backdrop-filter: blur(8px);
              z-index: 9999;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: fadeIn 0.3s ease-out;
            `;
      processingDiv.innerHTML = `
              <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 16px;
                  background: rgba(255, 255, 255, 0.9);
                  color: #333;
                  padding: 32px 48px;
                  border-radius: 24px;
                  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              ">
                  <div style="font-size: 48px; animation: popIn 0.5s ease-out forwards;">✅</div>
                  <p style="font-weight: 500; font-size: 18px; animation: fadeInText 0.5s 0.2s ease-out forwards; opacity: 0;">
                      Đã lưu
                  </p>
              </div>
            `;
      const style = document.createElement("style");
      style.innerHTML = `
              @keyframes fadeIn { 
                  from { opacity: 0; }
                  to { opacity: 1; }
              }
              @keyframes popIn {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
              }
              @keyframes fadeInText {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
              }
              @keyframes fadeOut {
                  from { opacity: 1; }
                  to { opacity: 0; }
              }
            `;
      document.head.appendChild(style);
      document.body.appendChild(processingDiv);

      setTimeout(() => {
        processingDiv.style.animation = "fadeOut 0.3s ease-out forwards";
        setTimeout(() => {
          if (document.body.contains(processingDiv)) {
            document.body.removeChild(processingDiv);
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
        }, 300);
      }, 1200);
    }

    setTimeout(() => {
      onSessionEnd(timeToSave);
    }, 100);
  };

  // Transition screen
  if (showTransition) {
    const displayTime =
      actualWorkTime !== null
        ? actualWorkTime
        : isFreeMode
        ? timeElapsed
        : session.duration;

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

          <p className="text-md text-slate-400 mb-8">
            Chuẩn bị nghỉ ngơi 5 phút...
          </p>

          <button
            onClick={handleSkipTransition}
            className="flex items-center space-x-2 px-6 py-3 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPlayingSound}
          >
            {!isPlayingSound && (
              <>
                <span className="text-lg">⏭️</span>
                <span>Bỏ qua</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const progress = isBreakTime
    ? ((300 - breakTimeLeft) / 300) * 100
    : isFreeMode
    ? Math.min((timeElapsed / 1800) * 100, 100)
    : ((session.duration - timeLeft) / session.duration) * 100;

  const currentTime = isBreakTime
    ? breakTimeLeft
    : isFreeMode
    ? timeElapsed
    : timeLeft;

  const bgColor = isBreakTime
    ? "bg-green-900"
    : isFreeMode
    ? "bg-purple-900"
    : "bg-slate-900";
  const progressColor = isBreakTime
    ? "bg-green-400"
    : isFreeMode
    ? "bg-purple-400"
    : "bg-blue-500";
  const progressBg = isBreakTime
    ? "bg-green-700"
    : isFreeMode
    ? "bg-purple-700"
    : "bg-slate-700";
  const buttonBg = isBreakTime
    ? "bg-green-800"
    : isFreeMode
    ? "bg-purple-800"
    : "bg-slate-800";
  const textColor = isBreakTime
    ? "text-green-300"
    : isFreeMode
    ? "text-purple-300"
    : "text-slate-300";

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
      {!isBreakTime && (
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
      )}

      {isBreakTime ? (
        <>
          <div
            className="text-8xl mb-6 animate-bounce"
            style={{ animationDuration: "2s" }}
          >
            ☕
          </div>
          <p
            className={`text-xl font-semibold ${textColor} mb-4 text-center animate-pulse`}
          >
            Thời gian nghỉ ngơi
          </p>
          <div className="relative">
            <h2 className="text-8xl font-extrabold tracking-tighter mb-8 relative z-10">
              {formatTimer(currentTime)}
            </h2>
            <div className="absolute inset-0 text-8xl font-extrabold tracking-tighter opacity-20 blur-sm">
              {formatTimer(currentTime)}
            </div>
          </div>
          <p
            className={`${textColor} text-center mb-12 max-w-md animate-fade-in-out`}
          >
            Hãy thư giãn, uống nước, hoặc làm các bài tập nhẹ nhàng để phục hồi
            năng lượng
          </p>
        </>
      ) : (
        <>
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
        </>
      )}

      {/* Control buttons */}
      <div className="fixed bottom-10 flex space-x-6">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm`}
          disabled={showTransition || isPlayingSound}
        >
          {isPaused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng"}
        </button>

        {isBreakTime ? (
          <button
            onClick={handleSkipBreak}
            className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm`}
          >
            ⏭️ Bỏ qua nghỉ
          </button>
        ) : isFreeMode ? (
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
