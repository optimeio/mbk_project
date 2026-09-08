/**
 * Auto-Save Status Component
 * Displays real-time Google Drive sync status
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Clock, Loader2, ExternalLink } from 'lucide-react';

export const AutoSaveStatus = ({
  status = 'idle', // idle, saving, synced, error, partial
  message = '',
  documentCount = 0,
  syncedCount = 0,
  googleDriveLink = '',
  onRetry = () => {},
  showDetails = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (status === 'synced') {
      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!isVisible && status !== 'error' && status !== 'partial') {
    return null;
  }

  const statusConfig = {
    idle: {
      icon: Clock,
      bgColor: 'bg-gray-50 dark:bg-gray-900',
      borderColor: 'border-gray-200 dark:border-gray-700',
      textColor: 'text-gray-700 dark:text-gray-300',
      label: 'Ready to save',
    },
    saving: {
      icon: Loader2,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-300',
      label: 'Auto-saving to Google Drive...',
      animate: true,
    },
    synced: {
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      label: 'Saved to Google Drive',
    },
    partial: {
      icon: AlertCircle,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-700 dark:text-amber-300',
      label: 'Partially saved',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-700 dark:text-red-300',
      label: 'Save failed',
    },
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div
      className={`
        rounded-lg border px-4 py-3 transition-all
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon
            className={`
              h-5 w-5 flex-shrink-0 mt-0.5
              ${config.animate ? 'animate-spin' : ''}
            `}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{config.label}</p>
            {message && (
              <p className="text-xs opacity-75 mt-1">{message}</p>
            )}
            {showDetails && documentCount > 0 && (
              <p className="text-xs opacity-75 mt-1">
                {syncedCount} of {documentCount} documents synced
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {googleDriveLink && (
            <a
              href={googleDriveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-1.5 rounded-md
                hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
              title="Open in Google Drive"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          {(status === 'error' || status === 'partial') && (
            <button
              onClick={onRetry}
              type="button"
              className="text-xs font-medium px-2.5 py-1 rounded-md
                bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50
                transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoSaveStatus;
