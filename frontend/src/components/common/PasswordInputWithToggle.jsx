'use client';

import { Eye, EyeOff } from 'lucide-react';

const toggleButtonBaseStyle = {
  position: 'absolute',
  right: '8px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '6px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '36px',
  minHeight: '36px',
  color: '#64748b',
  zIndex: 2,
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
};

const hasExplicitRightPadding = (style = {}) => {
  if (style.paddingRight != null) return true;
  const padding = String(style.padding || '').trim();
  if (!padding) return false;
  const parts = padding.split(/\s+/);
  return parts.length === 2 || parts.length === 3 || parts.length === 4;
};

export default function PasswordInputWithToggle({
  id,
  name,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  placeholder,
  disabled = false,
  required = false,
  minLength,
  autoComplete,
  className = '',
  style,
  wrapperClassName = 'relative w-full',
  wrapperStyle,
  toggleButtonStyle,
  iconSize = 18,
  onFocus,
  onBlur,
}) {
  const inputStyle = hasExplicitRightPadding(style)
    ? style
    : { ...style, paddingRight: style?.paddingRight ?? '2.75rem' };

  const handleToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || typeof onToggleVisibility !== 'function') return;
    onToggleVisibility(event);
  };

  return (
    <div className={wrapperClassName} style={{ position: 'relative', ...wrapperStyle }}>
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={className}
        style={inputStyle}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        onClick={handleToggle}
        onMouseDown={(event) => event.preventDefault()}
        disabled={disabled}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
        tabIndex={0}
        style={{ ...toggleButtonBaseStyle, ...toggleButtonStyle }}
      >
        {showPassword ? (
          <EyeOff size={iconSize} aria-hidden="true" />
        ) : (
          <Eye size={iconSize} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
