'use client';

import React from 'react';
import notify from '@/lib/toast';

/**
 * GlobalErrorBoundary - Catches render errors and async errors
 * Displays user-friendly error message with error ID for support
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      errorId,
      errorCount: this.state.errorCount + 1,
    });

    // Log error details
    console.error('❌ GlobalErrorBoundary caught:', {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Notify user with error ID
    notify.error(
      `Something went wrong (${errorId}). Please refresh or contact support.`
    );
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" style={styles.container}>
          <div style={styles.content}>
            <h1 style={styles.title}>⚠️ Something Went Wrong</h1>
            <p style={styles.description}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {this.state.errorId && (
              <div style={styles.errorIdBox}>
                <p style={styles.errorIdLabel}>Error ID (for support):</p>
                <code style={styles.errorIdCode}>{this.state.errorId}</code>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Dev Only)</summary>
                <pre style={styles.stack}>{this.state.error.stack}</pre>
              </details>
            )}

            <div style={styles.buttonGroup}>
              <button onClick={this.handleReset} style={styles.buttonPrimary}>
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                style={styles.buttonSecondary}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  content: {
    maxWidth: '600px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: '40px',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '12px',
  },
  description: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  errorIdBox: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  errorIdLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
    fontWeight: '500',
  },
  errorIdCode: {
    fontSize: '14px',
    color: '#1f2937',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  details: {
    marginBottom: '24px',
    textAlign: 'left',
  },
  summary: {
    cursor: 'pointer',
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '500',
  },
  stack: {
    backgroundColor: '#f3f4f6',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '300px',
    color: '#1f2937',
    marginTop: '8px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
    color: '#1f2937',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
};

export default GlobalErrorBoundary;
