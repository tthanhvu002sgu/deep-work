// src/components/Header.jsx

import React from 'react';
import { formatTime, getFilterText } from '../utils/formatters';
import { getDailyFocusStatus } from '../utils/scienceConfig';
import DailyProgress from './DailyProgress';

const GeneralStats = ({ seconds, filter, todayFocusTime }) => {
  const effectiveTodaySeconds = todayFocusTime !== undefined ? todayFocusTime : seconds;
  const focusStatus = getDailyFocusStatus(effectiveTodaySeconds);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-sm text-gray-600">
        <span className={`font-bold ${filter === 'day' && focusStatus.level === 'max' ? 'text-red-600 underline decoration-2' : 'text-gray-900'}`}>
          {formatTime(seconds)}
        </span>
        {' '}tập trung {getFilterText(filter)}
      </p>

      {filter === 'day' && (
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs transition-all ${focusStatus.badgeClass}`}
          title={focusStatus.warningMessage || focusStatus.label}
        >
          {focusStatus.shortLabel}
        </span>
      )}
    </div>
  );
};

const Header = ({ sessions, filter, dailyTarget, todayFocusTime, onSetTarget, onToggleSidebarMobile }) => {
  const totalFocusSeconds = sessions.reduce((acc, session) => acc + session.duration, 0);

  return (
    <header className="bg-white px-4 sm:px-6 py-3 border-b-2 border-black shrink-0">
      <div className="mx-auto flex items-center justify-between">
        
        {/* Left Side: Mobile Menu Button + Title */}
        <div className="flex items-center gap-3">
          {onToggleSidebarMobile && (
            <button
              onClick={onToggleSidebarMobile}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border-2 border-black bg-white hover:bg-gray-100 text-gray-900 transition shadow-sm"
              aria-label="Mở menu"
              title="Mở menu tiện ích"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-1.5">
            <span className="lg:hidden">⚡</span>
            <span>DeepWork</span>
          </h1>
        </div>

        {/* Right Side: Stats */}
        <div className="flex items-center gap-3 sm:gap-4">
          <GeneralStats seconds={totalFocusSeconds} filter={filter} todayFocusTime={todayFocusTime} />
          <DailyProgress 
            dailyTarget={dailyTarget} 
            todayFocusTime={todayFocusTime} 
            onSetTarget={onSetTarget} 
          />
        </div>
      </div>
    </header>
  );
};

export default Header;