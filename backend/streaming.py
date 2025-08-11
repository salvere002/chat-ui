import json
import time
from flask import Response

def create_sse_response(data_generator):
    """
    Create a Server-Sent Events (SSE) response from a data generator
    
    Args:
        data_generator: Generator function that yields data chunks
        
    Returns:
        Flask Response object configured for SSE
    """
    def stream():
        for data in data_generator:
            # Format the data as a Server-Sent Event
            yield f"data: {json.dumps(data)}\n\n"
            
    return Response(stream(), mimetype="text/event-stream")

def chunk_text(text, chunk_size=3):
    """
    Split text into chunks for streaming
    
    Args:
        text: The full text to split
        chunk_size: Number of words per chunk
        
    Returns:
        Generator that yields chunks of text
    """
    words = text.split(' ')
    
    for i in range(0, len(words), chunk_size):
        chunk = words[i:i+chunk_size]
        # Add a space after each chunk except for the last one
        yield ' '.join(chunk) + (' ' if i + chunk_size < len(words) else '')
        time.sleep(0.1)  # Simulate network delay

def stream_response_generator(text, uploaded_files, image_url=None, chart_response=None):
    """
    Generator function that yields response chunks
    
    Args:
        text: The user's input text
        uploaded_files: List of uploaded file metadata
        image_url: Optional image URL to include in the response
        chart_response: Optional chart response text
        
    Returns:
        Generator that yields response chunks
    """
    # Check if thinking mode should be enabled
    enable_thinking = '/think' in text
    
    # Stream thinking content first if thinking mode is enabled
    if enable_thinking:
        thinking_steps = [
            "Let me think about this question...",
            " I need to consider multiple aspects here.",
            " First, let me analyze the user's intent.",
            " They seem to be asking about...",
            " Based on my understanding, I should provide...",
            " Let me structure my response carefully.",
            " I'll make sure to cover all important points."
        ]

        # Stream thinking content
        for i, thinking_step in enumerate(thinking_steps):
            time.sleep(0.3)  # Simulate thinking delay
            
            yield {
                "thinking": thinking_step,
                "thinkingComplete": False,
                "thinkingMetadata": {
                    "backend": "python",
                    "format": "streaming",
                    "step": i + 1
                }
            }

        # Mark thinking complete
        time.sleep(0.2)
        yield {
            "thinking": "",
            "thinkingComplete": True,
            "thinkingMetadata": {
                "backend": "python",
                "format": "streaming"
            }
        }
    
    # Create the full response text
    if chart_response:
        full_response_text = chart_response
    else:
        full_response_text = f"AI stream response to: \"{text}\". Files received: {', '.join([f['name'] for f in uploaded_files]) if uploaded_files else 'None'}. This response streams in chunks."
    
    # Stream the text in chunks
    sent_image = False
    for chunk in chunk_text(full_response_text):
        # Decide if we should send the image with this chunk
        chunk_image_url = None
        if image_url and not sent_image and len(chunk) > 10:  # Send image after some text
            chunk_image_url = image_url
            sent_image = True
            
        yield {
            "text": chunk,
            "imageUrl": chunk_image_url
        }
        
    # Signal completion
    yield {"complete": True} 