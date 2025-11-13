/**
 * Screenshot Utility (html2canvas based)
 *
 * Captures the current conversation view as a PNG using html2canvas.
 * Keeps the same API contract used in the app.
 */

import html2canvas from 'html2canvas';

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
  // suppress unused debug in production; html2canvas logging is disabled below
  void debug;

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
  const { wrapper, height } = await prepareCaptureWrapper(root, width, disableAnimations, {
    selection,
    paddingTop,
    paddingBottom,
    excludeSelectors,
  });

  const bg = backgroundColor || getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary') || '#ffffff';

  // If content is very tall, capture in tiles to avoid browser limits
  const threshold = 8000;
  if (height > threshold) {
    try {
      const result = await captureByTilingWithHtml2Canvas(
        wrapper,
        width,
        height,
        pixelRatio,
        String(bg).trim() || '#ffffff',
        disableAnimations,
      );
      wrapper.remove();
      return result;
    } catch (e) {
      // fall through to single-pass attempt
    }
  }
  // Single-pass capture with html2canvas on the wrapper
  try {
    const canvas = await html2canvas(wrapper, {
      scale: pixelRatio,
      backgroundColor: String(bg).trim() || '#ffffff',
      useCORS: true,
      logging: false,
      width,
      height,
      scrollX: 0,
      scrollY: 0,
      windowWidth: width,
      windowHeight: height,
      onclone: (doc: Document) => {
        if (!disableAnimations) return;
        try {
          const style = doc.createElement('style');
          style.textContent = '*{animation:none!important;transition:none!important}';
          doc.head.appendChild(style);
        } catch {}
      },
    } as any);
    const blob: Blob = await canvasToBlobPromise(canvas, 'image/png');
    const dataUrl = await blobToDataURL(blob);
    wrapper.remove();
    return { blob, dataUrl, width, height };
  } catch (e) {
    wrapper.remove();
    throw new Error(e instanceof Error ? e.message : 'Failed to capture conversation screenshot');
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
    try { wrapper.remove(); } catch {}
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

async function captureByTilingWithHtml2Canvas(
  wrapper: HTMLElement,
  width: number,
  height: number,
  pixelRatio: number,
  backgroundColor: string,
  disableAnimations: boolean,
): Promise<ConversationScreenshotResult> {
  // Ensure structure: wrapper contains an inner element we can translate
  let inner = wrapper.querySelector(':scope > div[data-screenshot-inner]') as HTMLElement | null;
  if (!inner) {
    // Create an inner wrapper and move children into it
    inner = document.createElement('div');
    inner.setAttribute('data-screenshot-inner', '');
    inner.style.willChange = 'transform';
    inner.style.paddingBottom = '24px';
    while (wrapper.firstChild) inner.appendChild(wrapper.firstChild);
    wrapper.appendChild(inner);
  }
  // Recompute total height after images settled
  const totalHeight = Math.ceil((inner.scrollHeight || wrapper.scrollHeight || height) + 24);
  // Compute tile height: clamp by device caps so pixel height (tileHeight * pixelRatio) <= ~14000
  const maxCssTileFromPixelCap = Math.max(512, Math.floor(14000 / Math.max(1, pixelRatio)));
  const baseDesired = 4096;
  const TILE_H = Math.min(Math.max(1024, baseDesired), maxCssTileFromPixelCap);
  const OVERLAP = 16; // CSS px overlap to avoid seam/cutoff due to rounding
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(totalHeight * pixelRatio));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create 2D canvas context');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.fillStyle = backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  for (let y = 0, index = 0; y < totalHeight; y += TILE_H, index++) {
    const sliceH = Math.min(TILE_H, totalHeight - y);
    // Use negative margin instead of transform to reduce raster rounding issues
    const yStart = Math.max(0, y - (index > 0 ? OVERLAP : 0));
    inner.style.marginTop = `-${yStart}px`;
    inner.style.transform = '';
    const captureH = sliceH + (index > 0 ? OVERLAP : 0);
    wrapper.style.height = `${captureH}px`;

    const tileCanvas = await html2canvas(wrapper, {
      scale: pixelRatio,
      backgroundColor,
      useCORS: true,
      logging: false,
      width,
      height: captureH,
      scrollX: 0,
      scrollY: 0,
      windowWidth: width,
      windowHeight: captureH,
      onclone: (doc: Document) => {
        if (!disableAnimations) return;
        try {
          const style = doc.createElement('style');
          style.textContent = '*{animation:none!important;transition:none!important}';
          doc.head.appendChild(style);
        } catch {}
      },
    } as any);
    // Crop top overlap (except first tile) when drawing onto final canvas
    const srcY = (index > 0 ? OVERLAP * pixelRatio : 0);
    const srcH = tileCanvas.height - srcY;
    const destY = y;
    const destH = sliceH;
    ctx.drawImage(tileCanvas, 0, srcY, tileCanvas.width, srcH, 0, destY, width, destH);
  }

  const blob = await canvasToBlobPromise(canvas, 'image/png');
  const dataUrl = await blobToDataURL(blob);
  return { blob, dataUrl, width, height: totalHeight };
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

function canvasToBlobPromise(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob produced null'))), type)
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

  const anchorIndex = items.findIndex((el) => el.getAttribute('data-message-id') === selection.anchorMessageId);
  if (anchorIndex < 0) {
    throw new Error('Selected message is not visible in the current view. Switch to the correct branch and try again.');
  }

  const afterCount = Math.max(0, selection.afterCount || 0);
  const beforeCount = Math.max(0, selection.beforeCount || 0);
  const start = Math.max(0, anchorIndex - beforeCount);
  const end = Math.min(items.length - 1, anchorIndex + afterCount);

  // Optionally enforce strict window size
  if (selection.allowPartial === false) {
    if ((anchorIndex - beforeCount) < 0 || (anchorIndex + afterCount) >= items.length) {
      throw new Error('Not enough messages around the selected message to satisfy the capture window.');
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
