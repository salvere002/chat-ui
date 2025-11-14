/**
 * Screenshot Utility (html-to-image based)
 *
 * Captures the current conversation view as a PNG using html-to-image.
 * Keeps the same API contract used in the app, and adds optional
 * window-based partial capture support.
 */

import { toBlob } from 'html-to-image';

export type WindowSelection = {
  mode: 'window';
  anchorMessageId: string;
  beforeCount: number;
  afterCount?: number; // default 0
  allowPartial?: boolean; // default true
};

export type ConversationScreenshotOptions = {
  width?: number; // Fixed capture width (CSS px)
  pixelRatio?: number; // Canvas scale factor
  selector?: string; // Root selector
  backgroundColor?: string; // Optional background override
  disableAnimations?: boolean; // Best-effort disable
  debug?: boolean; // Verbose logging
  // Partial capture options
  selection?: WindowSelection; // Capture a window around an anchor message
  paddingTop?: number; // Extra padding above selection (px)
  paddingBottom?: number; // Extra padding below selection (px)
  excludeSelectors?: string[]; // Extra selectors to remove when selection is active
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
    selection,
    paddingTop = 0,
    paddingBottom = 0,
    excludeSelectors,
  } = opts;

  if (debug) {
    console.log('[Screenshot] Starting capture with options:', {
      width,
      pixelRatio,
      selector,
      backgroundColor,
      selection,
      paddingTop,
      paddingBottom,
    });
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('captureConversationScreenshot must be called in a browser environment');
  }

  const root = document.querySelector<HTMLElement>(selector);
  if (!root) {
    throw new Error('Conversation content not found. Open a chat with messages, then try again.');
  }

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
  const { wrapper, height } = await prepareCaptureWrapper(root, width, disableAnimations, {
    selection,
    paddingTop,
    paddingBottom,
    excludeSelectors,
  });

  const bg =
    backgroundColor ||
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary') ||
    '#ffffff';

  // html-to-image is a reliable and efficient library for converting DOM nodes to images
  try {
    if (debug) {
      console.log('[Screenshot] Capturing with html-to-image:', { width, height });
    }

    // html-to-image configuration
    const htmlToImageOptions = {
      width,
      height,
      pixelRatio,
      backgroundColor: String(bg).trim() || '#ffffff',
      cacheBust: true, // Prevent caching issues
      filter: (node: HTMLElement) => {
        // Filter out any problematic elements
        const exclusions = ['script', 'noscript', 'iframe', 'object', 'embed'];
        if (node.tagName && exclusions.includes(node.tagName.toLowerCase())) {
          return false;
        }
        return true;
      },
    };

    // Use toBlob to get a Blob directly
    const blob = await toBlob(wrapper, htmlToImageOptions);

    if (!blob) {
      throw new Error('Failed to generate screenshot blob');
    }

    // Convert blob to data URL for compatibility
    const dataUrl = await blobToDataURL(blob);

    wrapper.remove();

    if (debug) {
      console.log('[Screenshot] Capture complete:', {
        width,
        height,
        blobSize: blob.size,
      });
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

async function prepareCaptureWrapper(
  node: HTMLElement,
  width: number,
  disableAnimations: boolean,
  opts?: {
    selection?: WindowSelection;
    paddingTop?: number;
    paddingBottom?: number;
    excludeSelectors?: string[];
  }
): Promise<{ wrapper: HTMLElement; height: number }> {
  const clone = node.cloneNode(true) as HTMLElement;
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = `${width}px`;
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.overflow = 'hidden';
  wrapper.style.zIndex = '-9999';
  wrapper.style.pointerEvents = 'none';
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

  try {
    // If a selection is provided, prune the cloned DOM to only include the chosen window
    if (opts?.selection && opts.selection.mode === 'window') {
      pruneToSelection({
        root: clone,
        selection: opts.selection,
        paddingTop: opts.paddingTop || 0,
        paddingBottom: opts.paddingBottom || 0,
        excludeSelectors: opts.excludeSelectors,
      });
    }
  } catch (e) {
    // If pruning fails, remove wrapper to avoid leaks and rethrow
    try {
      wrapper.remove();
    } catch {}
    throw e;
  }

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
  try {
    await waitForImages(wrapper, 6000);
  } catch {}
  
  // Give the browser a moment to render everything
  await new Promise(resolve => setTimeout(resolve, 100));
  
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
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          img.addEventListener('load', finish, { once: true });
          img.addEventListener('error', finish, { once: true });
          const t = setTimeout(finish, perImageTimeoutMs);
          // Also try decode when available
          if ('decode' in img && typeof (img as any).decode === 'function') {
            (img as any)
              .decode()
              .finally(() => {
                clearTimeout(t);
                finish();
              });
          }
        }),
    ),
  );
}

// --- selection helpers ---

function pruneToSelection(params: {
  root: HTMLElement; // cloned [data-conversation-root]
  selection: WindowSelection;
  paddingTop: number;
  paddingBottom: number;
  excludeSelectors?: string[];
}): void {
  const { root, selection, paddingTop, paddingBottom, excludeSelectors } = params;

  // Optionally remove caller-specified exclusions only
  if (excludeSelectors && excludeSelectors.length > 0) {
    try {
      for (const sel of excludeSelectors) {
        root.querySelectorAll(sel).forEach((n) => n.remove());
      }
    } catch {}
  }

  // Gather all top-level message nodes in DOM order
  const items = Array.from(root.querySelectorAll(':scope > [data-message-id]')) as HTMLElement[];
  if (!items.length) {
    throw new Error('No messages found to capture.');
  }

  const anchorIndex = items.findIndex(
    (el) => el.getAttribute('data-message-id') === selection.anchorMessageId,
  );
  if (anchorIndex < 0) {
    throw new Error(
      'Selected message is not visible in the current view. Switch to the correct branch and try again.',
    );
  }

  const afterCount = Math.max(0, selection.afterCount || 0);
  const beforeCount = Math.max(0, selection.beforeCount || 0);
  const start = Math.max(0, anchorIndex - beforeCount);
  const end = Math.min(items.length - 1, anchorIndex + afterCount);

  // Optionally enforce strict window size
  if (selection.allowPartial === false) {
    if (anchorIndex - beforeCount < 0 || anchorIndex + afterCount >= items.length) {
      throw new Error(
        'Not enough messages around the selected message to satisfy the capture window.',
      );
    }
  }

  // Remove nodes outside the selected window
  for (let i = 0; i < items.length; i++) {
    if (i < start || i > end) {
      items[i].remove();
    }
  }

  // Add optional padding around the selection for clean edges
  if (paddingTop > 0) {
    (root.style as any).paddingTop = `${Math.floor(paddingTop)}px`;
  }
  if (paddingBottom > 0) {
    (root.style as any).paddingBottom = `${Math.floor(paddingBottom)}px`;
  }
}

export default { captureConversationScreenshot };

export async function captureMessageBlockScreenshot(opts: {
  anchorMessageId: string;
  beforeCount: number;
  afterCount?: number;
  allowPartial?: boolean;
  width?: number;
  pixelRatio?: number;
  selector?: string;
  backgroundColor?: string;
  disableAnimations?: boolean;
  paddingTop?: number;
  paddingBottom?: number;
  excludeSelectors?: string[];
  debug?: boolean;
}): Promise<ConversationScreenshotResult> {
  const {
    anchorMessageId,
    beforeCount,
    afterCount = 0,
    allowPartial = true,
    ...rest
  } = opts;
  return captureConversationScreenshot({
    ...rest,
    selection: {
      mode: 'window',
      anchorMessageId,
      beforeCount,
      afterCount,
      allowPartial,
    },
    // Hide generic excludes when capturing a partial selection
    excludeSelectors: rest.excludeSelectors,
  });
}
