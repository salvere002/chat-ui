/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom theme colors using CSS variables
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
        
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'error': 'var(--color-error)',
        'info': 'var(--color-info)',
      },
      fontFamily: {
        'sans': ['system-ui', 'sans-serif'],
        'mono': ['ui-monospace', 'monospace'],
      },
      spacing: {
        '18': '72px',
        '88': '352px',
      },
      animation: {
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
      },
      keyframes: {
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
      },
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