// src/components/DailyProgress.jsx

import React from 'react';
import { formatTime } from '../utils/formatters';

const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const DailyProgress = ({ dailyTarget, todayFocusTime, onSetTarget }) => {
  // Giao diện tối giản khi chưa có mục tiêu
  if (!dailyTarget || dailyTarget <= 0) {
    return (
      <button
        onClick={onSetTarget}
        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
      >
        <Icon path="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        <span className="text-slate-600">
          {formatTime(todayFocusTime)} / {formatTime(dailyTarget)}
        </span>
        <span className={`font-bold ${isTargetCompleted ? 'text-green-600' : 'text-indigo-600'}`}>
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${isTargetCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default DailyProgress;