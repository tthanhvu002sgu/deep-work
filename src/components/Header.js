// src/components/Header.jsx

import React from 'react';

// Hàm định dạng thời gian từ giây sang giờ, phút
const formatTime = (seconds) => {
  if (!seconds || seconds < 60) return `${seconds || 0} giây`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  let str = '';
  if (h > 0) str += `${h} giờ `;
  if (m > 0) str += `${m} phút`;
  return str.trim();
};

// Hàm lấy văn bản tương ứng với bộ lọc
const getFilterText = (filter) => {
  if (filter === 'day') return 'hôm nay';
  if (filter === 'week') return 'tuần này';
  if (filter === 'month') return 'tháng này';
  return '';
}

const Header = ({ sessions, filter, dailyTarget, todayFocusTime, onSetTarget }) => {
  // Tính toán tổng thời gian tập trung từ sessions được filter
  const totalFocusSeconds = sessions.reduce((acc, session) => acc + session.duration, 0);
  
  // Tính progress nếu có target (chỉ cho filter 'day')
  const progress = (filter === 'day' && dailyTarget > 0) 
    ? Math.min((todayFocusTime / dailyTarget) * 100, 100) 
    : 0;
  
  const isTargetCompleted = filter === 'day' && dailyTarget > 0 && todayFocusTime >= dailyTarget;

  return (
    <header className="p-4 pt-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            Tổng quan
            {isTargetCompleted && (
              <span className="ml-2 text-2xl animate-bounce">🎉</span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            ⏱️ Đã tập trung được {formatTime(totalFocusSeconds)} {getFilterText(filter)}
          </p>
          
          {/* Daily Target Section - Only show on 'day' filter */}
          {filter === 'day' && (
            <div className="mt-3">
              {dailyTarget > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">
                      Mục tiêu hôm nay: {formatTime(dailyTarget)}
                    </span>
                    <button 
                      onClick={onSetTarget}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Thay đổi
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        isTargetCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isTargetCompleted ? 'text-green-600' : 'text-slate-600'}`}>
                      {formatTime(todayFocusTime)} / {formatTime(dailyTarget)}
                    </span>
                    <span className={`font-bold ${isTargetCompleted ? 'text-green-600' : 'text-slate-600'}`}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  
                  {isTargetCompleted && (
                    <div className="text-center py-2">
                      <span className="text-green-600 font-semibold text-sm">
                        🎯 Chúc mừng! Bạn đã hoàn thành mục tiêu hôm nay!
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={onSetTarget}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                >
                  🎯 Đặt mục tiêu cho hôm nay
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;