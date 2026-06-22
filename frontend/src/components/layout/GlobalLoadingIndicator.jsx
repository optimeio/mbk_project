'use client';

import React, { useEffect, useState } from 'react';

/**
 * GlobalLoadingIndicator - Shows "Please Wait" during async operations
 * Can be controlled globally via context or hooks
 */
const GlobalLoadingIndicator = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('Please wait...');

  useEffect(() => {
    // Listen for custom events to control visibility
    const handleShowLoading = (e) => {
      setMessage(e.detail?.message || 'Please wait...');
      setIsVisible(true);
    };

    const handleHideLoading = () => {
      setIsVisible(false);
    };

    window.addEventListener('app:show-loading', handleShowLoading);
    window.addEventListener('app:hide-loading', handleHideLoading);

    return () => {
      window.removeEventListener('app:show-loading', handleShowLoading);
      window.removeEventListener('app:hide-loading', handleHideLoading);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.spinnerContainer}>
          <div style={styles.spinner} />
        </div>
        <p style={styles.message}>{message}</p>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    maxWidth: '400px',
  },
  spinnerContainer: {
    marginBottom: '24px',
  },
  spinner: {
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  message: {
    fontSize: '16px',
    color: '#1f2937',
    fontWeight: '500',
    margin: 0,
  },
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

// Helper functions to control loading from anywhere
export const showLoading = (message = 'Please wait...') => {
  window.dispatchEvent(
    new CustomEvent('app:show-loading', { detail: { message } })
  );
};

export const hideLoading = () => {
  window.dispatchEvent(new Event('app:hide-loading'));
};

export default GlobalLoadingIndicator;
