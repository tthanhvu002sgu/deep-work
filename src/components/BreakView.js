import { useState, useEffect, useRef, useCallback } from 'react';

const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const BreakView = ({ duration = 300, onBreakEnd }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isPaused, setIsPaused] = useState(false);

    const targetEndTimeRef = useRef(Date.now() + duration * 1000);
    const pausedAtRef = useRef(null);
    const isProcessingEndRef = useRef(false);
    const onBreakEndRef = useRef(onBreakEnd);

    // Luôn cập nhật ref khi onBreakEnd thay đổi (tránh stale closure)
    useEffect(() => {
        onBreakEndRef.current = onBreakEnd;
    }, [onBreakEnd]);

    // Hàm tính toán và cập nhật thời gian còn lại
    const syncTime = useCallback(() => {
        if (isProcessingEndRef.current) return;

        const now = Date.now();
        const remainingMs = targetEndTimeRef.current - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

        setTimeLeft(remainingSec);

        if (remainingSec <= 0 && !isProcessingEndRef.current) {
            isProcessingEndRef.current = true;
            console.log('⏰ Break timer kết thúc!');
            onBreakEndRef.current();
        }
    }, []);

    // Xử lý khi pause/resume để cộng dồn thời gian
    useEffect(() => {
        if (isPaused) {
            pausedAtRef.current = Date.now();
        } else if (pausedAtRef.current !== null) {
            const pauseDuration = Date.now() - pausedAtRef.current;
            targetEndTimeRef.current += pauseDuration;
            pausedAtRef.current = null;
        }
    }, [isPaused]);

    // Timer chính - dùng interval 250ms để bắt kịp nhanh hơn khi tab bị throttle
    useEffect(() => {
        if (isPaused) return;

        // Sync ngay lập tức khi effect chạy
        syncTime();

        const timer = setInterval(syncTime, 250);

        return () => clearInterval(timer);
    }, [isPaused, syncTime]);

    // Lắng nghe visibilitychange - khi user quay lại tab, sync ngay lập tức
    useEffect(() => {
        if (isPaused) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('👁️ Tab trở lại visible - đồng bộ timer ngay!');
                syncTime();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isPaused, syncTime]);

    // Fallback: dùng setTimeout chain thay cho setInterval để tránh drift
    // Khi tab bị background, setTimeout cũng bị throttle nhưng ít nhất
    // khi nó chạy lại thì sẽ tính đúng thời gian thực
    useEffect(() => {
        if (isPaused) return;

        // Tạo Web Worker inline để chạy timer trong background
        // Web Worker KHÔNG bị browser throttle khi tab bị ẩn
        const workerCode = `
            let timerId = null;
            self.onmessage = function(e) {
                if (e.data === 'start') {
                    if (timerId) clearInterval(timerId);
                    timerId = setInterval(() => {
                        self.postMessage('tick');
                    }, 1000);
                } else if (e.data === 'stop') {
                    if (timerId) clearInterval(timerId);
                    timerId = null;
                }
            };
        `;

        let worker = null;
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            worker = new Worker(workerUrl);

            worker.onmessage = () => {
                syncTime();
            };

            worker.postMessage('start');
            URL.revokeObjectURL(workerUrl);

            console.log('🔧 Web Worker timer đã khởi tạo thành công');
        } catch (err) {
            console.warn('⚠️ Không thể tạo Web Worker timer:', err);
            // Fallback: không cần làm gì thêm vì đã có setInterval ở trên
        }

        return () => {
            if (worker) {
                worker.postMessage('stop');
                worker.terminate();
            }
        };
    }, [isPaused, syncTime]);

    const progress = ((duration - timeLeft) / duration) * 100;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-green-900 text-white p-6 relative overflow-hidden">
            {/* Progress bar */}
            <div className={`w-full h-2 bg-green-700 fixed top-0 left-0 shadow-lg`}>
                <div
                    className={`h-2 bg-green-400 transition-all duration-1000 ease-linear relative overflow-hidden`}
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
            </div>

            <div className="text-6xl mb-4 animate-bounce">☕</div>
            <p className="text-xl font-semibold text-green-300 mb-4 text-center">
                Thời gian nghỉ ngơi
            </p>

            <div className="relative mb-12">
                <h2 className="text-8xl font-extrabold tracking-tighter relative z-10">
                    {formatTimer(timeLeft)}
                </h2>
                <div className="absolute inset-0 text-8xl font-extrabold tracking-tighter opacity-10 blur-sm">
                    {formatTimer(timeLeft)}
                </div>
            </div>

            <div className="fixed bottom-10 flex space-x-6">
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="text-green-100 font-semibold py-3 px-6 rounded-lg bg-green-800 hover:opacity-80 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm"
                >
                    {isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
                </button>

                <button
                    onClick={onBreakEnd}
                    className="text-white font-semibold py-3 px-6 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg backdrop-blur-sm"
                >
                    ⏩ Bỏ qua & Kết thúc
                </button>
            </div>
        </div>
    );
};

export default BreakView;