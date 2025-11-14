/**
 * Screenshot Utility (Snapdom based)
 *
 * Captures the current conversation view as a PNG using Snapdom.
 * Keeps the same API contract used in the app.
 */

import { snapdom } from '@zumer/snapdom';

export type ConversationScreenshotOptions = {
  width?: number; // Fixed capture width (CSS px)
  pixelRatio?: number; // Canvas scale factor
  selector?: string; // Root selector
  backgroundColor?: string; // Optional background override
  disableAnimations?: boolean; // Best-effort disable
  debug?: boolean; // Verbose logging
};

export type ConversationScreenshotResult = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
};

const DEFAULT_WIDTH = 800;
const DEFAULT_PIXEL_RATIO = 2;

export async function captureConversationScreenshot(
  opts: ConversationScreenshotOptions = {}
): Promise<ConversationScreenshotResult> {
  const {
    width = DEFAULT_WIDTH,
    pixelRatio = DEFAULT_PIXEL_RATIO,
    selector = '[data-conversation-root]',
    backgroundColor,
    disableAnimations = true,
    debug = false,
  } = opts;
  
  if (debug) {
    console.log('[Screenshot] Starting capture with options:', { width, pixelRatio, selector, backgroundColor });
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('captureConversationScreenshot must be called in a browser environment');
  }

  const root = document.querySelector<HTMLElement>(selector);
  if (!root) throw new Error('Conversation content not found. Open a chat with messages, then try again.');

  // Best-effort font readiness
  try {
    const fonts = (document as any).fonts;
    if (fonts && typeof fonts.ready?.then === 'function') {
      await Promise.race([
        fonts.ready,
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    }
  } catch {}

  // Prepare an offscreen, visible wrapper with a cloned subtree for deterministic layout
  const { wrapper, height } = await prepareCaptureWrapper(root, width, disableAnimations);

  const bg = backgroundColor || getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary') || '#ffffff';

  // Snapdom is much faster and more efficient than html2canvas
  // It can handle very tall content without tiling in most cases
  try {
    if (debug) {
      console.log('[Screenshot] Capturing with Snapdom:', { width, height });
    }

    // Snapdom configuration
    const snapdomOptions = {
      width,
      height,
      scale: pixelRatio,
      backgroundColor: String(bg).trim() || '#ffffff',
      debug,
      embedFonts: true, // Embed fonts for better compatibility
      placeholders: true, // Use placeholders for broken images
      cache: 'soft' as const, // Use soft cache for better performance
    };

    // Use snapdom.toBlob to get a Blob directly
    const blob = await snapdom.toBlob(wrapper, {
      ...snapdomOptions,
      type: 'png',
      quality: 0.95,
    });

    // Convert blob to data URL for compatibility
    const dataUrl = await blobToDataURL(blob);

    wrapper.remove();
    
    if (debug) {
      console.log('[Screenshot] Capture complete:', { width, height, blobSize: blob.size });
    }

    return { blob, dataUrl, width, height };
  } catch (e) {
    wrapper.remove();
    const errorMsg = e instanceof Error ? e.message : 'Failed to capture conversation screenshot';
    if (debug) {
      console.error('[Screenshot] Error:', e);
    }
    throw new Error(errorMsg);
  }
}

// --- helpers ---

async function prepareCaptureWrapper(node: HTMLElement, width: number, disableAnimations: boolean): Promise<{ wrapper: HTMLElement; height: number }> {
  const clone = node.cloneNode(true) as HTMLElement;
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${width}px`;
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.overflow = 'hidden';
  // Keep visible to avoid cloning visibility:hidden into snapshot
  wrapper.style.visibility = 'visible';
  if (disableAnimations) {
    const style = document.createElement('style');
    style.textContent = '*{animation:none!important;transition:none!important}';
    wrapper.appendChild(style);
  }
  // Tag wrapper for scoping fixes during capture
  wrapper.classList.add('__screenshot_fix');
  // Inject layout fixes to prevent margin-collapsing gaps in markdown prose
  const fix = document.createElement('style');
  fix.textContent = `
  .__screenshot_fix .message-bubble .prose{display:flow-root}
  .__screenshot_fix .message-bubble .prose > :first-child{margin-top:0 !important}
  .__screenshot_fix .message-bubble .prose > :last-child{margin-bottom:0 !important}
  `;
  wrapper.appendChild(fix);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  // Eager-load images in the clone to avoid lazy-loading blanks
  const imgs = Array.from(wrapper.querySelectorAll('img')) as HTMLImageElement[];
  for (const img of imgs) {
    try {
      const srcNow = (img.currentSrc || (img as any).src || img.getAttribute('src') || '') as string;
      if (srcNow) img.src = srcNow;
      img.removeAttribute('loading');
      img.setAttribute('loading', 'eager');
      img.setAttribute('decoding', 'sync');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
    } catch {}
  }
  // Wait for images to settle for accurate height
  try { await waitForImages(wrapper, 6000); } catch {}
  const height = Math.ceil(wrapper.scrollHeight);
  // Do not remove wrapper; caller will remove after capture
  return { wrapper, height: Math.max(1, height) };
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

async function waitForImages(root: HTMLElement, perImageTimeoutMs = 5000): Promise<void> {
  const images = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
  await Promise.all(images.map((img) => new Promise<void>((resolve) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    img.addEventListener('load', finish, { once: true });
    img.addEventListener('error', finish, { once: true });
    const t = setTimeout(finish, perImageTimeoutMs);
    // Also try decode when available
    if ('decode' in img && typeof (img as any).decode === 'function') {
      (img as any).decode().finally(() => { clearTimeout(t); finish(); });
    }
  })));
}

export default { captureConversationScreenshot };
