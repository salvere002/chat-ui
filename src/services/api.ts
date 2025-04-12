import { MessageFile } from "../types/chat";

// API base URL - can be configured based on environment
const API_BASE_URL = "http://localhost:5001/api";

// Define API response types
export interface StreamResponseChunk {
  text?: string;
  imageUrl?: string;
  complete?: boolean;
}

export interface FetchResponse {
  text: string;
  imageUrl?: string;
}

// Callbacks for stream response handling
export interface StreamCallbacks {
  onChunk: (chunk: StreamResponseChunk) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

/**
 * Uploads a single file to the backend
 */
export async function uploadFile(
  fileWithId: { id: string; file: File },
  onProgress: (id: string, progress: number) => void
): Promise<MessageFile> {
  const { id, file } = fileWithId;
  
  return new Promise(async (resolve, reject) => {
    try {
      // Start progress indicator
      onProgress(id, 0);
      
      // Create form data to send the file
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate varying progress before the actual upload
      const progressInterval = setInterval(() => {
        const progress = Math.min(85, Math.random() * 30 + 55); // Cap at 85%
        onProgress(id, Math.round(progress));
      }, 300);
      
      // Upload the file
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      // Clear the progress interval
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
      }
      
      // Get the uploaded file data
      const data = await response.json();
      
      // Set progress to 100%
      onProgress(id, 100);
      
      // For images, ensure we have a full URL for the API
      let fileUrl = data.url;
      if (fileUrl.startsWith('/')) {
        fileUrl = `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
      }
      
      // Return the file metadata
      resolve({
        id: data.id || `backend-${id}`,
        name: data.name || file.name,
        type: data.type || file.type,
        size: data.size || file.size,
        url: fileUrl,
      });
    } catch (error) {
      console.error(`Upload error for ${id}:`, error);
      reject(error);
    }
  });
}

/**
 * Sends a message and receives a streaming response
 */
export async function sendStreamRequest(
  text: string,
  uploadedFiles: MessageFile[],
  callbacks: StreamCallbacks
): Promise<void> {
  const { onChunk, onComplete, onError } = callbacks;
  
  try {
    // Create the request to the streaming endpoint
    const response = await fetch(`${API_BASE_URL}/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        files: uploadedFiles,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Stream request failed with status: ${response.status}`);
    }
    
    // Get the reader from the response body stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get stream reader');
    }
    
    // Create a text decoder for processing chunks
    const decoder = new TextDecoder();
    let buffer = '';
    
    // Process stream chunks
    const processStream = async () => {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // If there's any buffer left, process it
          if (buffer) {
            processEventData(buffer);
          }
          onComplete();
          break;
        }
        
        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process any complete events in the buffer
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last potentially incomplete event
        
        for (const line of lines) {
          if (line.trim() && line.startsWith('data:')) {
            processEventData(line);
          }
        }
      }
    };
    
    // Process a single event data line
    const processEventData = (eventLine: string) => {
      try {
        // Extract the JSON data from the event line
        const dataStr = eventLine.slice(eventLine.indexOf(':') + 1).trim();
        const data = JSON.parse(dataStr);
        
        // Check if this is a completion event
        if (data.complete) {
          onComplete();
          return;
        }
        
        // Process the chunk
        onChunk({
          text: data.text,
          imageUrl: data.imageUrl,
        });
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };
    
    // Start processing the stream
    processStream();
  } catch (err) {
    console.error('Error in stream request:', err);
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Sends a message and receives a complete response
 */
export async function sendFetchRequest(
  text: string,
  uploadedFiles: MessageFile[]
): Promise<FetchResponse> {
  // Call the fetch API endpoint
  const response = await fetch(`${API_BASE_URL}/message/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      files: uploadedFiles,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Fetch request failed with status: ${response.status}`);
  }
  
  // Parse and return the response data
  const data = await response.json();
  return {
    text: data.text,
    imageUrl: data.imageUrl,
  };
} 