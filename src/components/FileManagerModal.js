import React, { useState, useEffect } from 'react';
import fileStorageService from '../services/fileStorageService';

export const FileManagerModal = ({ onClose, onSuccess, onOpenCloudSync }) => {
  const [fileStatus, setFileStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setFileStatus(fileStorageService.getFileStatus());
  }, []);

  const handleSelectFile = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await fileStorageService.selectFile();
      setFileStatus(fileStorageService.getFileStatus());
      setMessage({
        type: 'success',
        text: 'Đã chọn file thành công! Dữ liệu sẽ được lưu tự động.'
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error selecting file:', error);
      setMessage({
        type: 'error',
        text: 'Không thể chọn file: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadFromFile = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const imported = await fileStorageService.loadFromFile();
      setFileStatus(fileStorageService.getFileStatus());
      setMessage({
        type: 'success',
        text: `Đã nạp thành công ${imported.tasks.length} tasks và ${imported.sessions.length} phiên tập trung!`
      });

      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error loading from file:', error);
      setMessage({
        type: 'error',
        text: 'Không thể tải file: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    try {
      fileStorageService.downloadAsFile();
      setMessage({
        type: 'success',
        text: 'File đã được tải xuống thành công!'
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      setMessage({
        type: 'error',
        text: 'Không thể tải xuống: ' + error.message
      });
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const imported = await fileStorageService.uploadFromInput(file);
      setMessage({
        type: 'success',
        text: `Đã nạp thành công ${imported.tasks.length} tasks và ${imported.sessions.length} phiên tập trung!`
      });

      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({
        type: 'error',
        text: 'Không thể tải lên: ' + error.message
      });
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleForceSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await fileStorageService.forceSave();
      setMessage({
        type: 'success',
        text: 'Đã lưu dữ liệu thành công!'
      });
    } catch (error) {
      console.error('Error force saving:', error);
      setMessage({
        type: 'error',
        text: 'Không thể lưu: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-3">📁 Quản lý File Dữ liệu</h3>

        {/* Cloud Sync Promo Banner */}
        {onOpenCloudSync && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">☁️</span>
              <div>
                <p className="text-xs font-bold text-blue-900">Đồng bộ Cloud (Firebase)</p>
                <p className="text-[11px] text-blue-700">Tự động đồng bộ đa thiết bị mỗi 24h</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenCloudSync();
              }}
              className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
            >
              Mở Cloud
            </button>
          </div>
        )}

        {/* File Status */}
        {fileStatus && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Trạng thái:</h4>
            <div className="text-xs space-y-1">
              <div>
                API hỗ trợ: {fileStatus.isFileAPISupported ? '✅ Có' : '❌ Không'}
              </div>
              {fileStatus.isFileAPISupported && (
                <div>
                  File đã chọn: {fileStatus.hasFileHandle ? '✅ ' + fileStatus.fileName : '❌ Chưa chọn'}
                </div>
              )}
              <div>
                Lần lưu cuối: {fileStatus.lastSaved ? new Date(fileStatus.lastSaved).toLocaleString('vi-VN') : 'Chưa có'}
              </div>
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              message.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Modern File API Section */}
          {fileStatus?.isFileAPISupported ? (
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">🔄 Đồng bộ với File Cục bộ</h4>
              <p className="text-sm text-gray-600 mb-3">
                Lưu trực tiếp vào file JSON trên máy tính của bạn qua File System Access API
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleSelectFile}
                  disabled={isLoading}
                  className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {isLoading ? '⏳ Đang chọn...' : '📂 Chọn File để Tự động Lưu'}
                </button>

                <button
                  onClick={handleLoadFromFile}
                  disabled={isLoading}
                  className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                >
                  {isLoading ? '⏳ Đang nạp...' : '📥 Mở & Nạp Dữ liệu từ File'}
                </button>

                <button
                  onClick={handleForceSave}
                  disabled={isLoading || !fileStatus?.hasFileHandle}
                  className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                >
                  {isLoading ? '⏳ Đang lưu...' : '💾 Lưu Ngay Ra File'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-yellow-50">
              <h4 className="font-semibold mb-2">⚠️ Trình duyệt không hỗ trợ File System API</h4>
              <p className="text-sm text-gray-600 mb-3">
                Vui lòng sử dụng tính năng Xuất / Nhập JSON thủ công bên dưới.
              </p>
            </div>
          )}

          {/* Fallback Download/Upload Section */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">💾 Xuất / Nhập JSON Thủ công</h4>
            <p className="text-sm text-gray-600 mb-3">
              Tải xuống file backup hoặc nạp file JSON từ thiết bị
            </p>

            <div className="space-y-3">
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                📥 Xuất file backup (.json)
              </button>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  📤 Nhập file JSON vào hệ thống:
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 file:cursor-pointer disabled:file:bg-gray-100 disabled:file:text-gray-400 border border-gray-200 rounded-lg p-1"
                />
              </div>
            </div>
          </div>

          {/* Auto-save Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-blue-800 mb-1">🔄 Tự động lưu</h4>
            <p className="text-xs text-blue-700">
              Dữ liệu được tự động lưu mỗi 30 giây và khi đóng trang. 
              LocalStorage luôn được đồng bộ làm sao lưu dự phòng.
            </p>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg font-medium text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
export default FileManagerModal;
