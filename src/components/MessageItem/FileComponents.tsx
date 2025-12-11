import React, { memo, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { MessageFile } from '../../types/chat';
import { fileService } from '../../services/fileService';

// Memoized embedded image component to prevent reloads on typing
export const EmbeddedImage: React.FC<{ imageUrl: string }> = memo(({ imageUrl }) => {
  useEffect(() => {
    // Track image URL when component mounts
    if (imageUrl.startsWith('blob:')) {
      fileService.trackActiveImageUrl(imageUrl);
    }
    
    // Cleanup function for when component unmounts or URL changes
    return () => {
      if (imageUrl.startsWith('blob:')) {
        // Don't immediately revoke - let the cleanup system handle it
        // This prevents premature revocation if the same URL is used elsewhere
      }
    };
  }, [imageUrl]);
  
  return (
    <div className="mb-3">
      <img 
        src={imageUrl} 
        alt="Embedded image"
        className="w-full h-auto object-contain rounded-lg max-w-[580px] xl:max-w-[700px] 2xl:max-w-[800px] max-h-[320px] xl:max-h-[400px]"
        onError={(e) => {
          // Handle broken images by hiding them
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
          console.warn('Failed to load embedded image:', imageUrl);
        }}
        loading="lazy"
      />
    </div>
  );
});

EmbeddedImage.displayName = 'EmbeddedImage';

// FileAttachment Component - Handles individual file display
interface FileAttachmentProps {
  file: MessageFile;
}

export const FileAttachment = React.memo<FileAttachmentProps>(({ file }) => {
  useEffect(() => {
    // Track image URLs when component mounts
    if (file.type.startsWith('image/') && file.url.startsWith('blob:')) {
      fileService.trackActiveImageUrl(file.url);
    }
    
    return () => {
      // Cleanup handled by periodic cleanup system
    };
  }, [file.url, file.type]);
  
  return (
    <div className="inline-block bg-bg-secondary border border-border-secondary rounded-lg overflow-hidden max-w-[580px] xl:max-w-[700px] 2xl:max-w-[800px]">
      {file.type.startsWith('image/') ? (
        <img 
          src={file.url} 
          alt={file.name} 
          className="w-full h-auto object-contain max-w-[580px] xl:max-w-[700px] 2xl:max-w-[800px] max-h-[320px] xl:max-h-[400px]"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            console.warn('Failed to load file attachment image:', file.url);
          }}
        />
      ) : (
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 text-text-primary hover:bg-bg-tertiary transition-colors duration-150">
          <FaFileAlt className="text-accent-primary text-lg flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{file.name}</span>
            <span className="text-xs text-text-tertiary">{fileService.formatFileSize(file.size)}</span>
          </div>
        </a>
      )}
    </div>
  );
});

FileAttachment.displayName = 'FileAttachment';