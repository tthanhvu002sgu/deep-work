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
    // Function to play notification sound once
    const playNotificationSound = async () => {
      try {
        const audio = new Audio("/noti2.mp3");
        audio.volume = 0.7; // Set volume to 70%

        // Create promise to wait for audio to finish
        const playPromise = new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = reject;
          audio.oncanplaythrough = () => {
            audio.play().catch(reject);
          };
        });

        // Load and play audio
        audio.load();
        await playPromise;
      } catch (error) {
        console.warn(`Failed to play notification sound:`, error);
      }
    };

    return playNotificationSound;
  } catch (error) {
    console.log("Audio not supported:", error);
    return () => Promise.resolve(); // Return empty async function if audio not supported
  }
};

// Tab focus management utility
const TabFocusManager = {
  // Store original title to restore later
  originalTitle: document.title,

  // Focus tab with visual indicators
  focusTab: () => {
    try {
      // Change document title to grab attention
      document.title = "🎉 DeepWork - Phiên hoàn thành!";

      // Focus the window if possible
      if (window.focus) {
        window.focus();
      }

      // Try to bring tab to front (limited by browser security)
      if (window.parent && window.parent.focus) {
        window.parent.focus();
      }

      // Flash the page title for attention (blinking effect)
      let blinkCount = 0;
      const blinkInterval = setInterval(() => {
        document.title =
          blinkCount % 2 === 0
            ? "🎉 DeepWork - Phiên hoàn thành!"
            : "⭐ Quay lại để xem kết quả!";
        blinkCount++;

        if (blinkCount >= 10) {
          // Blink 5 times
          clearInterval(blinkInterval);
          document.title = "🎉 DeepWork - Phiên hoàn thành!";
        }
      }, 1000);

      console.log("Tab focus requested - title changed and window focused");
    } catch (error) {
      console.warn("Could not fully focus tab:", error);
    }
  },

  // Restore original title when user returns
  restoreTitle: () => {
    try {
      document.title = TabFocusManager.originalTitle;
    } catch (error) {
      console.warn("Could not restore title:", error);
    }
  },

  // Setup visibility change listener
  setupVisibilityListener: () => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab, restore original title
        TabFocusManager.restoreTitle();
      }
    };

    // Listen for tab becoming visible
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for window focus
    window.addEventListener("focus", TabFocusManager.restoreTitle);

    // Cleanup function
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", TabFocusManager.restoreTitle);
    };
  },
};

const FocusView = ({ session, onSessionEnd, onStop }) => {
  const isFreeMode = session.duration === 0;
  const [timeLeft, setTimeLeft] = useState(session.duration);
  const [timeElapsed, setTimeElapsed] = useState(0); // For free mode
  const [isPaused, setIsPaused] = useState(false);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState(300); // 5 minutes = 300 seconds
  const [showTransition, setShowTransition] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // NEW: Store the actual work time separately to ensure it's not overridden
  const [actualWorkTime, setActualWorkTime] = useState(null);

  const timerRef = useRef(null);
  const playNotificationRef = useRef(null);
  const cleanupVisibilityListenerRef = useRef(null);
  // Handle skipping the transition screen
  const handleSkipTransition = () => {
    setShowTransition(false);
    setIsBreakTime(true);
    setBreakTimeLeft(300);
  };
  // Initialize notification sound and tab focus management
  useEffect(() => {
    playNotificationRef.current = createNotificationSound();

    // Setup visibility change listener
    cleanupVisibilityListenerRef.current =
      TabFocusManager.setupVisibilityListener();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Cleanup visibility listener
      if (cleanupVisibilityListenerRef.current) {
        cleanupVisibilityListenerRef.current();
      }

      // Restore original title when component unmounts
      TabFocusManager.restoreTitle();
    };
  }, []);

  // Timer effect for work session (both countdown and count up)
  useEffect(() => {
    if (!isBreakTime && !isPaused && !showTransition) {
      if (isFreeMode) {
        // Count up mode
        timerRef.current = setInterval(() => {
          setTimeElapsed((prev) => prev + 1);
        }, 1000);
      } else {
        // Count down mode
        if (timeLeft > 0) {
          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev <= 1) {
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, timeLeft, isBreakTime, isFreeMode, showTransition]);

  // Timer effect for break session
  useEffect(() => {
    if (isBreakTime && !isPaused && breakTimeLeft > 0) {
      timerRef.current = setInterval(() => {
        setBreakTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (isBreakTime) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, breakTimeLeft, isBreakTime]);

  // Show transition animation and notifications - UPDATED to store custom work time
  const showSessionEndNotification = async (customWorkTime = null) => {
    // Show transition screen
    setShowTransition(true);
    setIsPlayingSound(true);

    // CRITICAL FIX: Store the actual work time for later use
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

    // Focus tab immediately when session ends
    TabFocusManager.focusTab();

    try {
      // Play notification sound once
      if (playNotificationRef.current) {
        await playNotificationRef.current();
      }
    } catch (error) {
      console.warn("Failed to play notification sounds:", error);
    } finally {
      setIsPlayingSound(false);
    }

    // Show browser notification if permission granted
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

      // Focus tab when notification is clicked
      notification.onclick = () => {
        TabFocusManager.focusTab();
        notification.close();
      };
    }

    // Vibrate if supported (mobile devices)
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    // Auto transition to break after 3 seconds
    setTimeout(() => {
      setShowTransition(false);
      setIsBreakTime(true);
      setBreakTimeLeft(300);
    }, 3000);
  };

  // Effect để xử lý khi work session kết thúc (countdown mode only)
  useEffect(() => {
    if (!isBreakTime && !isFreeMode && timeLeft <= 0 && !showTransition) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      showSessionEndNotification();
    }
  }, [timeLeft, isBreakTime, isFreeMode, showTransition]);

  // CRITICAL FIX: Effect để xử lý khi break time kết thúc - use stored actualWorkTime
  useEffect(() => {
    if (isBreakTime && breakTimeLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Focus tab when break ends
      TabFocusManager.focusTab();

      // Play notification sound once for break end
      const playBreakEndSound = async () => {
        try {
          if (playNotificationRef.current) {
            await playNotificationRef.current();
          }
        } catch (error) {
          console.warn("Failed to play break end notification:", error);
        }
      };

      playBreakEndSound();

      // Show browser notification
      if (Notification.permission === "granted") {
        const notification = new Notification("⏰ Hết giờ nghỉ!", {
          body: "Sẵn sàng cho phiên làm việc tiếp theo?",
          icon: "/favicon.ico",
          requireInteraction: true,
          tag: "break-complete",
        });

        // Focus tab when notification is clicked
        notification.onclick = () => {
          TabFocusManager.focusTab();
          notification.close();
        };
      }

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }

      // CRITICAL FIX: Use stored actualWorkTime instead of timeElapsed
      const timeToSave =
        actualWorkTime !== null
          ? actualWorkTime
          : isFreeMode
          ? timeElapsed
          : session.duration;

      console.log("Break ended, saving session:", {
        actualWorkTime,
        timeElapsed,
        sessionDuration: session.duration,
        finalTimeToSave: timeToSave,
        isFreeMode,
      });

      // Return to home view and save the session with actual work time
      onSessionEnd(timeToSave);
    }
  }, [
    breakTimeLeft,
    isBreakTime,
    onSessionEnd,
    actualWorkTime,
    timeElapsed,
    session.duration,
    isFreeMode,
  ]);

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
    }
    showSessionEndNotification();
  };

  // UPDATED: Handle skipping the rest of the session but saving actual progress
  const handleSkipAndSave = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Calculate the actual time worked (total duration - time remaining)
    const calculatedWorkTime = session.duration - timeLeft;

    console.log("Skipping session with calculated time:", {
      totalDuration: session.duration,
      timeLeft: timeLeft,
      calculatedWorkTime: calculatedWorkTime,
      minutes: Math.round(calculatedWorkTime / 60),
    });

    // Call session end notification with the calculated work time
    showSessionEndNotification(calculatedWorkTime);
  };

  // UPDATED: Handle skip break with a minimal, modern animation
  const handleSkipBreak = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    } // Restore title before ending
    TabFocusManager.restoreTitle(); // CRITICAL FIX: Use stored actualWorkTime or fallback to appropriate value
    const timeToSave =
      actualWorkTime !== null
        ? actualWorkTime
        : isFreeMode
        ? timeElapsed
        : session.duration;
    console.log("Skipping break, saving with time:", {
      actualWorkTime,
      timeElapsed,
      sessionDuration: session.duration,
      finalTimeToSave: timeToSave,
    }); 
    
    // MINIMAL & MODERN: Add a subtle visual feedback overlay
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
            `; // Add required CSS animations
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
      
      // Set a timeout to fade out and remove the element
      setTimeout(() => {
        processingDiv.style.animation = "fadeOut 0.3s ease-out forwards";
        setTimeout(() => {
          if (document.body.contains(processingDiv)) {
            document.body.removeChild(processingDiv);
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
        }, 300); // Remove after fade out animation completes
      }, 1200); // Total display time before starting to fade out
    } 
    
    // Call session end with actual work time after a very short delay to allow UI to show
    setTimeout(() => {
      onSessionEnd(timeToSave);
    }, 100);
  };

  // ENHANCED: Transition screen when session ends with better animations
  if (showTransition) {
    // Use actualWorkTime if available, otherwise fallback
    const displayTime =
      actualWorkTime !== null
        ? actualWorkTime
        : isFreeMode
        ? timeElapsed
        : session.duration;

    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-green-900 via-blue-900 to-purple-900 text-white p-6 relative overflow-hidden">
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping"
            style={{ animationDelay: "0s" }}
          ></div>
          <div
            className="absolute top-3/4 right-1/4 w-3 h-3 bg-green-400 rounded-full animate-ping"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-3/4 w-1 h-1 bg-blue-400 rounded-full animate-ping"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute top-1/3 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping"
            style={{ animationDelay: "0.5s" }}
          ></div>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="text-9xl mb-8 animate-bounce"
            style={{ animationDuration: "1.5s" }}
          >
            🎉
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-300 via-green-300 to-blue-300 bg-clip-text text-transparent animate-pulse">
              Tuyệt vời!
            </h1>
            <p className="text-xl mb-4 text-green-300 animate-fade-in-out">
              Bạn đã hoàn thành phiên làm việc
            </p>
            <p className="text-sm mb-6 text-yellow-300 animate-pulse">
              ✨ Tab đã được tự động focus để thông báo cho bạn
            </p>
          </div>

          {/* Enhanced loading indicator when playing sound */}
          {isPlayingSound && (
            <div className="mb-6 flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-16 h-16 border-4 border-yellow-200 border-t-transparent rounded-full animate-spin"></div>
                <div
                  className="absolute inset-2 w-12 h-12 border-2 border-green-200 border-r-green-400 rounded-full animate-spin"
                  style={{
                    animationDirection: "reverse",
                    animationDuration: "1.5s",
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl animate-bounce">🔊</div>
                </div>
              </div>
              <p className="text-sm text-center text-yellow-300 animate-pulse">
                Đang phát âm thanh thông báo...
              </p>
            </div>
          )}

          {/* Time display with enhanced styling */}
          <div className="relative mb-8">
            <div className="text-6xl font-bold text-yellow-300 animate-pulse relative z-10">
              {formatTimer(displayTime)}
            </div>
            <div className="absolute inset-0 text-6xl font-bold text-yellow-300 opacity-30 blur-sm">
              {formatTimer(displayTime)}
            </div>
          </div>

          <p className="text-lg text-center mb-8 text-blue-200 animate-fade-in-out">
            Chuẩn bị nghỉ ngơi 5 phút...
          </p>

          {/* Enhanced button */}
          <button
            onClick={handleSkipTransition}
            className="group relative px-8 py-4 bg-gradient-to-r from-white/90 to-white/80 backdrop-blur-sm text-green-900 font-semibold rounded-xl hover:from-white hover:to-white/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPlayingSound}
          >
            <div className="flex items-center space-x-2">
              {isPlayingSound ? (
                <>
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang phát âm thanh...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">⏭️</span>
                  <span>Bỏ qua</span>
                </>
              )}
            </div>

            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Animated background gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-green-900/50 via-transparent to-purple-900/50 animate-pulse"
          style={{ animationDuration: "4s" }}
        ></div>
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
      {/* Enhanced progress bar */}
      <div className={`w-full h-2 ${progressBg} fixed top-0 left-0 shadow-lg`}>
        <div
          className={`h-2 ${progressColor} transition-all duration-1000 ease-out relative overflow-hidden`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
        </div>
      </div>

      {/* Background particles for focus mode */}
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

      {/* Enhanced control buttons */}
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
            {/* Enhanced Skip button only if > 75% complete */}
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
