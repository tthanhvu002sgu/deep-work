// src/components/Header.jsx

import React from 'react';
import { formatTime, getFilterText } from '../utils/formatters';
import DailyProgress from './DailyProgress';

const GeneralStats = ({ seconds, filter }) => (
  <p className="text-sm text-slate-600">
    <span className="font-bold text-slate-800">{formatTime(seconds)}</span>
    {' '}tập trung {getFilterText(filter)}
  </p>
);

const Header = ({ sessions, filter, dailyTarget, todayFocusTime, onSetTarget }) => {
  const totalFocusSeconds = sessions.reduce((acc, session) => acc + session.duration, 0);

  return (
    <header className="bg-white px-4 sm:px-6 py-3 border-b border-slate-200 shadow-sm">
      <div className="mx-auto flex items-center justify-between">
        
        {/* Left Side: Title */}
        <h1 className="text-xl font-bold text-slate-800">
          DeepWork
        </h1>

        {/* Right Side: Stats */}
        <div className="flex items-center gap-4">
          {filter === 'day' ? (
            <DailyProgress
              dailyTarget={dailyTarget}
              todayFocusTime={todayFocusTime}
              onSetTarget={onSetTarget}
            />
          ) : (
            <GeneralStats seconds={totalFocusSeconds} filter={filter} />
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;