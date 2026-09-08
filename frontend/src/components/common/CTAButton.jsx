'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, forwardRef, useMemo } from 'react';
import notify from '@/lib/toast';
import getErrorMessage from '@/lib/getErrorMessage';
import './CTAButton.css';

const EXTERNAL_HREF_PATTERN = /^(https?:|mailto:|tel:|\/\/)/i;
const HASH_HREF_PATTERN = /^#/;

const isNativeAnchorHref = (href) =>
  typeof href === 'string' && (EXTERNAL_HREF_PATTERN.test(href) || HASH_HREF_PATTERN.test(href));

// Instant response: no timeout overhead for synchronous operations
const withTimeout = (promise, ms = 30000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(`Operation timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const VARIANTS = {
  primary: 'cta-btn--primary',
  brand: 'cta-btn--brand',
  company: 'cta-btn--company',
  secondary: 'cta-btn--secondary',
  danger: 'cta-btn--danger',
  ghost: 'cta-btn--ghost',
  outline: 'cta-btn--outline',
  success: 'cta-btn--success',
};

const SIZES = {
  xs: 'cta-btn--xs',
  sm: 'cta-btn--sm',
  md: 'cta-btn--md',
  lg: 'cta-btn--lg',
  xl: 'cta-btn--xl',
};

// Memoized content renderer - prevents re-renders
const renderContent = ({
  isLoading,
  loadingText,
  iconLeft,
  iconRight,
  children,
}) => {
  if (isLoading) {
    return (
      <>
        <span className="cta-btn__spinner" role="status" aria-label="Loading" />
        {loadingText && <span className="cta-btn__label">{loadingText}</span>}
      </>
    );
  }

  return (
    <>
      {iconLeft && <span className="cta-btn__icon cta-btn__icon--left">{iconLeft}</span>}
      <span className="cta-btn__label">{children}</span>
      {iconRight && <span className="cta-btn__icon cta-btn__icon--right">{iconRight}</span>}
    </>
  );
};

const CTAButton = forwardRef(function CTAButton({
  children,
  onClick,
  href,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  debounceMs = 0,
  iconLeft,
  iconRight,
  fullWidth = false,
  type = 'button',
  className = '',
  loadingText,
  target,
  rel,
  'aria-label': ariaLabel,
  ...props
}, ref) {
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const lastClickRef = useRef(0);
  const propsRef = useRef();
  propsRef.current = { children, ariaLabel, id: props.id };

  const isLoading = loading || asyncLoading;
  const isDisabled = disabled || isLoading;

  const releasePress = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handlePointerDown = useCallback(() => {
    if (!isDisabled) {
      setIsPressed(true);
    }
  }, [isDisabled]);

  // OPTIMIZATION 1: Instant response - no blocking performance logging
  const handleClick = useCallback(
    (event) => {
      const now = Date.now();
      // Debounce duplicate clicks
      if (now - lastClickRef.current < debounceMs) return;
      lastClickRef.current = now;

      if (isDisabled || !onClick) return;

      const result = onClick(event);
      if (result && typeof result.then === 'function') {
        setAsyncLoading(true);
        withTimeout(result, 30000)
          .catch((err) => {
            console.error('CTAButton onClick error:', err);
            notify.error(getErrorMessage(err));
          })
          .finally(() => {
            setAsyncLoading(false);
            setIsPressed(false);
          });
      }
    },
    [onClick, debounceMs, isDisabled],
  );

  // OPTIMIZATION 2: Memoize content - prevent unnecessary re-renders
  const content = useMemo(
    () => renderContent({
      isLoading,
      loadingText,
      iconLeft,
      iconRight,
      children,
    }),
    [isLoading, loadingText, iconLeft, iconRight, children]
  );

  const classes = [
    'cta-btn',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'cta-btn--full' : '',
    href ? 'cta-btn--link' : '',
    isDisabled ? 'cta-btn--disabled' : '',
    isLoading ? 'cta-btn--loading' : '',
    isPressed ? 'cta-btn--pressed' : '',
    className,
  ].filter(Boolean).join(' ');

  if (href && !isDisabled) {
    const isExternal = typeof href === 'string' && EXTERNAL_HREF_PATTERN.test(href);
    const linkTarget = target ?? (isExternal ? '_blank' : undefined);
    const linkRel = rel ?? (linkTarget === '_blank' ? 'noopener noreferrer' : undefined);

    if (isNativeAnchorHref(href)) {
      return (
        <a
          ref={ref}
          href={href}
          className={classes}
          aria-label={ariaLabel}
          aria-busy={isLoading}
          onClick={onClick}
          target={linkTarget}
          rel={linkRel}
          {...props}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        className={classes}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        onClick={onClick}
        target={linkTarget}
        rel={linkRel}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={releasePress}
      onPointerLeave={releasePress}
      onPointerCancel={releasePress}
      disabled={isDisabled}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
});

CTAButton.displayName = 'CTAButton';
export default CTAButton;
