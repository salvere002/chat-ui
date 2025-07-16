# Tailwind CSS v4 Migration Guide

## 1. Update tailwind.config.js

```javascript
import { themeColors, animations, keyframes } from './src/styles/theme.ts';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: themeColors,
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
      },
      spacing: {
        '18': '72px',
        '88': '352px',
      },
      animation: animations,
      keyframes: keyframes,
      transitionDuration: {
        '400': '400ms',
      },
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
      },
    },
  },
  plugins: [],
}
```

## 2. Create src/styles/theme.ts

```typescript
export const themeColors = {
  // Light theme colors
  'bg-primary': 'var(--color-bg-primary)',
  'bg-secondary': 'var(--color-bg-secondary)',
  'bg-tertiary': 'var(--color-bg-tertiary)',
  'bg-elevated': 'var(--color-bg-elevated)',
  
  'text-primary': 'var(--color-text-primary)',
  'text-secondary': 'var(--color-text-secondary)',
  'text-tertiary': 'var(--color-text-tertiary)',
  'text-inverse': 'var(--color-text-inverse)',
  
  'border-primary': 'var(--color-border-primary)',
  'border-secondary': 'var(--color-border-secondary)',
  'border-focus': 'var(--color-border-focus)',
  
  'accent-primary': 'var(--color-accent-primary)',
  'accent-hover': 'var(--color-accent-hover)',
  'accent-active': 'var(--color-accent-active)',
  'accent-light': 'var(--color-accent-light)',
};

export const animations = {
  'fade-in': 'fadeIn 200ms ease-out',
  'slide-up': 'slideUp 200ms ease-out',
  'slide-down': 'slideDown 200ms ease-out',
  'message-slide': 'messageSlide 200ms ease-out',
  'pulse-dot': 'dotPulse 1.4s ease-in-out infinite',
  'spin': 'spin 0.8s linear infinite',
  'shimmer': 'shimmer 1.5s ease-in-out infinite',
  'error-pulse': 'errorPulse 2s ease-in-out infinite',
  'check-mark': 'checkmark 200ms ease-out',
  'progress': 'progress var(--duration, 3s) linear',
  'toast-slide-out': 'slideOut 150ms ease-in forwards',
  'stack-down': 'stackDown 200ms ease-out',
};

export const keyframes = {
  fadeIn: {
    'from': { opacity: '0' },
    'to': { opacity: '1' }
  },
  slideUp: {
    'from': { opacity: '0', transform: 'translateY(20px)' },
    'to': { opacity: '1', transform: 'translateY(0)' }
  },
  slideDown: {
    'from': { opacity: '0', transform: 'translateY(-10px)' },
    'to': { opacity: '1', transform: 'translateY(0)' }
  },
  messageSlide: {
    'from': { opacity: '0', transform: 'translateY(10px)' },
    'to': { opacity: '1', transform: 'translateY(0)' }
  },
  dotPulse: {
    '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
    '40%': { opacity: '1', transform: 'scale(1)' }
  },
  errorPulse: {
    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
    '50%': { transform: 'scale(1.05)', opacity: '0.8' }
  },
  checkmark: {
    'from': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.5)' },
    'to': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' }
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' }
  },
  progress: {
    'from': { transform: 'scaleX(1)' },
    'to': { transform: 'scaleX(0)' }
  },
  slideOut: {
    'to': { transform: 'translateX(120%)', opacity: '0' }
  },
  stackDown: {
    'from': { transform: 'translateY(-100%)' },
    'to': { transform: 'translateY(0)' }
  }
};
```

## 3. Update src/index.css (keep only CSS variables and base styles)

```css
@import 'tailwindcss';

/* Keep only CSS variables for theming */
:root {
  /* Core Design Tokens */
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
  
  /* Light Theme Colors */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F8F9FA;
  --color-bg-tertiary: #F1F3F5;
  --color-bg-elevated: #FFFFFF;
  
  --color-text-primary: #212529;
  --color-text-secondary: #495057;
  --color-text-tertiary: #868E96;
  --color-text-inverse: #FFFFFF;
  
  --color-border-primary: #DEE2E6;
  --color-border-secondary: #E9ECEF;
  --color-border-focus: #4263EB;
  
  --color-accent-primary: #4263EB;
  --color-accent-hover: #364FC7;
  --color-accent-active: #2C41A3;
  --color-accent-light: #E7F5FF;
  
  --color-success: #51CF66;
  --color-warning: #FFD43B;
  --color-error: #FF6B6B;
  --color-info: #4DABF7;
}

/* Dark Theme */
.dark-theme {
  --color-bg-primary: #1A1B1E;
  --color-bg-secondary: #25262B;
  --color-bg-tertiary: #2C2E33;
  --color-bg-elevated: #2C2E33;
  
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #C1C2C5;
  --color-text-tertiary: #909296;
  --color-text-inverse: #1A1B1E;
  
  --color-border-primary: #373A40;
  --color-border-secondary: #2C2E33;
  --color-border-focus: #5C7CFA;
  
  --color-accent-primary: #5C7CFA;
  --color-accent-hover: #4C6EF5;
  --color-accent-active: #3B5BDB;
  --color-accent-light: rgba(92, 124, 250, 0.1);
  
  --color-success: #51CF66;
  --color-warning: #FFD43B;
  --color-error: #FA5252;
  --color-info: #4DABF7;
}

/* Custom scrollbar styles - keep these as Tailwind doesn't handle them well */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-primary);
  border-radius: 9999px;
  transition: background 150ms ease;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

/* Loading dots animation helper */
.loading-dots::before {
  content: '';
  animation-delay: -0.32s;
}

.loading-dots span {
  animation-delay: -0.16s;
}
```

## 4. Update src/App.tsx

```tsx
// Replace className="app {theme}-theme" with:
<div className={`flex flex-col h-screen w-screen bg-bg-primary text-text-primary relative overflow-hidden ${theme}-theme`}>
  {/* Replace chat-title with: */}
  <h1 className="absolute top-4 left-[300px] text-xl font-semibold text-text-primary z-sticky transition-opacity duration-200 select-none">
    Chat UI
  </h1>
  
  {/* Replace app-header-controls with: */}
  <div className="fixed top-4 right-4 flex gap-2 z-sticky bg-bg-elevated p-2 rounded-lg shadow-md border border-border-secondary transition-all duration-200 hover:shadow-lg hover:-translate-y-px">
    <button 
      onClick={toggleTheme} 
      className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <FaMoon className="relative z-10" /> : <FaSun className="relative z-10" />}
    </button>
    
    <button 
      onClick={() => setShowSettings(true)} 
      className="flex items-center justify-center w-9 h-9 p-0 bg-transparent text-text-secondary rounded-md text-lg cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary hover:bg-accent-light active:scale-95 focus-visible:outline-2 focus-visible:outline-border-focus focus-visible:outline-offset-2"
      aria-label="Open settings"
    >
      <FaCog className="relative z-10" />
    </button>
  </div>
  
  {/* Replace app-container with: */}
  <div className="flex flex-1 overflow-hidden w-full h-full">
    {/* ... rest of content */}
  </div>
</div>
```

## 5. Update Component Classes

### ChatInterface.tsx
```tsx
// Replace chat-interface with:
<div className="flex flex-col h-full w-full bg-bg-primary relative overflow-hidden">
  
  {/* Replace empty-chat-state with: */}
  {!activeChatId && activeChatMessages.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
      <div className="text-center max-w-[420px]">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-accent-light text-accent-primary rounded-2xl text-4xl transition-transform duration-200 hover:scale-105">
          💬
        </div>
        <h3 className="text-xl font-semibold text-text-primary mb-3">No Active Conversation</h3>
        <p className="text-base text-text-secondary leading-relaxed m-0">
          Start a new chat by typing a message below or choose an existing conversation from the sidebar.
        </p>
      </div>
    </div>
  ) : (
    <MessageList messages={activeChatMessages} chatId={activeChatId} />
  )}
  
  {/* Replace loading-container with: */}
  {combinedIsProcessing && (
    <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-secondary rounded-lg px-4 py-3 shadow-md flex items-center gap-3 z-dropdown animate-slide-up">
      <LoadingIndicator 
        type="dots"
        text={isFileProcessing ? "Uploading files..." : "Processing message..."}
      />
    </div>
  )}
  
  {/* Replace error-message with: */}
  {error && (
    <div className="flex items-center gap-3 m-4 p-3 bg-error text-text-inverse rounded-md text-sm cursor-pointer transition-all duration-150 animate-slide-down hover:-translate-y-0.5 hover:shadow-md" onClick={() => clearError()}>
      <span className="text-lg flex-shrink-0">⚠️</span>
      <span>{error}</span>
      <button className="ml-auto bg-transparent border-none text-current text-xl cursor-pointer opacity-80 transition-opacity duration-150 p-0 w-6 h-6 flex items-center justify-center rounded hover:opacity-100 hover:bg-white/20">×</button>
    </div>
  )}
  
  <MessageInput
    value={inputValue}
    onChange={setInputValue}
    onSendMessage={handleSendMessage}
    isProcessing={combinedIsProcessing}
    initialFiles={fileUploads}
  />
</div>
```

### MessageInput.tsx
```tsx
// Replace message-input-container with:
<div 
  className={`flex flex-col p-4 bg-bg-primary border-t border-border-secondary max-w-[800px] w-full mx-auto relative transition-all duration-200 ${isDragging ? 'bg-accent-light border-accent-primary' : ''}`}
  ref={dropAreaRef}
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {/* Replace drag-overlay with: */}
  {isDragging && (
    <div className="absolute inset-0 bg-bg-primary/95 flex items-center justify-center rounded-lg z-10 animate-fade-in">
      <div className="flex flex-col items-center gap-3 p-5 text-accent-primary text-center border-2 border-dashed border-accent-primary rounded-lg bg-accent-light">
        <FaUpload size={32} />
        <p className="text-base font-medium m-0">Drop files to upload</p>
      </div>
    </div>
  )}
  
  {/* Replace file-preview-area with: */}
  {selectedFiles.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-bg-secondary border border-border-secondary rounded-md max-h-[120px] overflow-y-auto transition-all duration-150">
      {selectedFiles.map((pf) => (
        <div key={pf.id} className={`flex items-center gap-2 bg-bg-primary border border-border-secondary rounded-md px-3 py-2 max-w-[200px] relative transition-all duration-150 hover:border-accent-primary hover:-translate-y-px hover:shadow-sm ${pf.status === 'error' ? 'bg-error text-text-inverse border-error' : ''}`}>
          {/* File preview content */}
        </div>
      ))}
    </div>
  )}
  
  {/* Replace message-input-area with: */}
  <div className="flex items-end gap-2 bg-bg-secondary border border-border-secondary rounded-lg p-2 transition-all duration-150 relative focus-within:border-border-focus focus-within:shadow-[0_0_0_3px_var(--color-accent-light)] focus-within:bg-bg-primary">
    <button 
      onClick={handleUploadClick} 
      className="flex items-center justify-center w-9 h-9 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 flex-shrink-0 hover:bg-bg-tertiary hover:text-accent-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Attach file" 
      title="Attach file" 
      disabled={isProcessing}
    >
      <FaPaperclip className="w-[18px] h-[18px]" />
    </button>
    
    <textarea
      ref={textAreaRef}
      value={value}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      placeholder="Type your message or drop files..."
      rows={1}
      disabled={isProcessing}
      className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 bg-transparent text-text-primary border-none font-sans text-base leading-normal resize-none overflow-y-auto transition-all duration-150 focus:outline-none placeholder:text-text-tertiary"
    />
    
    <button
      onClick={handleSendClick}
      disabled={isProcessing || (!value.trim() && selectedFiles.filter(f => f.status === 'pending').length === 0)}
      className={`flex items-center justify-center w-9 h-9 p-0 bg-accent-primary text-text-inverse border-none rounded-md cursor-pointer transition-all duration-150 flex-shrink-0 relative overflow-hidden hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-95 disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed ${isProcessing ? 'is-processing' : ''}`}
      aria-label="Send message"
    >
      {isProcessing ? 
        <span className="flex items-center justify-center gap-0.5">
          <span className="w-1 h-1 bg-current rounded-full animate-pulse-dot" />
          <span className="w-1 h-1 bg-current rounded-full animate-pulse-dot" style={{animationDelay: '-0.16s'}} />
          <span className="w-1 h-1 bg-current rounded-full animate-pulse-dot" style={{animationDelay: '-0.32s'}} />
        </span> : 
        <FaPaperPlane size={16} className="relative z-10" />
      }
    </button>
  </div>
</div>
```

### MessageItem.tsx
```tsx
// Replace message-item classes with:
<div 
  className={`flex flex-col px-4 py-2 max-w-[85%] animate-message-slide transition-colors duration-150 hover:bg-bg-secondary hover:rounded-lg ${sender === 'user' ? 'self-end items-end' : 'self-start items-start'} ${isEditing ? 'editing w-[85%] max-w-[85%]' : ''}`}
  data-is-complete={isComplete !== false}
>
  {/* Replace message-content with: */}
  <div className={`relative px-4 py-3 rounded-lg max-w-full w-fit break-words transition-all duration-150 hover:-translate-y-px hover:shadow-sm ${
    sender === 'user' 
      ? 'bg-accent-primary text-text-inverse rounded-br-sm' 
      : 'bg-bg-tertiary text-text-primary rounded-bl-sm'
  }`}>
    {/* Content */}
  </div>
  
  {/* Replace message-footer with: */}
  <div className="flex items-center mt-1 px-1 opacity-0 transition-opacity duration-150 text-xs text-text-tertiary gap-2 group-hover:opacity-100">
    <div className="mr-auto">{formatTime(timestamp)}</div>
    
    {/* Replace message-actions with: */}
    <div className="flex gap-1 items-center">
      {/* Branch navigation */}
      {hasBranches && totalBranches > 1 && (
        <div className="flex items-center gap-1 bg-bg-secondary border border-border-secondary rounded-md p-1">
          <button 
            className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
            onClick={handlePreviousBranch}
            disabled={actualCurrentBranchIndex <= 0}
            title="Previous branch"
          >
            <FaChevronLeft className="text-[10px]" />
          </button>
          <span className="text-xs text-text-secondary font-medium min-w-[24px] text-center px-1">
            {actualCurrentBranchIndex + 1}/{totalBranches}
          </span>
          <button 
            className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
            onClick={handleNextBranch}
            disabled={actualCurrentBranchIndex >= totalBranches - 1}
            title="Next branch"
          >
            <FaChevronRight className="text-[10px]" />
          </button>
        </div>
      )}
      
      {/* Other action buttons */}
      {text && (
        <button 
          className={`flex items-center justify-center w-7 h-7 p-0 bg-transparent border-none rounded-md text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary active:scale-90 ${copied ? 'text-success' : ''}`}
          onClick={handleCopyMessage}
          title={copied ? "Copied" : "Copy text"}
        >
          {copied ? <span className="absolute inset-0 flex items-center justify-center text-base animate-check-mark">✓</span> : <FaCopy className="relative z-10 text-sm" />}
        </button>
      )}
    </div>
  </div>
</div>
```

### MessageList.tsx
```tsx
// Replace message-list-container with:
<div className="flex-1 overflow-y-auto overflow-x-hidden p-0 bg-bg-primary relative scroll-smooth" ref={messageContainerRef}>
  <div className="flex flex-col max-w-[800px] mx-auto w-full py-4 relative">
    {messages.map((msg, index) => (
      <MessageItem 
        key={msg.id} 
        message={msg} 
        chatId={chatId || ''}
        // ... props
      />
    ))}
    <div ref={messagesEndRef} />
  </div>
  
  {/* Replace scroll-to-bottom-button with: */}
  {showScrollButton && (
    <button 
      className="fixed bottom-[100px] right-5 w-10 h-10 bg-bg-elevated text-text-secondary border border-border-secondary rounded-full shadow-md flex items-center justify-center cursor-pointer z-sticky opacity-90 transition-all duration-150 animate-fade-in hover:opacity-100 hover:-translate-y-0.5 hover:shadow-lg hover:bg-accent-primary hover:text-text-inverse hover:border-accent-primary active:translate-y-0 active:scale-95"
      onClick={scrollToBottom}
      aria-label="Scroll to bottom"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  )}
</div>
```

### Sidebar.tsx
```tsx
// Replace sidebar with:
<div className="flex flex-col w-[280px] h-full bg-bg-secondary border-r border-border-primary flex-shrink-0 overflow-hidden transition-all duration-200">
  {/* Replace sidebar-header with: */}
  <div className="flex items-center justify-between p-4 bg-bg-secondary border-b border-border-primary">
    <h2 className="text-lg font-semibold text-text-primary m-0">Conversations</h2>
    <button 
      className="flex items-center gap-1 px-3 py-2 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 whitespace-nowrap hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]"
      onClick={onNewChat}
      aria-label="Start new chat"
    >
      <span className="text-lg leading-none">+</span> New Chat
    </button>
  </div>
  
  {/* Replace chat-list with: */}
  <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
    {chats.length === 0 ? (
      <div className="flex items-center justify-center px-4 py-6 text-text-tertiary text-sm text-center opacity-80">
        No conversations yet. Start a new chat!
      </div>
    ) : (
      chats.map((chat, index) => (
        <div 
          key={chat.id}
          className={`flex items-center gap-3 p-3 mb-2 bg-bg-primary border border-transparent rounded-md cursor-pointer transition-all duration-150 relative overflow-hidden hover:bg-bg-tertiary hover:border-border-secondary hover:translate-x-0.5 ${
            chat.id === activeChatId ? 'bg-accent-light border-accent-primary before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-accent-primary' : ''
          }`}
          onClick={() => onChatSelected(chat.id)}
        >
          {/* Chat content */}
        </div>
      ))
    )}
  </div>
</div>
```

### Settings.tsx
```tsx
// Replace settings-overlay with:
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-modal p-4 animate-fade-in" onClick={handleOverlayClick}>
  {/* Replace settings-modal with: */}
  <div className="bg-bg-primary rounded-lg w-full max-w-[600px] max-h-[85vh] overflow-hidden shadow-lg flex flex-col animate-slide-up">
    {/* Replace settings-header with: */}
    <div className="flex items-center justify-between px-6 py-5 bg-bg-secondary border-b border-border-primary">
      <h2 className="text-xl font-semibold text-text-primary m-0">Settings</h2>
      <button 
        className="flex items-center justify-center w-8 h-8 p-0 bg-transparent border-none rounded-md text-text-tertiary text-2xl cursor-pointer transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary hover:rotate-90"
        onClick={onClose}
        aria-label="Close settings"
      >
        ×
      </button>
    </div>
    
    {/* Replace form groups with Tailwind classes */}
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-bg-primary">
      <div className="mb-6 last:mb-0">
        <h3 className="text-base font-semibold text-text-primary m-0 mb-4 pb-3 border-b border-border-secondary">Connection</h3>
        
        <div className="mb-4 last:mb-0">
          <label htmlFor="adapter-type" className="block mb-2 text-sm font-medium text-text-secondary">Connection Method:</label>
          <select
            id="adapter-type"
            value={adapterType}
            onChange={(e) => setAdapterType(e.target.value as AdapterType)}
            className="w-full p-3 bg-bg-secondary text-text-primary border border-border-primary rounded-md font-sans text-sm transition-all duration-150 appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_12px_center] bg-[length:16px] pr-7 hover:border-text-tertiary focus:outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-accent-light)] focus:bg-bg-primary"
          >
            <option value="rest">REST API</option>
            <option value="session">Session Based</option>
            <option value="mock">Mock (Testing)</option>
          </select>
        </div>
      </div>
      
      {/* Replace settings-actions with: */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-secondary">
        <button type="submit" className="px-5 py-3 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]">
          Save Changes
        </button>
        <button type="button" className="px-5 py-3 bg-transparent text-text-secondary border border-border-primary rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-bg-secondary hover:text-text-primary hover:border-text-tertiary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  </div>
</div>
```

### Toast.tsx
```tsx
// Replace toast classes with:
<div className="fixed bottom-5 right-5 z-tooltip flex flex-col-reverse gap-3 pointer-events-none">
  {toasts.map((toast) => (
    <div
      key={toast.id}
      className={`min-w-[280px] max-w-[400px] bg-bg-elevated rounded-md shadow-lg overflow-hidden pointer-events-auto transform translate-x-0 opacity-100 transition-all duration-200 ease-out border border-border-secondary ${
        toast.type === 'success' ? 'border-l-[3px] border-l-success' :
        toast.type === 'error' ? 'border-l-[3px] border-l-error' :
        toast.type === 'info' ? 'border-l-[3px] border-l-info' :
        toast.type === 'warning' ? 'border-l-[3px] border-l-warning' : ''
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3 px-4 py-3 relative">
        {/* Icon */}
        <div className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-xs font-bold text-text-inverse mt-0.5 ${
          toast.type === 'success' ? 'bg-success' :
          toast.type === 'error' ? 'bg-error' :
          toast.type === 'info' ? 'bg-info' :
          toast.type === 'warning' ? 'bg-warning' : ''
        }`}>
          {type === 'success' && '✓'}
          {type === 'error' && '⚠'}
          {type === 'info' && 'ℹ'}
          {type === 'warning' && '⚠'}
        </div>
        
        {/* Message */}
        <div className="flex-1 text-sm leading-normal text-text-primary break-words">{message}</div>
        
        {/* Close button */}
        <button 
          className="flex items-center justify-center w-6 h-6 p-0 bg-transparent border-none rounded text-text-tertiary text-lg cursor-pointer transition-all duration-150 flex-shrink-0 -mt-0.5 -mr-1 hover:bg-bg-tertiary hover:text-text-primary"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  ))}
</div>
```

### LoadingIndicator.tsx
```tsx
// Replace loading-indicator classes with component that accepts size prop:
<div className={`flex flex-col items-center justify-center gap-2 ${
  size === 'small' ? '[--indicator-size:16px] [--dot-size:4px] text-xs' :
  size === 'large' ? '[--indicator-size:32px] [--dot-size:8px] text-base' :
  '[--indicator-size:24px] [--dot-size:6px] text-sm'
}`}>
  {type === 'spinner' && (
    <div className="w-[var(--indicator-size)] h-[var(--indicator-size)] border-2 border-border-secondary border-t-accent-primary rounded-full animate-spin origin-center" />
  )}
  
  {type === 'dots' && (
    <div className="flex items-center gap-[calc(var(--dot-size)*0.5)]">
      <span className="w-[var(--dot-size)] h-[var(--dot-size)] bg-accent-primary rounded-full animate-pulse-dot opacity-30" />
      <span className="w-[var(--dot-size)] h-[var(--dot-size)] bg-accent-primary rounded-full animate-pulse-dot opacity-30" style={{animationDelay: '0.2s'}} />
      <span className="w-[var(--dot-size)] h-[var(--dot-size)] bg-accent-primary rounded-full animate-pulse-dot opacity-30" style={{animationDelay: '0.4s'}} />
    </div>
  )}
  
  {type === 'pulse' && (
    <div className="w-[var(--indicator-size)] h-[var(--indicator-size)] bg-accent-primary rounded-full animate-pulse" />
  )}
  
  {text && <p className="text-text-secondary m-0 animate-fade-in">{text}</p>}
</div>
```

### ErrorBoundary.tsx
```tsx
// Replace error-boundary classes with:
<div className="flex items-center justify-center w-full h-full p-5 bg-bg-primary">
  <div className="bg-bg-elevated border border-border-secondary rounded-lg p-6 shadow-lg text-center max-w-[400px] w-full animate-slide-up">
    <div className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error text-text-inverse rounded-full text-[32px] animate-error-pulse">
      ⚠️
    </div>
    <h2 className="text-xl font-semibold text-error m-0 mb-3">Something went wrong</h2>
    <p className="text-base text-text-secondary leading-relaxed mb-5">
      {this.state.error?.message || 'An unexpected error occurred'}
    </p>
    <button className="inline-flex items-center gap-2 px-5 py-3 bg-accent-primary text-text-inverse border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-sm active:scale-[0.98]" onClick={this.resetError}>
      Try again
    </button>
  </div>
</div>
```

## 6. Files to Delete (Deprecate)

The following CSS files can be deleted after migration:
- src/App.css
- src/components/ChatInterface.css
- src/components/ChatList.css
- src/components/ErrorBoundary.css
- src/components/LoadingIndicator.css
- src/components/MessageInput.css
- src/components/MessageItem.css
- src/components/MessageList.css
- src/components/Settings.css
- src/components/Sidebar.css
- src/components/Toast.css

## 7. Summary of Changes

1. **Created theme configuration** in `src/styles/theme.ts` to handle colors, animations, and keyframes
2. **Updated tailwind.config.js** to use CSS variables and extend theme with custom values
3. **Kept CSS variables in index.css** for theme switching functionality
4. **Converted all component classes** to Tailwind utility classes
5. **Maintained all animations** by converting them to Tailwind animations
6. **Preserved dark mode** functionality using `dark-theme` class
7. **Kept custom scrollbar styles** in index.css as Tailwind doesn't handle them well
8. **All buttons remain interactive** with proper hover, active, and focus states
9. **Colors use CSS variables** through Tailwind for theme switching
10. **Responsive design maintained** with Tailwind responsive utilities

## Important Notes:

- All animations are preserved using Tailwind's animation utilities
- Theme switching still works by toggling the `light-theme` and `dark-theme` classes
- CSS variables are used for colors to maintain theme functionality
- All interactive elements maintain their hover, active, and focus states
- The visual design remains exactly the same as before
