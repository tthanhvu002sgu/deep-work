import { useState, useEffect } from 'react';

const today = () => new Date().toISOString().split('T')[0];

export const DailyTargetModal = ({ currentTarget, onClose, onSetTarget }) => {
    const [target, setTarget] = useState(currentTarget || 60); // Default 60 minutes
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (target > 0) {
            onSetTarget(target);
        }
    };
    
    const presetTargets = [30, 60, 90, 120, 180]; // Minutes
    
    return (
        <div className="modal-container fixed inset-0 z-30 flex items-end show">
            <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl">
                <h3 className="text-lg font-bold mb-3 text-center">🎯 Đặt mục tiêu hôm nay</h3>
                <p className="text-sm text-slate-600 text-center mb-4">
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
                                className={`py-3 text-sm font-semibold rounded-lg transition-colors ${
                                    target === minutes 
                                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {minutes}p
                            </button>
                        ))}
                    </div>
                    
                    {/* Custom Target Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Hoặc nhập tùy chỉnh (phút):
                        </label>
                        <input 
                            type="number" 
                            value={target}
                            onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
                            min="1"
                            max="720" // Max 12 hours
                            className="w-full text-center py-3 text-lg font-semibold rounded-lg bg-slate-100 text-slate-700 border-none focus:ring-2 focus:ring-blue-500" 
                        />
                    </div>
                    
                    {/* Preview */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700 text-center">
                            📊 Mục tiêu: <span className="font-semibold">{target} phút tập trung</span>
                        </p>
                    </div>
                    
                    <div className="flex space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 py-3 font-semibold bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 py-3 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            setDuration(0); // Set to 0 for free mode
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
        if (task) { // Starting an existing task
            onStartSession(task, isFreeMode ? 0 : duration);
        } else { // Adding a new task
            if (!name.trim()) return;
            onAddTask(name.trim());
        }
    };
    
    return (
        <div className="modal-container fixed inset-0 z-30 flex items-end show">
            <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl">
                <h3 className="text-lg font-bold mb-3 text-center">{task ? 'Bắt đầu phiên làm việc' : 'Thêm Task Mới'}</h3>
                <form onSubmit={handleSubmit}>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="✏️ Nhập tên công việc..." 
                      className="w-full text-lg font-semibold border-none focus:ring-0 p-2 mb-3" 
                      required 
                      disabled={!!task}
                    />
                    <div className="flex items-center space-x-2 mb-4">
                        {[25, 50, 90].map(d => (
                            <button 
                                key={d} 
                                type="button" 
                                onClick={() => handleDurationSelect(d)} 
                                className={`duration-btn flex-1 py-2 text-sm font-semibold rounded-lg ${
                                    !isFreeMode && duration === d 
                                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500' 
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {d}p
                            </button>
                        ))}
                        <button 
                            type="button" 
                            onClick={() => handleDurationSelect('free')} 
                            className={`duration-btn flex-1 py-2 text-sm font-semibold rounded-lg ${
                                isFreeMode 
                                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500' 
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                        >
                            ⏱️ Free
                        </button>
                        <input 
                            type="number" 
                            onChange={handleCustomDurationChange} 
                            placeholder="Khác" 
                            className="w-full text-center py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-600 border-none focus:ring-2 focus:ring-blue-500 flex-1" 
                        />
                    </div>
                    {isFreeMode && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700 text-center">
                                📈 Chế độ tự do: Thời gian sẽ đếm lên từ 00:00
                            </p>
                        </div>
                    )}
                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 font-semibold bg-slate-200 text-slate-700 rounded-lg">Hủy</button>
                        <button type="submit" className="flex-1 py-3 font-bold bg-blue-600 text-white rounded-lg">Bắt đầu ✨</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const SessionEndModal = ({ onContinue, onComplete, onPause }) => (
    <div className="modal-container fixed inset-0 z-30 flex items-end show">
        <div className="modal-content w-full bg-white rounded-t-2xl p-4 shadow-2xl text-center">
            <h3 className="text-xl font-bold mb-2">🎉 Phiên hoàn thành!</h3>
            <div className="flex flex-col space-y-2 mt-4">
                <button onClick={onContinue} className="w-full py-3 font-semibold text-white bg-blue-600 rounded-lg">⏭️ Tiếp tục (Nghỉ 5p)</button>
                <button onClick={onComplete} className="w-full py-3 font-semibold text-white bg-green-500 rounded-lg">✅ Xong</button>
                <button onClick={onPause} className="w-full py-3 font-semibold text-slate-700 bg-slate-100 rounded-lg">💤 Tạm dừng</button>
            </div>
        </div>
    </div>
);

export const ConfirmStopModal = ({ onConfirm, onCancel }) => (
    <div className="modal-container fixed inset-0 z-40 flex items-center justify-center p-4 show">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center">
             <h3 className="text-lg font-bold mb-2">Dừng phiên làm việc?</h3>
             <p className="text-sm text-slate-600 mb-6">Tiến trình của phiên này sẽ không được lưu lại.</p>
             <div className="flex space-x-3">
                <button onClick={onCancel} className="flex-1 py-2.5 font-semibold bg-slate-200 text-slate-700 rounded-lg">Hủy</button>
                <button onClick={onConfirm} className="flex-1 py-2.5 font-bold bg-red-500 text-white rounded-lg">Chắc chắn Dừng</button>
             </div>
        </div>
    </div>
);

export const ConfirmDeleteModal = ({ task, onConfirm, onCancel }) => (
    <div className="modal-container fixed inset-0 z-40 flex items-center justify-center p-4 show">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center">
             <h3 className="text-lg font-bold mb-2">Xóa task?</h3>
             <p className="text-sm text-slate-600 mb-2">Bạn có chắc chắn muốn xóa task:</p>
             <p className="text-sm font-semibold text-slate-800 mb-4">"{task?.name}"</p>
             <p className="text-xs text-slate-500 mb-6">Tất cả dữ liệu phiên làm việc liên quan sẽ bị xóa vĩnh viễn.</p>
             <div className="flex space-x-3">
                <button onClick={onCancel} className="flex-1 py-2.5 font-semibold bg-slate-200 text-slate-700 rounded-lg">Hủy</button>
                <button onClick={onConfirm} className="flex-1 py-2.5 font-bold bg-red-500 text-white rounded-lg">Xóa</button>
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
                    className="flex-1 py-2.5 font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Thử lại
                </button>
                <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 font-semibold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                    Đóng
                </button>
            </div>
        </div>
    </div>
);