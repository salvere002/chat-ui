import React from 'react';

interface ThinkingIndicatorProps {
  isStreaming: boolean;
  className?: string;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ isStreaming, className = '' }) => {
  if (!isStreaming) {
    return (
      <div className={`flex items-center text-text-secondary ${className}`}>
        <span className="text-sm font-medium">Thoughts</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center text-text-secondary ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
        <span className="text-sm font-medium">Analyzing</span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;