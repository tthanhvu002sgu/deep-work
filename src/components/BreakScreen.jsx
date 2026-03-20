import React, { useState, useEffect } from "react";

const BreakScreen = ({ duration = 300, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    // Calculate the absolute end time based on Date.now()
    // This solves the issue of timers slowing down when the browser tab is backgrounded
    const endTime = Date.now() + duration * 1000;

    const intervalId = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(intervalId);
        if (onComplete) onComplete();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [duration, onComplete]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="flex-1 min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Giải lao</h2>
        <p className="text-slate-500 mb-8">Thư giãn mắt một chút nhé!</p>
        
        <div className="relative w-56 h-56 mx-auto mb-10">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="#3b82f6"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
            <span className="text-5xl font-bold font-mono text-slate-800 tracking-wider">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors active:scale-95 transform"
        >
          Bỏ qua nghỉ ngơi
        </button>
      </div>
    </div>
  );
};

export default BreakScreen;
