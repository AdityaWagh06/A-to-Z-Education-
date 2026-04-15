import React from 'react';

/**
 * Reusable loading spinner component
 * Can be used with different sizes: 'sm', 'md', 'lg'
 */
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`${sizeMap[size]} ${className}`}>
      <div className="animate-spin rounded-full h-full w-full border-2 border-gray-300 border-t-blue-600"></div>
    </div>
  );
};

/**
 * Loading overlay with spinner
 * Covers entire container when loading
 */
export const LoadingOverlay = ({ isLoading = false, message = 'Loading...' }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-lg">
        <Spinner size="lg" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Inline loading spinner with text
 * Good for buttons and form submissions
 */
export const LoadingButton = ({ 
  isLoading = false, 
  children, 
  disabled = false,
  loadingText = 'Loading...',
  className = '',
  ...props 
}) => {
  return (
    <button
      disabled={isLoading || disabled}
      className={`${className} ${(isLoading || disabled) ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2 justify-center">
          <Spinner size="sm" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * Skeleton loader for content placeholders
 */
export const SkeletonLoader = ({ count = 1, height = 'h-12' }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gray-200 rounded-lg animate-pulse`}
        />
      ))}
    </div>
  );
};

export default Spinner;
