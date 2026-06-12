'use client';

import Link from 'next/link';
import { useTransition, useCallback, useRef, forwardRef } from 'react';
import './CTAButton.css';

const EXTERNAL_HREF_PATTERN = /^(https?:|mailto:|tel:|\/\/)/i;
const HASH_HREF_PATTERN = /^#/;

const isNativeAnchorHref = (href) =>
  typeof href === 'string' && (EXTERNAL_HREF_PATTERN.test(href) || HASH_HREF_PATTERN.test(href));

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
  debounceMs = 100,
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
  const [isPending, startTransition] = useTransition();
  const lastClickRef = useRef(0);

  const isLoading = loading || isPending;
  const isDisabled = disabled || isLoading;

  const handleClick = useCallback(
    (event) => {
      const now = Date.now();
      if (now - lastClickRef.current < debounceMs) return;
      lastClickRef.current = now;

      if (isDisabled || !onClick) return;

      const result = onClick(event);
      if (result && typeof result.then === 'function') {
        startTransition(() => {
          result.catch(() => {});
        });
      }
    },
    [onClick, debounceMs, isDisabled, startTransition],
  );

  const classes = [
    'cta-btn',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'cta-btn--full' : '',
    href ? 'cta-btn--link' : '',
    isDisabled ? 'cta-btn--disabled' : '',
    isLoading ? 'cta-btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = renderContent({
    isLoading,
    loadingText,
    iconLeft,
    iconRight,
    children,
  });

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

export default CTAButton;
