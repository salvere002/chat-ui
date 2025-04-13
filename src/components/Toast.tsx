import React, { useEffect } from 'react';
import { useToastStore } from '../stores';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  isVisible: boolean;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose, isVisible }) => {
  // Handle auto-closing of toast after duration
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      // Clear timeout on component unmount
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);
  
  if (!isVisible) return null;
  
  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-content">
        {/* Icon based on toast type */}
        <div className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '⚠'}
          {type === 'info' && 'ℹ'}
          {type === 'warning' && '⚠'}
        </div>
        
        {/* Toast message */}
        <div className="toast-message">{message}</div>
        
        {/* Close button */}
        <button 
          className="toast-close" 
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToastStore();
  
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
          isVisible={true}
        />
      ))}
    </div>
  );
};

export { ToastContainer };
export default Toast; 