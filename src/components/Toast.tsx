import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  isVisible: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 3000,
  onClose,
  isVisible
}) => {
  const [progress, setProgress] = useState(100);
  const [intervalId, setIntervalId] = useState<number | null>(null);

  // Icon mapping based on toast type
  const iconMap = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };

  useEffect(() => {
    if (isVisible) {
      // Reset progress when toast becomes visible
      setProgress(100);
      
      // Set up the progress bar decreasing
      const interval = window.setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prevProgress - (100 / (duration / 100));
        });
      }, 100);
      
      setIntervalId(interval);
      
      // Set up auto-dismiss
      const timeout = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isVisible, duration, onClose]);
  
  // Clear interval when manually closed
  const handleClose = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    onClose();
  };
  
  if (!isVisible) return null;
  
  return (
    <div className={`toast toast-${type} ${isVisible ? 'visible' : ''}`}>
      <div className="toast-content">
        <div className={`toast-icon ${type}`}>{iconMap[type]}</div>
        <div className="toast-message">{message}</div>
        <button className="toast-close" onClick={handleClose}>×</button>
      </div>
      <div className="toast-progress" style={{ width: `${progress}%` }} />
    </div>
  );
};

export default Toast; 