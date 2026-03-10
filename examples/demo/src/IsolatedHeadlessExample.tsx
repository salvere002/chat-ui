import React, { useState } from 'react';
import { useIsolatedChatHeadless } from 'chat-ui';

const IsolatedHeadlessExample: React.FC = () => {
  const [input, setInput] = useState('');

  const chat = useIsolatedChatHeadless({
    serviceConfig: { adapterType: 'mock' },
    initialResponseMode: 'stream',
  });

  const handleSend = async () => {
    const pendingFiles = chat.selectedFiles
      .filter((file) => file.status === 'pending')
      .map((file) => ({ id: file.id, file: file.file }));

    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    await chat.handleSendMessage(text, pendingFiles.length > 0 ? pendingFiles : undefined);
    setInput('');
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        gap: 12,
        height: '100%',
        padding: 12,
        background: '#f8fafc',
      }}
    >
      <aside style={{ border: '1px solid #dbe1ea', borderRadius: 10, background: '#fff', padding: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Chats</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => chat.createChat('New Chat')}>New</button>
          <button onClick={chat.clearChats}>Clear</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => chat.setSelectedResponseMode('stream')}
            style={{ fontWeight: chat.selectedResponseMode === 'stream' ? 700 : 400 }}
          >
            Stream
          </button>
          <button
            onClick={() => chat.setSelectedResponseMode('fetch')}
            style={{ fontWeight: chat.selectedResponseMode === 'fetch' ? 700 : 400 }}
          >
            Fetch
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {chat.chatSessions.map((session) => (
            <div
              key={session.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 8,
                cursor: 'pointer',
                background: chat.activeChatId === session.id ? '#eaf4ff' : '#fff',
              }}
              onClick={() => chat.setActiveChat(session.id)}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{session.title || session.name || 'Untitled'}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{session.messages.length} messages</div>
              <button
                style={{ marginTop: 6 }}
                onClick={(event) => {
                  event.stopPropagation();
                  chat.deleteChat(session.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section style={{ border: '1px solid #dbe1ea', borderRadius: 10, background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #eef2f7', fontWeight: 700 }}>
          Isolated Headless UI
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {chat.activeChatMessages.length === 0 ? (
            <div style={{ color: '#6b7280' }}>No messages yet. Send one below.</div>
          ) : (
            chat.activeChatMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: 10,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: message.sender === 'user' ? '#f5f9ff' : '#fff',
                }}
              >
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                  {message.sender === 'user' ? 'You' : 'AI'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{message.text || (message.isComplete === false ? '...' : '')}</div>
                {message.thinkingContent ? (
                  <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: '#f8fafc', fontSize: 13 }}>
                    <strong>Thinking:</strong> {message.thinkingContent}
                  </div>
                ) : null}
                {message.imageUrl ? (
                  <img
                    src={message.imageUrl}
                    alt="ai"
                    style={{ marginTop: 8, maxWidth: 320, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                ) : null}
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '1px solid #eef2f7', padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="file"
              multiple
              onChange={(event) => {
                if (!event.target.files) return;
                chat.processFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <button onClick={chat.stop} disabled={!chat.isStreaming}>
              Stop
            </button>
          </div>

          {chat.selectedFiles.length > 0 ? (
            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {chat.selectedFiles.map((file) => (
                <div key={file.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '4px 8px', fontSize: 12 }}>
                  {file.file.name} ({file.status})
                  {file.status === 'pending' ? (
                    <button style={{ marginLeft: 6 }} onClick={() => chat.handleFileRemove(file.id)}>
                      x
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '8px 10px' }}
            />
            <button onClick={handleSend} disabled={chat.combinedIsProcessing && !chat.isFileProcessing}>
              Send
            </button>
          </div>

          {chat.error ? (
            <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>
              {chat.error} <button onClick={chat.clearError}>Dismiss</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default IsolatedHeadlessExample;
