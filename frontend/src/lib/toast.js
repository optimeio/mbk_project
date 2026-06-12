import toast from 'react-hot-toast';

const DEFAULT_LOADING_LABEL = 'Please wait...';

const TOAST_STYLES = {
  success: {
    background: '#16a34a',
    color: '#ffffff',
    border: '1px solid #15803d',
  },
  error: {
    background: '#dc2626',
    color: '#ffffff',
    border: '1px solid #b91c1c',
  },
  warning: {
    background: '#ea580c',
    color: '#ffffff',
    border: '1px solid #c2410c',
  },
};

export const notify = {
  success: (message, options = {}) =>
    toast.success(message, {
      style: TOAST_STYLES.success,
      ...options,
    }),
  error: (message, options = {}) =>
    toast.error(message, {
      style: TOAST_STYLES.error,
      ...options,
    }),
  warning: (message, options = {}) =>
    toast(message, {
      icon: '!',
      style: TOAST_STYLES.warning,
      ...options,
    }),
  loading: (message = DEFAULT_LOADING_LABEL, options = {}) =>
    toast.loading(message, options),
  dismiss: (id) => toast.dismiss(id),
  /** Show a success toast, wait briefly so it is visible, then run navigation. */
  successAndNavigate: async (message, navigateFn, delayMs = 900) => {
    toast.success(message, { style: TOAST_STYLES.success });
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    if (typeof navigateFn === 'function') {
      await navigateFn();
    }
  },
};

export default notify;
