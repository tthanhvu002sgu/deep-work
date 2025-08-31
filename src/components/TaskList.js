import React from 'react';
import TaskItem from './TaskItem';

const TaskList = ({ tasks, onTaskClick, onTaskDelete }) => {
    return (
        <main className="flex-grow overflow-y-auto px-4 pb-24">
            <div className="space-y-3">
                {tasks.length > 0 ? (
                    tasks.map(task => (
                        <TaskItem 
                            key={task.id} 
                            task={task} 
                            onClick={() => onTaskClick(task)}
                            onDelete={onTaskDelete}
                        />
                    ))
                ) : (
                    <p className="text-center text-slate-500 py-10">Bắt đầu ngày làm việc của bạn bằng cách thêm một task mới ✨</p>
                )}
            </div>
        </main>
    );
};

export default TaskList;