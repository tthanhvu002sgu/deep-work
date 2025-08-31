import { useState, useEffect, useRef } from 'react';

const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const BreakView = ({ duration, onBreakEnd, onSkipBreak }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isPaused, setIsPaused] = useState(false);
    const timerRef = useRef(null);
    
    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (!isPaused) {
                setTimeLeft(prev => prev - 1);
            }
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [isPaused]);

    useEffect(() => {
        if (timeLeft <= 0) {
            clearInterval(timerRef.current);
            onBreakEnd();
        }
    }, [timeLeft, onBreakEnd]);
    
    const progress = ((duration - timeLeft) / duration) * 100;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-green-900 text-white p-6">
            <div className="w-full h-1 bg-green-700 fixed top-0 left-0">
                <div className="h-1 bg-green-400" style={{ width: `${progress}%` }}></div>
            </div>
            
            <div className="text-8xl mb-6">☕</div>
            
            <p className="text-xl font-semibold text-green-300 mb-4 text-center">
                Thời gian nghỉ ngơi
            </p>
            
            <h2 className="text-8xl font-extrabold tracking-tighter mb-8">
                {formatTimer(timeLeft)}
            </h2>

            <p className="text-green-300 text-center mb-12 max-w-md">
                Hãy thư giãn, uống nước, hoặc làm các bài tập nhẹ nhàng để phục hồi năng lượng
            </p>

            <div className="fixed bottom-10 flex space-x-6">
                <button 
                    onClick={() => setIsPaused(!isPaused)} 
                    className="text-green-400 font-semibold py-3 px-6 rounded-lg bg-green-800 hover:bg-green-700 transition-colors"
                >
                    {isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
                </button>
                <button 
                    onClick={onBreakEnd} 
                    className="text-green-400 font-semibold py-3 px-6 rounded-lg bg-green-800 hover:bg-green-700 transition-colors"
                >
                    ⏭️ Bỏ qua nghỉ
                </button>
                <button 
                    onClick={onSkipBreak} 
                    className="text-green-400 font-semibold py-3 px-6 rounded-lg bg-green-800 hover:bg-green-700 transition-colors"
                >
                    🏠 Về trang chính
                </button>
            </div>
        </div>
    );
};

export default BreakView;