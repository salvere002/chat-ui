/**
 * @deprecated This file is deprecated. Please use the Zustand store from src/stores/toastStore.ts instead.
 * The ToastContext was replaced with a Zustand store for better state management.
 * See STATE_MANAGEMENT.md for more information on the migration.
 */

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = `toast-${Date.now()}`;
    setToasts(prevToasts => [...prevToasts, { id, message, type, duration }]);
    
    // Auto-remove toast after duration (failsafe in case component doesn't unmount properly)
    setTimeout(() => {
      hideToast(id);
    }, duration + 500); // Add a little buffer time
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* Render all active toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
          isVisible={true}
        />
      ))}
    </ToastContext.Provider>
  );
};

export default ToastProvider; 