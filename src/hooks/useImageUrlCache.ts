import { useMemo, useRef } from 'react';
import { Message } from '../types/chat';

export const useImageUrlCache = (messages: Message[]) => {
  const lastCacheRef = useRef<{
    messageCount: number;
    contentSignature: string;
    urls: string[];
    hasImages: boolean;
  }>({ messageCount: 0, contentSignature: '', urls: [], hasImages: false });

  const cachedImageUrls = useMemo(() => {
    // Early return if no messages
    if (messages.length === 0) {
      lastCacheRef.current = { messageCount: 0, contentSignature: '', urls: [], hasImages: false };
      return { urls: [], hasImages: false, changed: true };
    }

    // Create content signature for change detection
    const currentCount = messages.length;
    const contentSignature = messages.map(m => 
      `${m.id}-${m.imageUrl || ''}-${m.files?.length || 0}-${m.files?.map(f => f.url).join(',') || ''}`
    ).join('|');
    
    const previousCache = lastCacheRef.current;
    
    // If both count and content signature haven't changed, return cached result
    if (currentCount === previousCache.messageCount && contentSignature === previousCache.contentSignature) {
      return { 
        urls: previousCache.urls, 
        hasImages: previousCache.hasImages,
        changed: false 
      };
    }

    // Quick scan for images before full processing
    const hasAnyImages = messages.some(message => 
      message.imageUrl || 
      (message.files?.some(file => file.type.startsWith('image/')))
    );

    if (!hasAnyImages) {
      const result = { messageCount: currentCount, contentSignature, urls: [], hasImages: false };
      lastCacheRef.current = result;
      return { urls: [], hasImages: false, changed: true };
    }

    // Collect image URLs efficiently
    const activeUrls: string[] = [];
    
    for (const message of messages) {
      if (message.imageUrl) {
        activeUrls.push(message.imageUrl);
      }
      
      if (message.files) {
        for (const file of message.files) {
          if (file.type.startsWith('image/')) {
            activeUrls.push(file.url);
          }
        }
      }
    }

    const result = { messageCount: currentCount, contentSignature, urls: activeUrls, hasImages: true };
    lastCacheRef.current = result;
    return { urls: activeUrls, hasImages: true, changed: true };
  }, [messages]);

  return cachedImageUrls;
};