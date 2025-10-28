import React from 'react';
import { RotateCcw } from 'lucide-react';
import './TimelineErrorBoundary.css';

/**
 * Timeline Error Boundary Component
 * Catches JavaScript errors anywhere in the timeline component tree
 */
class TimelineErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Timeline Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="timeline-error-boundary">
          <div className="timeline-error-content">
            <div className="timeline-error-icon">⚠️</div>
            <div className="timeline-error-title">Timeline Error</div>
            <div className="timeline-error-message">
              Something went wrong with the timeline. This might be due to corrupted clip data or a rendering issue.
            </div>
            <div className="timeline-error-actions">
              <button 
                className="timeline-error-retry-btn"
                onClick={this.handleRetry}
              >
                <RotateCcw size={16} />
                Retry Timeline
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="timeline-error-details">
                <summary>Error Details (Development)</summary>
                <pre className="timeline-error-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TimelineErrorBoundary;
