import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Router from 'next/router';
import LoadingSpinner from '@/components/LoadingSpinner';

// Context shape
export const LoadingContext = createContext({
  loading: false,
  showLoading: () => {},
  hideLoading: () => {},
});

export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const showLoading = useCallback(() => {
    setLoadingCount((c) => c + 1);
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingCount((c) => Math.max(c - 1, 0));
  }, []);

  // Router navigation events
  useEffect(() => {
    const handleStart = () => showLoading();
    const handleEnd = () => hideLoading();
    Router.events.on('routeChangeStart', handleStart);
    Router.events.on('routeChangeComplete', handleEnd);
    Router.events.on('routeChangeError', handleEnd);
    return () => {
      Router.events.off('routeChangeStart', handleStart);
      Router.events.off('routeChangeComplete', handleEnd);
      Router.events.off('routeChangeError', handleEnd);
    };
  }, [showLoading, hideLoading]);

  // Global API loading events (fired from services/api.js)
  useEffect(() => {
    const handleStart = () => showLoading();
    const handleEnd = () => hideLoading();
    window.addEventListener('global-loading-start', handleStart);
    window.addEventListener('global-loading-end', handleEnd);
    return () => {
      window.removeEventListener('global-loading-start', handleStart);
      window.removeEventListener('global-loading-end', handleEnd);
    };
  }, [showLoading, hideLoading]);

  const contextValue = {
    loading: loadingCount > 0,
    showLoading,
    hideLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <LoadingSpinner />
    </LoadingContext.Provider>
  );
};

// Helper hook for consuming components
export const useLoading = () => useContext(LoadingContext);
