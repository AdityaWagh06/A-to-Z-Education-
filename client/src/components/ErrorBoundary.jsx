import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { GENERIC_ERROR_MESSAGE } from '../lib/errorHandling';

const FallbackView = ({ fullScreen = true, onRetry, error, errorInfo }) => {
  const isDev = import.meta.env.DEV;

  return (
    <div className={fullScreen ? 'min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10' : 'flex w-full items-center justify-center px-4 py-10'}>
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur text-center sm:text-left">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          A to Z Education
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{GENERIC_ERROR_MESSAGE}</p>
        
        {error && isDev && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-left font-mono text-xs text-red-700 overflow-auto max-h-48">
            <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} /> {error.toString()}</p>
            {errorInfo?.componentStack && (
              <pre className="mt-2 text-[10px] text-red-600 whitespace-pre-wrap leading-tight">{errorInfo.componentStack}</pre>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            Try again
          </button>
          <a
            href="/student/home"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('React render error caught by ErrorBoundary:', error, info);
    this.setState({ errorInfo: info });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <FallbackView
          fullScreen={this.props.fullScreen !== false}
          onRetry={this.handleRetry}
          error={this.state.error}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;