// src/components/DailyProgress.jsx

import React from 'react';
import { formatTime } from '../utils/formatters';

const DailyProgress = ({ dailyTarget, todayFocusTime, onSetTarget }) => {
  // Giao diện tối giản khi chưa có mục tiêu
  if (!dailyTarget || dailyTarget <= 0) {
    return (
      <button
        onClick={onSetTarget}
        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 border-2 border-black bg-white hover:bg-gray-100 transition-colors rounded-md"
      >
        <span>+</span>
        <span>Đặt mục tiêu</span>
      </button>
    );
  }

  const progress = Math.min((todayFocusTime / dailyTarget) * 100, 100);
  const isTargetCompleted = todayFocusTime >= dailyTarget;

  // Giao diện hiển thị tiến độ
  return (
    <div className="w-64">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-gray-600">
          {formatTime(todayFocusTime)} / {formatTime(dailyTarget)}
        </span>
        <span className="font-bold text-gray-900">
          {Math.round(progress)}%
        </span>
      </div>
      <div 
        className="wire-progress-hatch h-2 cursor-pointer" 
        onClick={onSetTarget}
        title="Nhấn để thay đổi mục tiêu"
      >
        <div 
          className={`h-full transition-all duration-500 ${
            isTargetCompleted 
              ? 'bg-black' 
              : 'progress-fill'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default DailyProgress;