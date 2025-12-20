// src/components/TaskItem.jsx

import React from 'react';

const TaskItem = ({ task, onClick, onEdit, onArchive, onDelete }) => (
    <div className="wire-card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center flex-1 cursor-pointer" onClick={onClick}>
            <span className="text-2xl mr-3">🎯</span>
            <span className="font-semibold text-gray-900">{task.name}</span>
        </div>
        <div className="flex items-center space-x-2">
            {/* Edit Button */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                }}
                className="wire-btn-outline py-2 px-3 rounded-md text-sm"
                aria-label={`Chỉnh sửa task ${task.name}`}
                title="Chỉnh sửa"
            >
                ✏️
            </button>

            {/* Archive Button */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onArchive(task);
                }}
                className="wire-btn-outline py-2 px-3 rounded-md text-sm"
                aria-label={`Ẩn task ${task.name}`}
                title="Ẩn task"
            >
                📦
            </button>

            {/* Delete Button */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task);
                }}
                className="wire-btn-outline py-2 px-3 rounded-md text-sm"
                aria-label={`Xóa task ${task.name}`}
                title="Xóa vĩnh viễn"
            >
                🗑️
            </button>

            {/* Start Button */}
            <span 
                onClick={onClick}
                className="wire-btn-primary py-2 px-4 rounded-md cursor-pointer text-sm font-semibold"
            >
                ▶️ Bắt đầu
            </span>
        </div>
    </div>
);

export default TaskItem;