// src/components/FocusView.jsx

import { useState, useEffect, useRef } from 'react';

const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// Create notification sound using Web Audio API
const createNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playBeep = (frequency = 800, duration = 200) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);
        };
        
        const playNotificationSound = () => {
            // Play a pleasant notification sequence
            playBeep(659, 200); // E note
            setTimeout(() => playBeep(523, 200), 250); // C note
            setTimeout(() => playBeep(659, 400), 500); // E note (longer)
        };
        
        return playNotificationSound;
    } catch (error) {
        console.log('Web Audio API not supported:', error);
        return () => {}; // Return empty function if audio not supported
    }
};

const FocusView = ({ session, onSessionEnd, onStop }) => {
    const isFreeMode = session.duration === 0;
    const [timeLeft, setTimeLeft] = useState(session.duration);
    const [timeElapsed, setTimeElapsed] = useState(0); // For free mode
    const [isPaused, setIsPaused] = useState(false);
    const [isBreakTime, setIsBreakTime] = useState(false);
    const [breakTimeLeft, setBreakTimeLeft] = useState(300); // 5 minutes = 300 seconds
    const [showTransition, setShowTransition] = useState(false);
    const timerRef = useRef(null);
    const playNotificationRef = useRef(null);
    
    // Initialize notification sound
    useEffect(() => {
        playNotificationRef.current = createNotificationSound();
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Timer effect for work session (both countdown and count up)
    useEffect(() => {
        if (!isBreakTime && !isPaused && !showTransition) {
            if (isFreeMode) {
                // Count up mode
                timerRef.current = setInterval(() => {
                    setTimeElapsed(prev => prev + 1);
                }, 1000);
            } else {
                // Count down mode
                if (timeLeft > 0) {
                    timerRef.current = setInterval(() => {
                        setTimeLeft(prev => {
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
                setBreakTimeLeft(prev => {
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

    // Show transition animation and notifications
    const showSessionEndNotification = () => {
        // Show transition screen
        setShowTransition(true);
        
        // Play notification sound
        if (playNotificationRef.current) {
            playNotificationRef.current();
        }
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification('🎉 Phiên làm việc hoàn thành!', {
                body: 'Thời gian nghỉ ngơi 5 phút bắt đầu',
                icon: '/favicon.ico',
                requireInteraction: true
            });
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

    // Effect để xử lý khi break time kết thúc
    useEffect(() => {
        if (isBreakTime && breakTimeLeft <= 0) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            
            // Play notification sound
            if (playNotificationRef.current) {
                playNotificationRef.current();
            }
            
            // Show browser notification
            if (Notification.permission === 'granted') {
                new Notification('⏰ Hết giờ nghỉ!', {
                    body: 'Sẵn sàng cho phiên làm việc tiếp theo?',
                    icon: '/favicon.ico',
                    requireInteraction: true
                });
            }
            
            // Vibrate if supported
            if (navigator.vibrate) {
                navigator.vibrate([300, 100, 300]);
            }
            
            // Return to home view and save the session
            const actualWorkTime = isFreeMode ? timeElapsed : session.duration;
            onSessionEnd(actualWorkTime);
        }
    }, [breakTimeLeft, isBreakTime, onSessionEnd, session.duration, isFreeMode, timeElapsed]);

    // Request notification permission on component mount
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('🎯 DeepWork sẵn sàng!', {
                        body: 'Bạn sẽ nhận được thông báo khi phiên làm việc kết thúc',
                        icon: '/favicon.ico'
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

    const handleSkipBreak = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        const actualWorkTime = isFreeMode ? timeElapsed : session.duration;
        onSessionEnd(actualWorkTime);
    };

    const handleSkipTransition = () => {
        setShowTransition(false);
        setIsBreakTime(true);
        setBreakTimeLeft(300);
    };

    const handleStop = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        onStop();
    };
    
    const progress = isBreakTime 
        ? ((300 - breakTimeLeft) / 300) * 100 
        : (isFreeMode 
            ? Math.min((timeElapsed / 1800) * 100, 100) // Cap at 30 minutes for visual purposes
            : ((session.duration - timeLeft) / session.duration) * 100);

    const currentTime = isBreakTime 
        ? breakTimeLeft 
        : (isFreeMode ? timeElapsed : timeLeft);
    
    const bgColor = isBreakTime ? 'bg-green-900' : (isFreeMode ? 'bg-purple-900' : 'bg-slate-900');
    const progressColor = isBreakTime ? 'bg-green-400' : (isFreeMode ? 'bg-purple-400' : 'bg-blue-500');
    const progressBg = isBreakTime ? 'bg-green-700' : (isFreeMode ? 'bg-purple-700' : 'bg-slate-700');
    const buttonBg = isBreakTime ? 'bg-green-800' : (isFreeMode ? 'bg-purple-800' : 'bg-slate-800');
    const textColor = isBreakTime ? 'text-green-300' : (isFreeMode ? 'text-purple-300' : 'text-slate-300');

    // Transition screen when session ends
    if (showTransition) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-green-900 to-blue-900 text-white p-6 animate-pulse">
                <div className="text-9xl mb-8 animate-bounce">🎉</div>
                <h1 className="text-4xl font-bold mb-4 text-center">Tuyệt vời!</h1>
                <p className="text-xl text-center mb-8 text-green-300">
                    Bạn đã hoàn thành phiên làm việc
                </p>
                <div className="text-6xl font-bold mb-8 text-yellow-300">
                    {formatTimer(isFreeMode ? timeElapsed : session.duration)}
                </div>
                <p className="text-lg text-center mb-8 text-blue-200">
                    Chuẩn bị nghỉ ngơi 5 phút...
                </p>
                <button 
                    onClick={handleSkipTransition}
                    className="px-6 py-3 bg-white text-green-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                    ⏭️ Bỏ qua
                </button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center w-full h-full ${bgColor} text-white p-6`}>
            <div className={`w-full h-1 ${progressBg} fixed top-0 left-0`}>
                <div className={`h-1 ${progressColor}`} style={{ width: `${progress}%` }}></div>
            </div>
            
            {isBreakTime ? (
                <>
                    <div className="text-8xl mb-6 animate-bounce">☕</div>
                    <p className={`text-xl font-semibold ${textColor} mb-4 text-center`}>
                        Thời gian nghỉ ngơi
                    </p>
                    <h2 className="text-8xl font-extrabold tracking-tighter mb-8">
                        {formatTimer(currentTime)}
                    </h2>
                    <p className={`${textColor} text-center mb-12 max-w-md`}>
                        Hãy thư giãn, uống nước, hoặc làm các bài tập nhẹ nhàng để phục hồi năng lượng
                    </p>
                </>
            ) : (
                <>
                    {isFreeMode && (
                        <div className="text-6xl mb-4">⏱️</div>
                    )}
                    <p className={`text-xl font-semibold ${textColor} mb-4 text-center`}>
                        {session.task.name}
                        {isFreeMode && <span className="block text-sm mt-1">Chế độ tự do</span>}
                    </p>
                    <h2 className="text-8xl font-extrabold tracking-tighter">
                        {formatTimer(currentTime)}
                    </h2>
                </>
            )}

            <div className="fixed bottom-10 flex space-x-6">
                <button 
                    onClick={() => setIsPaused(!isPaused)} 
                    className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-opacity`}
                    disabled={showTransition}
                >
                    {isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
                </button>
                
                {isBreakTime ? (
                    <button 
                        onClick={handleSkipBreak} 
                        className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-opacity`}
                    >
                        ⏭️ Bỏ qua nghỉ
                    </button>
                ) : isFreeMode ? (
                    <button 
                        onClick={handleFinishFreeMode} 
                        className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-opacity`}
                        disabled={showTransition}
                    >
                        ✅ Kết thúc
                    </button>
                ) : (
                    <button 
                        onClick={handleStop} 
                        className={`text-slate-400 font-semibold py-3 px-6 rounded-lg ${buttonBg} hover:opacity-80 transition-opacity`}
                        disabled={showTransition}
                    >
                        ⏹️ Dừng
                    </button>
                )}
            </div>
        </div>
    );
};

export default FocusView;