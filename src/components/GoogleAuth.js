// src/components/GoogleAuth.js
import React, { useState, useEffect } from 'react';
import googleAuthService from '../services/googleAuthService';

const GoogleAuth = ({ onAuthSuccess }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    // Check authentication status and get session info
    const updateAuthStatus = () => {
      const authenticated = googleAuthService.isAuthenticated();
      const info = googleAuthService.getSessionInfo();
      
      setIsAuthenticated(authenticated);
      setSessionInfo(info);
      
      // Auto-expand if not authenticated
      if (!authenticated) {
        setIsExpanded(true);
      }
    };

    updateAuthStatus();

    // Handle OAuth callback
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setAuthError(`Authentication error: ${error}`);
        setIsAuthenticating(false);
        return;
      }

      if (code) {
        setIsAuthenticating(true);
        setAuthError(null);

        try {
          await googleAuthService.exchangeCodeForTokens(code);
          updateAuthStatus();
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Notify parent component
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        } catch (error) {
          console.error('Error during authentication:', error);
          setAuthError(error.message || 'Authentication failed. Please try again.');
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    handleAuthCallback();
  }, [onAuthSuccess]);

  const handleSignIn = () => {
    setIsAuthenticating(true);
    setAuthError(null);
    
    try {
      const authUrl = googleAuthService.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating sign in:', error);
      setAuthError('Failed to initiate sign in. Please try again.');
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = () => {
    try {
      googleAuthService.signOut();
      setIsAuthenticated(false);
      setSessionInfo(null);
      setAuthError(null);
      setIsExpanded(true);
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthError('Failed to sign out.');
    }
  };

  const handleRetry = () => {
    setAuthError(null);
    handleSignIn();
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Không rõ';
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const getStatusColor = () => {
    if (isAuthenticated) return 'text-green-600';
    if (authError) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    if (isAuthenticated) return 'Đã kết nối';
    if (authError) return 'Lỗi kết nối';
    return 'Chưa kết nối';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <span className="font-medium text-gray-900">Google Sheets</span>
            </div>
            
            <span className={`text-xs px-2 py-1 rounded-full ${
              isAuthenticated 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {getStatusText()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {sessionInfo?.isPersistent && (
              <span className="text-xs text-blue-600 font-medium">Persistent</span>
            )}
            <svg 
              className={`w-4 h-4 text-gray-400 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Session Info */}
          {isAuthenticated && sessionInfo && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Thông tin phiên:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Đăng nhập: {formatDate(sessionInfo.createdAt)}</div>
                {sessionInfo.lastRefreshed && (
                  <div>Làm mới: {formatDate(sessionInfo.lastRefreshed)}</div>
                )}
                <div className="flex items-center space-x-2">
                  <span>Trạng thái:</span>
                  <span className={`font-medium ${getStatusColor()}`}>
                    {sessionInfo.isPersistent ? 'Phiên dài hạn' : 'Phiên thông thường'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {authError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{authError}</p>
              <button
                onClick={handleRetry}
                className="mt-2 text-xs text-red-600 hover:text-red-700 font-medium underline"
                disabled={isAuthenticating}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isAuthenticated ? (
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                  isAuthenticating
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isAuthenticating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang kết nối...</span>
                  </div>
                ) : (
                  '🔗 Kết nối Google Sheets'
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 text-center font-medium">
                    ✅ Dữ liệu sẽ được đồng bộ với Google Sheets
                  </p>
                  <p className="text-xs text-green-600 text-center mt-1">
                    Phiên làm việc của bạn sẽ được lưu trữ lâu dài
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>

          {/* Info Text */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>
              {isAuthenticated 
                ? 'Tasks và sessions sẽ được đồng bộ với Google Sheets'
                : 'Kết nối để đồng bộ dữ liệu giữa các thiết bị'
              }
            </p>
            {isAuthenticated && sessionInfo?.isPersistent && (
              <p className="text-blue-600 font-medium">
                💎 Phiên dài hạn - chỉ đăng xuất khi bạn muốn
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleAuth;