import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    // You could also log to an error reporting service here
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
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
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 