import React, { useEffect } from 'react';
import { useToastStore } from '../stores';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  isVisible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose, isVisible }) => {
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
    <div
      className={`min-w-[280px] max-w-[400px] bg-bg-elevated rounded-md shadow-lg overflow-hidden pointer-events-auto transform translate-x-0 opacity-100 transition-all duration-200 ease-out border border-border-secondary ${
        type === 'success' ? 'border-l-[3px] border-l-success' :
        type === 'error' ? 'border-l-[3px] border-l-error' :
        type === 'info' ? 'border-l-[3px] border-l-info' :
        type === 'warning' ? 'border-l-[3px] border-l-warning' : ''
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3 px-4 py-3 relative">
        {/* Icon */}
        <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-xs font-bold text-text-inverse mt-0.5 ${
          type === 'success' ? 'bg-success' :
          type === 'error' ? 'bg-error' :
          type === 'info' ? 'bg-info' :
          type === 'warning' ? 'bg-warning' : ''
        }`}>
          {type === 'success' && '✓'}
          {type === 'error' && '⚠'}
          {type === 'info' && 'ℹ'}
          {type === 'warning' && '⚠'}
        </div>
        
        {/* Message */}
        <div className="flex-1 text-sm leading-normal text-text-primary break-words">{message}</div>
        
        {/* Close button */}
        <button 
          className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-none rounded text-text-tertiary text-lg cursor-pointer transition-all duration-150 flex-shrink-0 -mt-0.5 -mr-1 hover:bg-bg-tertiary hover:text-text-primary"
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
    <div className="fixed bottom-5 right-5 z-tooltip flex flex-col-reverse gap-3 pointer-events-none">
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