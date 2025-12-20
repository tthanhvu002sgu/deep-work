import { useState, useEffect } from 'react';

const today = () => new Date().toISOString().split('T')[0];

export const DailyTargetModal = ({ currentTarget, onClose, onSetTarget }) => {
    const [target, setTarget] = useState(currentTarget || 60);
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (target > 0) {
            onSetTarget(target);
        }
    };
    
    const presetTargets = [30, 60, 90, 120, 180];
    
    return (
        <div className="modal-container fixed inset-0 z-30 flex items-end show">
            <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl border-t-2 border-x-2 border-black">
                <h3 className="text-lg font-bold mb-3 text-center text-gray-900">🎯 Đặt mục tiêu hôm nay</h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                    Đặt mục tiêu thời gian tập trung cho ngày hôm nay
                </p>
                
                <form onSubmit={handleSubmit}>
                    {/* Preset Targets */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {presetTargets.map(minutes => (
                            <button 
                                key={minutes} 
                                type="button" 
                                onClick={() => setTarget(minutes)} 
                                className={`py-3 text-sm font-semibold rounded-lg transition-colors border-2 ${
                                    target === minutes 
                                        ? 'border-black bg-black text-white' 
                                        : 'border-black bg-white text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {minutes}p
                            </button>
                        ))}
                    </div>
                    
                    {/* Custom Target Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hoặc nhập tùy chỉnh (phút):
                        </label>
                        <input 
                            type="number" 
                            value={target}
                            onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                            max="720"
                            className="w-full text-center py-3 text-lg font-semibold rounded-lg bg-white text-gray-900 border-2 border-black focus:ring-2 focus:ring-gray-400" 
                        />
                    </div>
                    
                    {/* Preview */}
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg border-2 border-black">
                        <p className="text-sm text-gray-700 text-center">
                            📊 Mục tiêu: <span className="font-semibold">{target} phút tập trung</span>
                        </p>
                    </div>
                    
                    <div className="flex space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 py-3 font-semibold rounded-lg transition-colors border-2 border-black bg-white text-gray-900 hover:bg-gray-100"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 font-bold rounded-lg border-2 border-black bg-black text-white hover:bg-gray-800 transition-colors"
                        >
                            Đặt mục tiêu 🎯
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const TaskModal = ({ task, onClose, onStartSession, onAddTask }) => {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState(25);
    const [isFreeMode, setIsFreeMode] = useState(false);
    
    useEffect(() => {
        if (task) {
            setName(task.name);
            setDuration(task.defaultDuration || 25);
            setIsFreeMode(false);
        }
    }, [task]);

    const handleDurationSelect = (d) => {
        if (d === 'free') {
            setIsFreeMode(true);
            setDuration(0);
        } else {
            setIsFreeMode(false);
            setDuration(d);
        }
    };

    const handleCustomDurationChange = (e) => {
        const value = Number(e.target.value);
        setDuration(value);
        setIsFreeMode(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (task) {
            onStartSession(task, isFreeMode ? 0 : duration);
        } else {
            if (!name.trim()) return;
            onAddTask(name.trim());
        }
    };
    
    return (
        <div className="modal-container fixed inset-0 z-30 flex items-end show">
            <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl border-t-2 border-x-2 border-black">
                <h3 className="text-lg font-bold mb-3 text-center text-gray-900">{task ? 'Bắt đầu phiên làm việc' : 'Thêm Task Mới'}</h3>
                <form onSubmit={handleSubmit}>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="✏️ Nhập tên công việc..." 
                      className="w-full text-lg font-semibold border-2 border-black focus:ring-2 focus:ring-gray-400 p-2 mb-3 rounded-lg" 
                      required 
                      disabled={!!task}
                    />
                    <div className="flex items-center space-x-2 mb-4">
                        {[25, 50, 90].map(d => (
                            <button 
                                key={d} 
                                type="button" 
                                onClick={() => handleDurationSelect(d)} 
                                className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
                                    !isFreeMode && duration === d 
                                        ? 'border-black bg-black text-white' 
                                        : 'border-black bg-white text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {d}p
                            </button>
                        ))}
                        <button 
                            type="button" 
                            onClick={() => handleDurationSelect('free')} 
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
                                isFreeMode 
                                    ? 'border-black bg-black text-white' 
                                    : 'border-black bg-white text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            ⏱️ Free
                        </button>
                        <input 
                            type="number" 
                            onChange={handleCustomDurationChange} 
                            placeholder="Khác" 
                            className="w-full text-center py-2 text-sm font-semibold rounded-lg bg-white text-gray-900 border-2 border-black focus:ring-2 focus:ring-gray-400 flex-1" 
                        />
                    </div>
                    {isFreeMode && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-lg border-2 border-black">
                            <p className="text-sm text-gray-700 text-center">
                                📈 Chế độ tự do: Thời gian sẽ đếm lên từ 00:00
                            </p>
                        </div>
                    )}
                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold rounded-lg border-2 border-black bg-white text-gray-900 hover:bg-gray-100 transition-colors">Hủy</button>
                        <button type="submit" className="flex-1 py-3 font-bold rounded-lg border-2 border-black bg-black text-white hover:bg-gray-800 transition-colors">Bắt đầu ✨</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const SessionEndModal = ({ onContinue, onComplete, onPause }) => (
    <div className="modal-container fixed inset-0 z-30 flex items-end show">
        <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl text-center border-t-2 border-x-2 border-black">
            <h3 className="text-xl font-bold mb-2 text-gray-900">🎉 Phiên hoàn thành!</h3>
            <div className="flex flex-col space-y-2 mt-4">
                <button onClick={onContinue} className="w-full py-3 font-semibold text-white bg-black rounded-lg border-2 border-black hover:bg-gray-800 transition-colors">⏭️ Tiếp tục (Nghỉ 5p)</button>
                <button onClick={onComplete} className="w-full py-3 font-semibold text-gray-900 bg-white rounded-lg border-2 border-black hover:bg-gray-100 transition-colors">✅ Xong</button>
                <button onClick={onPause} className="w-full py-3 font-semibold text-gray-700 bg-gray-100 rounded-lg border-2 border-black hover:bg-gray-200 transition-colors">💤 Tạm dừng</button>
            </div>
        </div>
    </div>
);

export const ConfirmStopModal = ({ onConfirm, onCancel }) => (
    <div className="modal-container fixed inset-0 z-40 flex items-center justify-center p-4 show">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center border-2 border-black">
             <h3 className="text-lg font-bold mb-2 text-gray-900">Dừng phiên làm việc?</h3>
             <p className="text-sm text-gray-600 mb-6">Tiến trình của phiên này sẽ không được lưu lại.</p>
             <div className="flex space-x-3">
                <button onClick={onCancel} className="flex-1 py-2.5 font-semibold rounded-lg border-2 border-black bg-white text-gray-900 hover:bg-gray-100 transition-colors">Hủy</button>
                <button onClick={onConfirm} className="flex-1 py-2.5 font-bold rounded-lg border-2 border-black bg-black text-white hover:bg-gray-800 transition-colors">Chắc chắn Dừng</button>
             </div>
        </div>
    </div>
);

export const ConfirmDeleteModal = ({ task, onConfirm, onCancel }) => (
    <div className="modal-container fixed inset-0 z-40 flex items-center justify-center p-4 show">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center border-2 border-black">
             <h3 className="text-lg font-bold mb-2 text-gray-900">Xóa task?</h3>
             <p className="text-sm text-gray-600 mb-2">Bạn có chắc chắn muốn xóa task:</p>
             <p className="text-sm font-semibold text-slate-800 mb-4">"{task?.name}"</p>
             <p className="text-xs text-gray-500 mb-6">Tất cả dữ liệu phiên làm việc liên quan sẽ bị xóa vĩnh viễn.</p>
             <div className="flex space-x-3">
                <button onClick={onCancel} className="flex-1 py-2.5 font-semibold rounded-lg border-2 border-black bg-white text-gray-900 hover:bg-gray-100 transition-colors">Hủy</button>
                <button onClick={onConfirm} className="flex-1 py-2.5 font-bold rounded-lg border-2 border-black bg-red-500 text-white hover:bg-red-600 transition-colors">Xóa</button>
             </div>
        </div>
    </div>
);

export const LoadingModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg font-medium">Đang đồng bộ dữ liệu...</span>
            </div>
        </div>
    </div>
);

export const ErrorModal = ({ error, onClose, onRetry }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Lỗi</h3>
            <p className="text-sm text-gray-600 mb-4">{error || 'Đã có lỗi xảy ra'}</p>
            <div className="flex space-x-3">
                <button 
                    onClick={onRetry}
                    className="flex-1 py-2.5 font-semibold rounded-lg border-2 border-black bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    Thử lại
                </button>
                <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 font-semibold rounded-lg border-2 border-black bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                    Đóng
                </button>
            </div>
        </div>
    </div>
);

// NEW: Daily Summary Modal
export const DailySummaryModal = ({ date, sessions, tasks, dailyTarget, onClose }) => {
    const totalMinutes = Math.round(sessions.reduce((acc, s) => acc + s.duration, 0) / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    
    const targetAchieved = dailyTarget > 0 && totalMinutes >= dailyTarget;
    const completionRate = dailyTarget > 0 ? Math.min(100, Math.round((totalMinutes / dailyTarget) * 100)) : 0;

    // Top task
    const taskDurations = sessions.reduce((acc, s) => {
        acc[s.taskId] = (acc[s.taskId] || 0) + s.duration;
        return acc;
    }, {});
    
    const topTaskId = Object.keys(taskDurations).length > 0 
        ? Object.keys(taskDurations).reduce((a, b) => 
            taskDurations[a] > taskDurations[b] ? a : b
        ) 
        : null;
    
    const topTask = topTaskId ? tasks.find(t => t.id === Number(topTaskId)) : null;
    const topTaskMinutes = topTaskId ? Math.round(taskDurations[topTaskId] / 60) : 0;

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-3">
                        {targetAchieved ? '🎉' : sessions.length > 0 ? '📊' : '😴'}
                    </div>
                    <h3 className="text-2xl font-bold mb-1">
                        {targetAchieved ? 'Xuất sắc!' : sessions.length > 0 ? 'Tổng kết ngày' : 'Ngày nghỉ ngơi'}
                    </h3>
                    <p className="text-sm text-gray-600">{formatDate(date)}</p>
                </div>

                {/* Stats */}
                {sessions.length > 0 ? (
                    <div className="space-y-4 mb-6">
                        {/* Total Time */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                            <div className="text-sm text-gray-600 mb-1">⏱️ Tổng thời gian tập trung</div>
                            <div className="text-3xl font-bold text-blue-600">
                                {totalHours > 0 ? `${totalHours}h ${remainingMinutes}p` : `${totalMinutes}p`}
                            </div>
                        </div>

                        {/* Target Progress */}
                        {dailyTarget > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-600">🎯 Mục tiêu hôm nay</span>
                                    <span className={`text-sm font-semibold ${targetAchieved ? 'text-green-600' : 'text-orange-600'}`}>
                                        {completionRate}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-2 transition-all duration-500 ${targetAchieved ? 'bg-green-500' : 'bg-orange-500'}`}
                                        style={{ width: `${Math.min(completionRate, 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {totalMinutes} / {dailyTarget} phút
                                </div>
                            </div>
                        )}

                        {/* Sessions Count */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600">{sessions.length}</div>
                                <div className="text-xs text-gray-600">Phiên hoàn thành</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {new Set(sessions.map(s => s.taskId)).size}
                                </div>
                                <div className="text-xs text-gray-600">Tasks khác nhau</div>
                            </div>
                        </div>

                        {/* Top Task */}
                        {topTask && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="text-xs text-gray-600 mb-1">🏆 Task nổi bật nhất</div>
                                <div className="font-semibold text-gray-800">{topTask.name}</div>
                                <div className="text-sm text-gray-600">{topTaskMinutes} phút</div>
                            </div>
                        )}

                        {/* Achievement Message */}
                        <div className="text-center p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white">
                            <p className="text-sm font-medium">
                                {targetAchieved 
                                    ? '🌟 Bạn đã hoàn thành mục tiêu hôm nay! Tuyệt vời!' 
                                    : completionRate >= 75
                                        ? '💪 Chỉ còn chút nữa thôi! Cố lên!'
                                        : sessions.length > 0
                                            ? '👍 Mỗi bước nhỏ đều quan trọng. Ngày mai cố gắng hơn nhé!'
                                            : '🎯 Hãy đặt mục tiêu cho ngày mai!'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 mb-6">
                        <p className="text-gray-500 mb-2">Hôm nay bạn chưa hoàn thành phiên nào</p>
                        <p className="text-sm text-gray-400">Nghỉ ngơi cũng rất quan trọng! 💤</p>
                    </div>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};

// NEW: Edit Task Modal
export const EditTaskModal = ({ task, onClose, onSave }) => {
    const [name, setName] = useState(task?.name || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        try {
            await onSave(task.id, { name: name.trim() });
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-container fixed inset-0 z-30 flex items-end show">
            <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl">
                <h3 className="text-lg font-bold mb-3 text-center">✏️ Chỉnh sửa Task</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Tên task:
                        </label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nhập tên task..." 
                            className="w-full text-lg font-semibold border-2 border-black focus:ring-2 focus:ring-gray-400 focus:border-transparent rounded-lg p-3" 
                            required 
                            autoFocus
                            disabled={isSaving}
                        />
                    </div>
                    
                    <div className="flex space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 py-3 font-semibold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                            disabled={isSaving}
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                            disabled={isSaving || !name.trim()}
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu ✅'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// NEW: Confirm Archive/Unarchive Modal
export const ConfirmArchiveModal = ({ task, onConfirm, onCancel }) => (
    <div className="modal-container fixed inset-0 z-40 flex items-center justify-center p-4 show">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center border-2 border-black">
            <h3 className="text-lg font-bold mb-2 text-gray-900">
                {task?.isArchived ? '📤 Hiện task?' : '📦 Ẩn task?'}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
                {task?.isArchived 
                    ? 'Task sẽ hiển thị trở lại trong danh sách:'
                    : 'Task sẽ được ẩn khỏi danh sách:'}
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-4">"{task?.name}"</p>
            <p className="text-xs text-gray-500 mb-6">
                {task?.isArchived 
                    ? 'Tất cả dữ liệu vẫn được giữ nguyên.'
                    : 'Tất cả dữ liệu phiên làm việc vẫn được giữ nguyên. Bạn có thể hiện lại task bất kỳ lúc nào.'}
            </p>
            <div className="flex space-x-3">
                <button 
                    onClick={onCancel} 
                    className="flex-1 py-2.5 font-semibold rounded-lg border-2 border-black bg-white text-gray-900 hover:bg-gray-100 transition-colors"
                >
                    Hủy
                </button>
                <button 
                    onClick={onConfirm} 
                    className={`flex-1 py-2.5 font-bold text-white rounded-lg border-2 border-black transition-colors ${
                        task?.isArchived 
                            ? 'bg-black hover:bg-gray-800' 
                            : 'bg-gray-700 hover:bg-gray-800'
                    }`}
                >
                    {task?.isArchived ? 'Hiện' : 'Ẩn'}
                </button>
            </div>
        </div>
    </div>
);

// NEW: Archived Tasks Modal
export const ArchivedTasksModal = ({ tasks, onClose, onUnarchive, onDelete }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-black">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                <h3 className="text-xl font-bold text-gray-900">📦 Tasks đã ẩn</h3>
                <button 
                    onClick={onClose} 
                    className="text-2xl font-bold text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>
            
            <div className="space-y-3">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 border-2 border-black rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <span className="font-bold text-gray-900 flex-1">{task.name}</span>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => onUnarchive(task)} 
                                className="p-2 border-2 border-black rounded-lg bg-white hover:bg-green-50 transition-colors font-bold"
                                title="Hiện lại task"
                            >
                                📤
                            </button>
                            <button 
                                onClick={() => onDelete(task)} 
                                className="p-2 border-2 border-black rounded-lg bg-white hover:bg-red-50 transition-colors font-bold"
                                title="Xóa vĩnh viễn"
                            >
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
                
                {tasks.length === 0 && (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-2">📝</div>
                        <p className="text-gray-500">Không có tasks nào đã ẩn</p>
                    </div>
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t-2 border-black">
                <button
                    onClick={onClose}
                    className="w-full py-3 font-bold bg-black text-white rounded-lg border-2 border-black hover:bg-gray-800 transition-colors"
                >
                    Đóng
                </button>
            </div>
        </div>
    </div>
);