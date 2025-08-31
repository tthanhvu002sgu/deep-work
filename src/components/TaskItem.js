// src/components/TaskItem.jsx

import React from 'react';

const TaskItem = ({ task, onClick, onDelete }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
      <div className="flex items-center flex-1" onClick={onClick}>
          <span className="text-2xl mr-3">🎯</span>
          <span className="font-semibold text-slate-700">{task.name}</span>
      </div>
      <div className="flex items-center space-x-2">
          <button 
              onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task);
              }}
              className="bg-red-100 text-red-600 hover:bg-red-200 font-bold py-2 px-3 rounded-lg transition-colors"
              aria-label={`Xóa task ${task.name}`}
          >
              🗑️
          </button>
          <span 
              onClick={onClick}
              className="bg-blue-100 text-blue-700 font-bold py-2 px-4 rounded-lg cursor-pointer hover:bg-blue-200 transition-colors"
          >
              ▶️ Bắt đầu
          </span>
      </div>
  </div>
);

export default TaskItem;