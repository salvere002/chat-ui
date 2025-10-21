import React, { useRef, useState } from 'react';
import ChatUI from 'chat-ui';

type Mode = 'full' | 'resizable';

export default function App() {
  const [mode, setMode] = useState<Mode>('full');
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 420, h: 560 });
  const dragCtx = useRef<null | { sx: number; sy: number; w: number; h: number }>(null);

  const onStartDrag = (e: React.MouseEvent) => {
    dragCtx.current = { sx: e.clientX, sy: e.clientY, w: size.w, h: size.h };
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', onEndDrag);
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrag = (e: MouseEvent) => {
    const ctx = dragCtx.current;
    if (!ctx) return;
    const dw = ctx.w + (e.clientX - ctx.sx);
    const dh = ctx.h + (e.clientY - ctx.sy);
    const maxW = Math.max(320, window.innerWidth - 32); // keep some margin from edges
    const maxH = Math.max(360, window.innerHeight - 80); // leave space for toolbar
    setSize({
      w: Math.max(300, Math.min(dw, maxW)),
      h: Math.max(360, Math.min(dh, maxH)),
    });
  };

  const onEndDrag = () => {
    dragCtx.current = null;
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', onEndDrag);
  };

  return (
    <div style={{ height: '100%' }}>
      <div className="toolbar">
        <strong>Chat UI Demo</strong>
        <button
          className={mode === 'full' ? 'active' : ''}
          onClick={() => setMode('full')}
        >
          Fullscreen
        </button>
        <button
          className={mode === 'resizable' ? 'active' : ''}
          onClick={() => setMode('resizable')}
        >
          Resizable
        </button>
      </div>

      <div className="content">
        {mode === 'full' ? (
          <ChatUI
            title="Chat UI (Fullscreen)"
            // Use mock adapter so the demo works without a backend
            serviceConfig={{ adapterType: 'mock' }}
            initialTheme="light"
            initialResponseMode="stream"
          />
        ) : (
          <div
            className="widget-anchor"
            style={{
              position: 'fixed',
              right: 16,
              bottom: 16,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: 'white',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              minWidth: 300,
              minHeight: 360,
              width: size.w,
              height: size.h,
            }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              <ChatUI
                title="Chat UI (Resizable)"
                variant="auto"
                hideHeader={undefined}
                serviceConfig={{ adapterType: 'mock' }}
                initialTheme="light"
                initialResponseMode="stream"
              />
            </div>
            <div
              onMouseDown={onStartDrag}
              title="Drag to resize"
              style={{ position: 'absolute', width: 16, height: 16, right: 0, bottom: 0, cursor: 'nwse-resize', zIndex: 9999, background: 'transparent' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
