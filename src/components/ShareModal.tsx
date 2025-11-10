import React, { useState } from 'react';
import { FaDownload, FaEnvelope, FaTimes } from 'react-icons/fa';

interface ShareModalProps {
  imageDataUrl: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ imageDataUrl, onClose }) => {
  const [showEmailPlaceholder, setShowEmailPlaceholder] = useState(false);

  const handleSaveLocal = () => {
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `chat-screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const handleShareEmail = () => {
    setShowEmailPlaceholder(true);
  };

  const handleCloseEmailPlaceholder = () => {
    setShowEmailPlaceholder(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-tooltip p-4 animate-fade-in">
      <div className="bg-bg-elevated rounded-lg w-full max-w-[600px] shadow-lg flex flex-col animate-slide-up max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-primary rounded-t-lg">
          <h3 className="text-lg font-semibold text-text-primary m-0">Share Screenshot</h3>
          <button 
            className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary text-2xl cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary" 
            onClick={onClose}
            aria-label="Close share modal"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Preview */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-text-secondary">Preview:</label>
            <div className="border border-border-primary rounded-md overflow-hidden bg-bg-secondary">
              <img 
                src={imageDataUrl} 
                alt="Screenshot preview" 
                className="w-full h-auto max-h-[300px] object-contain"
              />
            </div>
          </div>
          
          {/* Share Options */}
          {!showEmailPlaceholder && (
            <div>
              <label className="block mb-3 text-sm font-medium text-text-secondary">Choose an option:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={handleSaveLocal}
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
                >
                  <FaDownload className="text-lg" />
                  <span>Save to Local</span>
                </button>
                
                <button 
                  onClick={handleShareEmail}
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-transparent text-text-primary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:border-text-tertiary active:scale-[0.98]"
                >
                  <FaEnvelope className="text-lg" />
                  <span>Share with Email</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Email Placeholder */}
          {showEmailPlaceholder && (
            <div className="p-6 bg-bg-secondary rounded-lg border border-border-primary animate-slide-up">
              <h4 className="text-base font-semibold text-text-primary mb-3 m-0">Share via Email</h4>
              <p className="text-text-secondary mb-4 text-sm leading-relaxed">
                Email sharing functionality will be implemented in a future update. 
                For now, you can save the screenshot locally and attach it to your email manually.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={handleCloseEmailPlaceholder}
                  className="px-4 py-2 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary hover:border-text-tertiary"
                >
                  Back
                </button>
                <button 
                  onClick={handleSaveLocal}
                  className="px-4 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
                >
                  Save Instead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

