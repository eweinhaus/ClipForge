import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ClipBlockErrorBoundary extends React.Component {
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
    console.error('ClipBlock Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="clip-block-error">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <div className="error-message">Clip display error</div>
            <div className="error-details">
              {this.props.clip?.fileName || 'Unknown clip'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClipBlockErrorBoundary;
