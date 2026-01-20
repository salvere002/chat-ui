import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { captureConversationScreenshot } from '../utils/screenshot';

interface ScreenshotOptions {
  width?: number;
  pixelRatio?: number;
}

interface UseScreenshotShareReturn {
  // State
  showShareModal: boolean;
  screenshotBlob: Blob | null;
  screenshotUrl: string;
  isCapturing: boolean;

  // Actions
  captureFullConversation: () => Promise<void>;
  captureMessagePair: (messageId: string) => Promise<void>;
  closeShareModal: () => void;
}

const DEFAULT_OPTIONS: ScreenshotOptions = {
  width: 800,
  pixelRatio: 2,
};

/**
 * Hook for managing screenshot capture and share modal functionality
 */
export function useScreenshotShare(): UseScreenshotShareReturn {
  const [showShareModal, setShowShareModal] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCaptureResult = useCallback((result: { blob: Blob; dataUrl: string }) => {
    if (screenshotUrl && screenshotUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(screenshotUrl);
      } catch {
        // Ignore revoke errors
      }
    }
    try {
      const url = URL.createObjectURL(result.blob);
      setScreenshotBlob(result.blob);
      setScreenshotUrl(url);
    } catch {
      // Fallback to dataUrl only if object URL creation fails
      setScreenshotBlob(result.blob);
      setScreenshotUrl(result.dataUrl);
    }
    setShowShareModal(true);
  }, [screenshotUrl]);

  const captureFullConversation = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await captureConversationScreenshot(DEFAULT_OPTIONS);
      handleCaptureResult(result);
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to capture screenshot. Please try again.'
      );
    } finally {
      setIsCapturing(false);
    }
  }, [handleCaptureResult]);

  const captureMessagePair = useCallback(async (messageId: string) => {
    setIsCapturing(true);
    try {
      const result = await captureConversationScreenshot({
        ...DEFAULT_OPTIONS,
        selection: {
          mode: 'window',
          anchorMessageId: messageId,
          beforeCount: 1,
          afterCount: 0,
          allowPartial: true,
        },
        paddingTop: 16,
        paddingBottom: 16,
      });
      handleCaptureResult(result);
    } catch (error) {
      console.error('Error capturing message pair:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to capture message pair. Please try again.'
      );
    } finally {
      setIsCapturing(false);
    }
  }, [handleCaptureResult]);

  const closeShareModal = useCallback(() => {
    setShowShareModal(false);
    if (screenshotUrl && screenshotUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(screenshotUrl);
      } catch {
        // Ignore revoke errors
      }
    }
    setScreenshotUrl('');
    setScreenshotBlob(null);
  }, [screenshotUrl]);

  return {
    showShareModal,
    screenshotBlob,
    screenshotUrl,
    isCapturing,
    captureFullConversation,
    captureMessagePair,
    closeShareModal,
  };
}

export default useScreenshotShare;
