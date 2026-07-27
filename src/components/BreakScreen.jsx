// src/components/BreakScreen.jsx

import React, { useState, useEffect } from "react";

const BreakScreen = ({ 
  duration = 300, 
  message, 
  icon = "☕", 
  label = "Giải lao", 
  onComplete 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    // Calculate the absolute end time based on Date.now()
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
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border-2 border-black">
        <div className="text-5xl mb-2">{icon}</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Nghỉ giải lao</h2>
        <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-4">
          {label ? `Sau phiên ${label}` : 'Phục hồi nhận thức'}
        </p>
        
        {/* Dynamic Science Break Message */}
        <div className="bg-purple-50 p-4 rounded-2xl mb-6 border border-purple-200 text-sm text-purple-900 leading-relaxed font-medium shadow-sm">
          {message || 'Thư giãn mắt, đứng dậy đi dạo, uống nước và rời mắt khỏi màn hình hoàn toàn!'}
        </div>

        {/* Circular Countdown Timer */}
        <div className="relative w-48 h-48 mx-auto mb-6">
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
              stroke="#8b5cf6"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono text-slate-800 tracking-wider">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs text-slate-500 font-medium mt-1">thời gian nghỉ</span>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors active:scale-95 transform border-2 border-black"
        >
          Bỏ qua nghỉ ngơi & Tiếp tục làm việc
        </button>
      </div>
    </div>
  );
};

export default BreakScreen;
