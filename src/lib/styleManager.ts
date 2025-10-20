// Runtime style injection for Chat UI
// Ensures consumers do not need to import CSS manually.

// Import compiled CSS as inline text so we can inject it directly.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Vite provides '?inline' to import asset content as string
import styleContent from './style.css?inline';

const STYLESHEET_ID = 'chatui-stylesheet';

export function ensureChatUiStyles() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (document.getElementById(STYLESHEET_ID)) return;

  try {
    const styleEl = document.createElement('style');
    styleEl.id = STYLESHEET_ID;
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(String(styleContent)));
    document.head.appendChild(styleEl);
  } catch (e) {
    // Non-fatal: if we cannot inject styles, allow consumer to import CSS manually
    // eslint-disable-next-line no-console
    console.warn('ChatUI: failed to inject stylesheet automatically.', e);
  }
}
