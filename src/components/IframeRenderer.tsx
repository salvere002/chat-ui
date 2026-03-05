import React, { useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface IframeRendererProps {
  url: string;
  className?: string;
}

const EXPAND_ANIMATION_MS = 300;
const IFRAME_LOAD_TIMEOUT_MS = 10000;

const IframeRenderer: React.FC<IframeRendererProps> = ({ url, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpandedVisual, setIsExpandedVisual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [isUserMessage, setIsUserMessage] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  // Detect once whether this iframe lives inside a user (right-aligned) message.
  useEffect(() => {
    if (!containerRef.current) return;
    const messageContainer = containerRef.current.closest('[data-message-id]') as HTMLElement | null;
    if (messageContainer) {
      setIsUserMessage(messageContainer.classList.contains('self-end'));
    }
  }, []);

  // Animate ancestor width between current (fit-content) and full (100% of parent).
  // CSS can't transition from auto/fit-content to a %, so we measure concrete px values
  // and animate between them explicitly.
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const bubble = containerRef.current.closest('.message-bubble') as HTMLElement | null;
    const messageContainer = containerRef.current.closest('[data-message-id]') as HTMLElement | null;
    const targets = [bubble, messageContainer].filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;
    let rafId: number | undefined;
    let cleanupTransitionEnd: (() => void) | undefined;

    if (isExpanded) {
      // 1. Snapshot current widths and compute target widths.
      // For nested targets, ensure children expand toward the parent's final target width,
      // not the parent's current (collapsed) width.
      const depth = (el: HTMLElement): number => {
        let d = 0;
        let current: HTMLElement | null = el;
        while (current) {
          d += 1;
          current = current.parentElement;
        }
        return d;
      };

      const outerToInner = [...targets].sort((a, b) => depth(a) - depth(b));
      const targetWidthMap = new Map<HTMLElement, number>();

      for (const el of outerToInner) {
        const parent = el.parentElement as HTMLElement | null;
        const parentTargetWidth = parent ? targetWidthMap.get(parent) : undefined;
        const to = parentTargetWidth ?? (parent?.getBoundingClientRect().width ?? el.getBoundingClientRect().width);
        targetWidthMap.set(el, to);
      }

      const snapshots = targets.map(el => ({
        el,
        from: el.getBoundingClientRect().width,
        to: targetWidthMap.get(el) ?? el.getBoundingClientRect().width,
      }));

      // 2. Pin to current pixel width (no transition yet)
      for (const s of snapshots) {
        s.el.style.transition = 'none';
        s.el.style.width = `${s.from}px`;
      }

      // 3. Next frame: enable transition and set target pixel width
      rafId = requestAnimationFrame(() => {
        // Start card height/width visual expansion in the same frame as parent width expansion.
        setIsExpandedVisual(true);
        for (const s of snapshots) {
          s.el.style.transition = `width ${EXPAND_ANIMATION_MS}ms ease`;
          s.el.style.width = `${s.to}px`;
        }

        // After transition completes, switch to 100% so it stays responsive
        const transitionAnchor = snapshots.find(s => Math.abs(s.to - s.from) > 0.5)?.el;
        const finalizeExpand = () => {
          for (const s of snapshots) {
            s.el.style.transition = '';
            s.el.style.width = '100%';
          }
        };

        if (!transitionAnchor) {
          finalizeExpand();
          return;
        }

        const onEnd = (event: TransitionEvent) => {
          if (event.propertyName && event.propertyName !== 'width') return;
          finalizeExpand();
          cleanupTransitionEnd?.();
          cleanupTransitionEnd = undefined;
        };
        transitionAnchor.addEventListener('transitionend', onEnd);
        const timeoutId = window.setTimeout(() => {
          finalizeExpand();
          cleanupTransitionEnd?.();
          cleanupTransitionEnd = undefined;
        }, EXPAND_ANIMATION_MS + 80);
        cleanupTransitionEnd = () => {
          window.clearTimeout(timeoutId);
          transitionAnchor.removeEventListener('transitionend', onEnd);
        };
      });
    } else {
      // Collapse is immediate: no width/height animation on close.
      setIsExpandedVisual(false);
      for (const el of targets) {
        el.style.transition = 'none';
        el.style.width = '';
      }

      // Restore baseline transitions right away for non-iframe interactions.
      rafId = requestAnimationFrame(() => {
        for (const el of targets) {
          if (el.style.transition === 'none') {
            el.style.transition = '';
          }
        }
      });
    }

    return () => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      cleanupTransitionEnd?.();
      for (const el of targets) {
        el.style.transition = '';
        el.style.width = '';
      }
    };
  }, [isExpanded]);

  const iframeData = useMemo(() => {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return null;

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return {
        url: parsed.toString(),
        host: parsed.hostname,
        displayHost: parsed.hostname.replace(/^www\./, ''),
      };
    } catch {
      return null;
    }
  }, [url]);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current !== null) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!iframeData) return;

    setIsLoading(true);
    setLoadError(false);
    setLoadTimedOut(false);
    clearLoadTimeout();

    loadTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setLoadError(true);
      setLoadTimedOut(true);
      loadTimeoutRef.current = null;
    }, IFRAME_LOAD_TIMEOUT_MS);

    return clearLoadTimeout;
  }, [iframeData, clearLoadTimeout]);

  const handleLoad = useCallback(() => {
    clearLoadTimeout();
    setIsLoading(false);
    setLoadTimedOut(false);
    setLoadError(false);
  }, [clearLoadTimeout]);

  const handleError = useCallback(() => {
    clearLoadTimeout();
    setIsLoading(false);
    setLoadTimedOut(false);
    setLoadError(true);
  }, [clearLoadTimeout]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  if (!iframeData) {
    return (
      <div className="p-4 bg-bg-secondary border border-border-secondary rounded-lg text-center my-4">
        <p className="text-text-secondary text-sm">Invalid iframe URL</p>
        <p className="text-xs text-text-tertiary mt-1">Expected format: iframe{'{https://example.com}'}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`iframe-container my-4 w-full ${className || ''}`}>
      <div
        className="rounded-lg border border-border-secondary overflow-hidden bg-bg-secondary"
        style={{
          transition: isExpanded ? 'height 0.3s ease' : 'none',
          height: isExpandedVisual ? '70vh' : '420px',
          minHeight: isExpandedVisual ? '400px' : '420px',
          width: '100%',
          maxWidth: isExpandedVisual ? '100%' : '760px',
          marginLeft: isUserMessage ? 'auto' : undefined,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-secondary bg-bg-tertiary shrink-0">
          {/* Favicon + hostname */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <img
              src={`https://www.google.com/s2/favicons?domain=${iframeData.host}&sz=16`}
              alt=""
              width={14}
              height={14}
              className="shrink-0 rounded-sm opacity-80"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-xs text-text-secondary font-medium truncate">
              {iframeData.displayHost}
            </span>
            <span className="text-xs text-text-tertiary truncate hidden sm:block">
              — {iframeData.url}
            </span>
          </div>

          {/* Loading indicator */}
          {isLoading && !loadError && (
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
              <span className="text-xs text-text-tertiary">Loading…</span>
            </div>
          )}

          {/* Error badge */}
          {loadError && (
            <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded shrink-0">
              {loadTimedOut ? 'Timeout' : 'Blocked'}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Expand / Collapse */}
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="10" y1="14" x2="3" y2="21" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                  </svg>
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </button>

            {/* Open in new tab */}
            <a
              href={iframeData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
              title="Open in new tab"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="hidden sm:inline">Open</span>
            </a>
          </div>
        </div>

        {/* iframe area */}
        <div className="relative flex-1 min-h-0">
          {loadError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-tertiary">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-sm font-medium text-text-secondary">Can't display this page</p>
                <p className="text-xs text-text-tertiary mt-1">
                  {loadTimedOut
                    ? 'This page took too long to respond. Open it directly instead.'
                    : 'This site does not allow embedding. Open it directly instead.'}
                </p>
              </div>
              <a
                href={iframeData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md bg-accent-primary text-white text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Open in new tab
              </a>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-text-tertiary">Loading {iframeData.displayHost}…</span>
                  </div>
                </div>
              )}
              <iframe
                key={`iframe-${iframeData.url}`}
                src={iframeData.url}
                width="100%"
                height="100%"
                frameBorder="0"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={`Embedded content from ${iframeData.host}`}
                style={{ display: 'block', border: 'none', width: '100%', height: '100%' }}
                onLoad={handleLoad}
                onError={handleError}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(IframeRenderer, (prevProps, nextProps) => {
  return prevProps.url === nextProps.url && prevProps.className === nextProps.className;
});
