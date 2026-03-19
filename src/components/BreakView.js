import { useState, useEffect } from 'react';

const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const BreakView = ({ duration = 300, onBreakEnd }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        console.log("BreakView rendered! timeLeft:", timeLeft);
    });

    useEffect(() => {
        console.log("BreakView timer effect initialized");
        if (isPaused) return;

        const timer = setInterval(() => {
            console.log("BreakView interval tick");
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onBreakEnd();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPaused, onBreakEnd]);

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