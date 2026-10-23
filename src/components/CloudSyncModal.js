// src/components/CloudSyncModal.js
import React, { useState, useEffect } from 'react';
import firebaseSyncService from '../services/firebaseSyncService';
import { 
  saveCustomFirebaseConfig, 
  clearCustomFirebaseConfig, 
  isFirebaseConfigured 
} from '../services/firebase';

export const CloudSyncModal = ({ onClose, onSuccess }) => {
  const [currentUser, setCurrentUser] = useState(firebaseSyncService.getCurrentUser());
  const [isConfigured, setIsConfigured] = useState(isFirebaseConfigured());
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [configInput, setConfigInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // 24h auto sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(firebaseSyncService.isAutoSyncEnabled());
  const [lastSyncTime, setLastSyncTime] = useState(firebaseSyncService.getLastSyncTimestamp());

  useEffect(() => {
    // Lắng nghe thay đổi trạng thái đăng nhập hoặc cấu hình
    const unsubscribe = firebaseSyncService.subscribe((event) => {
      if (event.type === 'AUTH_STATE_CHANGED') {
        setCurrentUser(event.user);
      } else if (event.type === 'SYNC_SUCCESS') {
        setLastSyncTime(event.result.timestamp);
        setMessage({
          type: 'success',
          text: `Đồng bộ thành công! (${event.result.tasksCount} tasks, ${event.result.sessionsCount} phiên)`
        });
        if (onSuccess) onSuccess();
      } else if (event.type === 'SYNC_ERROR') {
        setMessage({
          type: 'error',
          text: `Lỗi đồng bộ: ${event.error?.message || 'Không xác định'}`
        });
      }
    });

    return () => unsubscribe();
  }, [onSuccess]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await firebaseSyncService.loginWithGoogle();
      setCurrentUser(firebaseSyncService.getCurrentUser());
      setLastSyncTime(firebaseSyncService.getLastSyncTimestamp());
      setMessage({
        type: 'success',
        text: 'Đăng nhập Google và đồng bộ dữ liệu thành công!'
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: `Đăng nhập thất bại: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      await firebaseSyncService.logout();
      setCurrentUser(null);
      setMessage({
        type: 'success',
        text: 'Đã đăng xuất khỏi tài khoản Cloud.'
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Lỗi đăng xuất: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await firebaseSyncService.sync();
      setLastSyncTime(res.timestamp);
      setMessage({
        type: 'success',
        text: `Đồng bộ hoàn tất! Tổng cộng: ${res.tasksCount} tasks, ${res.sessionsCount} phiên.`
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Không thể đồng bộ: ${err.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSyncEnabled;
    setAutoSyncEnabled(nextVal);
    firebaseSyncService.setAutoSyncEnabled(nextVal);
  };

  const handleSaveConfig = () => {
    try {
      let configObj;
      const trimmed = configInput.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        configObj = JSON.parse(trimmed);
      } else {
        // Hỗ trợ trường hợp paste dạng const firebaseConfig = { ... }
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (match) {
          // Replace keys không bọc quote
          const jsonLike = match[0]
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
            .replace(/'/g, '"');
          configObj = JSON.parse(jsonLike);
        } else {
          throw new Error('Định dạng JSON không hợp lệ.');
        }
      }

      saveCustomFirebaseConfig(configObj);
      setIsConfigured(true);
      setShowConfigForm(false);
      setConfigInput('');
      setMessage({
        type: 'success',
        text: 'Đã lưu cấu hình Firebase thành công!'
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Cấu hình không hợp lệ: ${err.message}`
      });
    }
  };

  const handleResetConfig = () => {
    if (window.confirm('Bạn có chắc muốn xóa cấu hình Firebase đã lưu trên trình duyệt này?')) {
      clearCustomFirebaseConfig();
      setIsConfigured(isFirebaseConfigured());
      setShowConfigForm(false);
      setMessage({
        type: 'success',
        text: 'Đã xóa cấu hình custom Firebase.'
      });
    }
  };

  // Tính thời gian lần đồng bộ kế tiếp
  const nextSyncDateStr = lastSyncTime
    ? new Date(lastSyncTime + 24 * 60 * 60 * 1000).toLocaleString('vi-VN')
    : 'Sẽ tự động chạy ngay sau khi đăng nhập';

  const lastSyncDateStr = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('vi-VN')
    : 'Chưa thực hiện';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
          <div className="flex items-center space-x-3">
            <span className="text-2xl p-2 bg-blue-50 dark:bg-blue-900/40 rounded-xl">☁️</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Đồng bộ Cloud (Firebase)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tự động đồng bộ đa thiết bị mỗi 24 giờ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`p-3.5 rounded-xl mb-4 text-sm font-medium transition-all ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
            }`}
          >
            {message.type === 'error' ? '⚠️ ' : '✅ '}
            {message.text}
          </div>
        )}

        <div className="space-y-4">

          {/* Phần 1: Trạng thái tài khoản & Đăng nhập */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Tài khoản đồng bộ
            </h4>

            {!currentUser ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Đăng nhập bằng tài khoản Google để lưu trữ đám mây và đồng bộ phiên làm việc giữa các thiết bị.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading || !isConfigured}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm rounded-xl border border-gray-300 dark:border-slate-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập với Google'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full border border-blue-400"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                      {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {currentUser.displayName || 'Người dùng Google'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="py-1.5 px-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-red-200 dark:border-red-900"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>

          {/* Phần 2: Cấu hình tự động đồng bộ 24h & Sync ngay */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Tự động đồng bộ mỗi 24 giờ
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tự động merge dữ liệu ngầm mà không làm gián đoạn lúc bạn làm việc
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={handleToggleAutoSync}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Chi tiết chu kỳ 24h */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl text-xs space-y-1.5 border border-blue-100 dark:border-blue-900/50">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>🕒 Lần đồng bộ trước:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{lastSyncDateStr}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>⏳ Lần tự động kế tiếp:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{nextSyncDateStr}</span>
              </div>
            </div>

            {/* Nút hành động Đồng bộ ngay */}
            <button
              onClick={handleManualSync}
              disabled={isLoading || !currentUser || !isConfigured}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? '⏳ Đang đồng bộ 2 chiều...' : '🔄 Đồng bộ ngay lập tức'}</span>
            </button>
          </div>

          {/* Phần 3: Cấu hình Firebase Project (dễ dàng paste config cho GitHub Pages) */}
          <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">🔑</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Cấu hình Firebase {isConfigured ? '✅ (Đã kết nối)' : '⚠️ (Chưa có khóa)'}
                </span>
              </div>
              <button
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {showConfigForm ? 'Thu gọn' : (isConfigured ? 'Xem/Đổi Config' : 'Nhập Config')}
              </button>
            </div>

            {showConfigForm && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Dán chuỗi <code>const firebaseConfig = &#123; ... &#125;</code> từ Firebase Console vào đây:
                </p>
                <textarea
                  rows={4}
                  value={configInput}
                  onChange={(e) => setConfigInput(e.target.value)}
                  placeholder={'{\n  "apiKey": "AIzaSy...",\n  "authDomain": "deepwork-app.firebaseapp.com",\n  "projectId": "deepwork-app"\n}'}
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors"
                  >
                    Lưu cấu hình
                  </button>
                  {isConfigured && (
                    <button
                      onClick={handleResetConfig}
                      className="py-1.5 px-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-700 dark:text-gray-300 font-medium text-xs rounded-lg transition-colors"
                    >
                      Xóa cấu hình
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hướng dẫn thuật toán Smart Merge */}
          <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/30 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
            💡 <strong>Smart Merge an toàn:</strong> Khi đồng bộ giữa điện thoại và máy tính, hệ thống sẽ hợp nhất toàn bộ phiên tập trung (sessions) từ cả hai máy mà không làm mất lịch sử, tự động lưu giữ tiến độ làm việc mới nhất.
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold text-sm rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

export default CloudSyncModal;
