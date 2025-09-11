import React from 'react';
import { Toaster } from 'sonner';

// Drop-in replacement container using sonner
const ToastContainer: React.FC = () => {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      expand
      toastOptions={{
        duration: 3000,
      }}
    />
  );
};

export { ToastContainer };
export default ToastContainer;
