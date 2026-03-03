import React, { useEffect, useMemo, useState } from 'react';
import { useThemeStore } from '../stores';

interface IframeRendererProps {
  url: string;
  className?: string;
}

const IframeRenderer: React.FC<IframeRendererProps> = ({ url, className }) => {
  const { theme } = useThemeStore();

  // Keep iframe width aligned with existing expression/chart layout behavior.
  const [responsiveWidth, setResponsiveWidth] = useState({ container: 760, iframe: 580 });

  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      if (width >= 1536) {
        setResponsiveWidth({ container: 980, iframe: 800 });
      } else if (width >= 1280) {
        setResponsiveWidth({ container: 880, iframe: 700 });
      } else {
        setResponsiveWidth({ container: 760, iframe: 580 });
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const iframeData = useMemo(() => {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) {
      return null;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      return {
        url: parsed.toString(),
        host: parsed.hostname,
      };
    } catch {
      return null;
    }
  }, [url]);

  if (!iframeData) {
    return (
      <div className="p-4 bg-bg-secondary border border-border-secondary rounded-lg text-center">
        <p className="text-text-secondary">Invalid iframe URL</p>
        <p className="text-xs text-text-tertiary mt-1">Expected format: iframe{"{https://example.com}"}</p>
      </div>
    );
  }

  return (
    <div className={`iframe-container my-4 w-full ${className || ''}`} style={{ maxWidth: '100%' }}>
      <div
        className="w-full bg-bg-secondary rounded-lg border border-border-secondary"
        style={{
          height: '320px',
          minHeight: '320px',
          maxWidth: `${responsiveWidth.container}px`,
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <iframe
            key={`iframe-${iframeData.url}`}
            src={iframeData.url}
            width={responsiveWidth.iframe}
            height="320"
            frameBorder="0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={`Embedded content from ${iframeData.host}`}
            style={{
              border: 'none',
              borderRadius: '0.5rem',
              backgroundColor: theme === 'dark' ? 'var(--color-bg-primary)' : '#ffffff',
            }}
            onError={() => {
              console.warn(`Failed to load iframe URL: ${iframeData.url}`);
            }}
          />
        </div>
      </div>

      <div className="text-center mt-2">
        <a
          href={iframeData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-text-tertiary break-all hover:text-text-secondary"
        >
          {iframeData.url}
        </a>
      </div>
    </div>
  );
};

export default React.memo(IframeRenderer, (prevProps, nextProps) => {
  return prevProps.url === nextProps.url && prevProps.className === nextProps.className;
});
