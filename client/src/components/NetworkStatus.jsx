import react, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

/**
 * Network Status Monitor
 * Shows connection status and provides hooks for network-dependent features
 */
export const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastChecked, setLastChecked] = useState(new Date());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-xs">
      <div className="flex items-center gap-3">
        <WifiOff className="text-red-600 flex-shrink-0" size={20} />
        <div>
          <p className="font-medium text-red-900 text-sm">No Internet Connection</p>
          <p className="text-xs text-red-700">Some features may not work properly</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Auth Progress Indicator
 * Shows progression through auth steps with visual indicators
 */
export const AuthProgress = ({ currentStep = 1, totalSteps = 2, stepLabels = [] }) => {
  const defaultLabels = ['Google Auth', 'Profile Setup'];
  const labels = stepLabels.length > 0 ? stepLabels : defaultLabels;

  return (
    <div className="w-full px-8 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                index + 1 <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </div>
            <p className={`text-xs mt-1 text-center ${
              index + 1 <= currentStep ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {label}
            </p>
          </div>
        ))}
      </div>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div
          className={`bg-blue-600 h-1 rounded-full transition-all duration-300`}
          style={{
            width: `${(currentStep / totalSteps) * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * Request Status Display
 * Shows API request status with retry option
 */
export const RequestStatus = ({ 
  status = 'idle', // idle, loading, success, error
  message = '',
  onRetry = null,
  autoHideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle' && message) {
      setIsVisible(true);
      if (status === 'success') {
        const timer = setTimeout(() => setIsVisible(false), autoHideDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [status, message, autoHideDelay]);

  if (!isVisible) return null;

  const statusConfig = {
    loading: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: <span className="text-xl">✓</span>,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: <AlertCircle size={18} />,
    },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg px-4 py-3 flex items-center gap-3 mb-4`}>
      <div className="flex-shrink-0">{config.icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${config.text}`}>{message}</p>
      </div>
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-red-700 hover:text-red-900 underline ml-2"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;
