import { useState, useCallback, useEffect } from 'react';
import { FileUploadState, MessageFile, PreviewFile } from '../types/chat';
import { ChatService } from '../services/chatService';
import { fileService } from '../services/fileService';

interface UseFileUploadReturn {
  fileUploads: FileUploadState[];
  isProcessing: boolean;
  handleFileSelect: (files: FileList | null) => void;
  handleFileRemove: (fileId: string) => void;
  uploadFiles: (filesToUpload: { id: string; file: File }[]) => Promise<{
    successfullyUploadedFilesData: MessageFile[];
    filesForUserMessage: MessageFile[];
  }>;
  resetFileUploads: () => void;
  handleUploadProgress: (fileId: string, progress: number) => void;
  updateUploadStatus: (fileId: string, status: PreviewFile['status'], finalFile?: MessageFile) => void;
  cleanup: () => void;
}

/**
 * Custom hook for managing file uploads
 */
export function useFileUpload(): UseFileUploadReturn {
  // State for file uploads
  const [fileUploads, setFileUploads] = useState<FileUploadState[]>([]);
  // Add processing state to track if uploads are in progress
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      fileService.cleanup();
    };
  }, []);
  
  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newPreviewFiles = Array.from(files).map(file => fileService.createPreviewFile(file));
    
    setFileUploads(prev => [...prev, ...newPreviewFiles]);
  }, []);
  
  // Handle file removal
  const handleFileRemove = useCallback((fileId: string) => {
    // Remove the file from the uploads
    setFileUploads(prev => prev.filter(file => file.id !== fileId));
    
    // Revoke the URL if it's not being used
    fileService.revokePreviewUrl(fileId);
  }, []);
  
  // Handle upload progress
  const handleUploadProgress = useCallback((fileId: string, progress: number) => {
    setFileUploads(prevUploads =>
      prevUploads.map(uf =>
        uf.id === fileId ? { ...uf, progress, status: 'uploading' } : uf
      )
    );
  }, []);
  
  // Update upload status
  const updateUploadStatus = useCallback((fileId: string, status: PreviewFile['status'], finalFile?: MessageFile) => {
    setFileUploads(prevUploads =>
      prevUploads.map(uf =>
        uf.id === fileId
          ? { 
              ...uf, 
              status, 
              progress: status === 'complete' ? 100 : (status === 'error' ? 0 : uf.progress), 
              finalFileData: finalFile 
            }
          : uf
      )
    );
    
    // If the upload failed, revoke the preview URL
    if (status === 'error') {
      fileService.revokePreviewUrl(fileId);
    }
    
    // If the upload succeeded, track the URL as active
    if (status === 'complete' && finalFile && finalFile.type.startsWith('image/')) {
      fileService.trackActiveImageUrl(finalFile.url);
    }
  }, []);
  
  // Upload multiple files and return successful uploads
  const uploadFiles = useCallback(async (filesToUpload: { id: string; file: File }[]) => {
    if (!filesToUpload || filesToUpload.length === 0) {
      return { successfullyUploadedFilesData: [], filesForUserMessage: [] };
    }
    
    // Set processing to true while uploads are in progress
    setIsProcessing(true);
    
    // Add files to upload state with 'pending' status
    const newUploads: FileUploadState[] = filesToUpload.map(({ id, file }) => {
      const existing = fileUploads.find(uf => uf.id === id);
      if (existing) return existing;
      
      return fileService.createPreviewFile(file);
    }).filter(Boolean) as FileUploadState[];
    
    // Update state to show previews immediately
    setFileUploads(prev => [...prev.filter(uf => !newUploads.some(nu => nu.id === uf.id)), ...newUploads]);
    
    // Start uploads and wait for them
    const uploadPromises = filesToUpload.map(fileWithId =>
      ChatService.uploadFile(fileWithId.id, fileWithId.file, handleUploadProgress)
        .then(finalFileData => {
          updateUploadStatus(fileWithId.id, 'complete', finalFileData);
          
          // For images, make sure we're tracking the URL
          if (finalFileData.type.startsWith('image/')) {
            fileService.trackActiveImageUrl(finalFileData.url);
          }
          
          return {
            backendData: finalFileData,
            previewData: {
              ...finalFileData,
              id: fileWithId.id
            }
          };
        })
        .catch(error => {
          console.error(`Upload failed for ${fileWithId.id}:`, error);
          updateUploadStatus(fileWithId.id, 'error');
          // Revoke the preview URL on error
          fileService.revokePreviewUrl(fileWithId.id);
          return null;
        })
    );
    
    try {
      const results = await Promise.all(uploadPromises);
      // Filter out nulls (failures) and separate backend data from preview data
      const successfulUploads = results.filter((result): result is { backendData: MessageFile; previewData: MessageFile } => result !== null);
      
      // Uploads are complete, set processing to false
      setIsProcessing(false);
      
      return {
        successfullyUploadedFilesData: successfulUploads.map(r => r.backendData),
        filesForUserMessage: successfulUploads.map(r => r.previewData)
      };
      
    } catch (err) {
      console.error("Error during Promise.all for uploads:", err);
      
      // Ensure preview URLs for files that failed during Promise.all are cleaned up
      filesToUpload.forEach(ftu => {
        const currentStatus = fileUploads.find(fu => fu.id === ftu.id)?.status;
        if (currentStatus !== 'complete') {
          fileService.revokePreviewUrl(ftu.id);
          
          // Mark as error if not already
          if (currentStatus === 'pending' || currentStatus === 'uploading') {
            updateUploadStatus(ftu.id, 'error');
          }
        }
      });
      
      // Error occurred, set processing to false
      setIsProcessing(false);
      
      return { successfullyUploadedFilesData: [], filesForUserMessage: [] };
    }
  }, [fileUploads, handleUploadProgress, updateUploadStatus]);
  
  const resetFileUploads = useCallback(() => {
    // Clean up preview URLs for files that aren't active in messages
    fileUploads.forEach(fu => {
      // Only revoke URLs for files that aren't complete (active in messages)
      if (fu.status !== 'complete') {
        fileService.revokePreviewUrl(fu.id);
      }
    });
    
    // Reset the file upload state completely
    setFileUploads([]);
  }, [fileUploads]);
  
  // Clean up all resources
  const cleanup = useCallback(() => {
    fileService.cleanup();
    setFileUploads([]);
  }, []);
  
  return {
    fileUploads,
    isProcessing,
    handleFileSelect,
    handleFileRemove,
    uploadFiles,
    resetFileUploads,
    handleUploadProgress,
    updateUploadStatus,
    cleanup
  };
} 