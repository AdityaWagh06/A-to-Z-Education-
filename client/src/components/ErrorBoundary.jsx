import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import { GENERIC_ERROR_MESSAGE } from '../lib/errorHandling';

const FallbackView = ({ fullScreen = true, onRetry }) => (
  <div className={fullScreen ? 'min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10' : 'flex w-full items-center justify-center px-4 py-10'}>
    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white/95 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
        A to Z Education
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-3 text-sm leading-6 text-gray-600">{GENERIC_ERROR_MESSAGE}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  </div>
);

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('React render error caught by ErrorBoundary:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return <FallbackView fullScreen={this.props.fullScreen !== false} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;