// src/components/Header.jsx

import React from 'react';
import { formatTime, getFilterText } from '../utils/formatters';
import DailyProgress from './DailyProgress';

const GeneralStats = ({ seconds, filter }) => (
  <p className="text-sm text-gray-600">
    <span className="font-bold text-gray-900">{formatTime(seconds)}</span>
    {' '}tập trung {getFilterText(filter)}
  </p>
);

const Header = ({ sessions, filter, dailyTarget, todayFocusTime, onSetTarget }) => {
  const totalFocusSeconds = sessions.reduce((acc, session) => acc + session.duration, 0);

  return (
    <header className="bg-white px-4 sm:px-6 py-3 border-b-2 border-black">
      <div className="mx-auto flex items-center justify-between">
        
        {/* Left Side: Title */}
        <h1 className="text-xl font-bold text-gray-900">
          DeepWork
        </h1>

        {/* Right Side: Stats */}
        <div className="flex items-center gap-4">
          <GeneralStats seconds={totalFocusSeconds} filter={filter} />
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