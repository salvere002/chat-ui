import React, { useState } from 'react';
import { FaDownload, FaEnvelope, FaTimes, FaClipboard } from 'react-icons/fa';
import EmailShareDialog from './EmailShareDialog';
import { toast } from 'sonner';

interface ShareModalProps {
  imageUrl: string;
  screenshotBlob?: Blob;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ imageUrl, screenshotBlob, onClose }) => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleSaveLocal = () => {
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `chat-screenshot-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    try {
      // Check if Clipboard API is supported
      if (!navigator.clipboard || !navigator.clipboard.write) {
        toast.error('Clipboard API is not supported in your browser');
        return;
      }

      // Get the blob (prefer provided blob, fallback to fetching the imageUrl)
      const blob = screenshotBlob ?? (await fetch(imageUrl).then((r) => r.blob()));
      if (!blob) {
        toast.error('Unable to access screenshot image');
        return;
      }

      // Create ClipboardItem with the image blob
      const clipboardItem = new ClipboardItem({ [blob.type]: blob });

      // Write to clipboard
      await navigator.clipboard.write([clipboardItem]);
      
      toast.success('Image copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy image to clipboard. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleShareEmail = () => {
    setShowEmailDialog(true);
  };

  const handleBackFromEmail = () => {
    setShowEmailDialog(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-tooltip p-4 animate-fade-in">
      <div className="bg-bg-elevated rounded-lg w-full max-w-[700px] shadow-lg flex flex-col animate-slide-up max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-primary rounded-t-lg">
          <div className="flex items-center gap-3">
            {showEmailDialog && (
              <button
                onClick={handleBackFromEmail}
                className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary transition-all duration-150"
                aria-label="Go back"
              >
                ←
              </button>
            )}
            <h3 className="text-lg font-semibold text-text-primary m-0">
              {showEmailDialog ? 'Share via Email' : 'Share Screenshot'}
            </h3>
          </div>
          <button 
            className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary text-2xl cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary" 
            onClick={onClose}
            aria-label="Close share modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        {!showEmailDialog ? (
          <div className="p-6 flex-1 overflow-y-auto">
            {/* Preview */}
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-text-secondary">Preview:</label>
              <div className="border border-border-primary rounded-md bg-bg-secondary max-h-[60vh] overflow-y-auto relative">
                {!imgLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-bg-tertiary/60" />
                )}
                <img
                  src={imageUrl}
                  alt="Screenshot preview"
                  decoding="async"
                  onLoad={() => setImgLoaded(true)}
                  className="w-full h-auto block"
                />
              </div>
            </div>

            {/* Share Options */}
            <div>
              <label className="block mb-3 text-sm font-medium text-text-secondary">Choose an option:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleCopyToClipboard}
                  disabled={isCopying}
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-transparent text-text-primary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:border-text-tertiary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <FaClipboard className="text-lg" />
                  <span>{isCopying ? 'Copying...' : 'Copy Image'}</span>
                </button>

                <button
                  onClick={handleSaveLocal}
                  className="flex items-center justify-center gap-3 px-4 py-4 bg-transparent text-text-primary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:border-text-tertiary active:scale-[0.98]"
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
          </div>
        ) : (
          // Embedded email dialog content inside the same modal shell
          <EmailShareDialog
            imageDataUrl={imageUrl}
            screenshotBlob={screenshotBlob}
            onClose={onClose}
            onBack={handleBackFromEmail}
            embedded
          />
        )}
      </div>
    </div>
  );
};

export default ShareModal;
