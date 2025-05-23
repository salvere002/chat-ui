import { MessageFile, PreviewFile } from "../types/chat";

/**
 * FileService: Manages file operations and URL lifecycle
 */
class FileService {
  // Track URLs that are in use by messages and should not be revoked
  private activeImageUrls = new Set<string>();
  
  // Track preview URLs that should be revoked when no longer needed
  private previewUrls = new Map<string, string>();
  
  /**
   * Creates a preview URL for a file
   */
  createPreviewUrl(file: File): string {
    const previewUrl = URL.createObjectURL(file);
    return previewUrl;
  }
  
  /**
   * Tracks a preview URL for potential cleanup
   */
  trackPreviewUrl(fileId: string, url: string): void {
    this.previewUrls.set(fileId, url);
  }
  
  /**
   * Tracks an active image URL used in messages
   */
  trackActiveImageUrl(url: string): void {
    this.activeImageUrls.add(url);
  }
  
  /**
   * Revokes a preview URL for a specific file
   */
  revokePreviewUrl(fileId: string): void {
    const url = this.previewUrls.get(fileId);
    if (url && !this.activeImageUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.previewUrls.delete(fileId);
    }
  }
  
  /**
   * Creates a permanent object URL for an image file
   * Used for images that will be displayed in messages
   */
  createPermanentImageUrl(file: File): string {
    const blob = file.slice(0, file.size, file.type);
    const url = URL.createObjectURL(blob);
    this.trackActiveImageUrl(url);
    return url;
  }
  
  /**
   * Determines if a file is an image
   */
  isImage(file: File | MessageFile): boolean {
    return 'type' in file && file.type.startsWith('image/');
  }
  
  /**
   * Formats file size in human-readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Creates a unique file ID
   */
  createFileId(file: File): string {
    return `${file.name}-${file.lastModified}-${Math.random()}`; 
  }
  
  /**
   * Creates a preview file object
   */
  createPreviewFile(file: File): PreviewFile {
    const id = this.createFileId(file);
    const previewUrl = this.createPreviewUrl(file);
    this.trackPreviewUrl(id, previewUrl);
    
    return {
      id,
      file,
      previewUrl,
      progress: 0,
      status: 'pending'
    };
  }
  
  /**
   * Cleanup on component unmount or when requested
   * Only revokes URLs that aren't being used in active messages
   */
  cleanup(): void {
    this.previewUrls.forEach((url, id) => {
      if (!this.activeImageUrls.has(url)) {
        URL.revokeObjectURL(url);
      }
    });
    this.previewUrls.clear();
  }
}

// Create and export a singleton instance
export const fileService = new FileService();

// Also export the class for testing purposes
export default FileService; 