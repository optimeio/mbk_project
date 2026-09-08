'use client';

/**
 * Global responsive shell — safe areas, fluid gutters, optional width constraints.
 */
export default function ResponsiveAppShell({
  children,
  className = '',
  variant = 'default',
  as: Component = 'div',
}) {
  const mainClass = [
    'app-shell__main',
    variant === 'fluid' ? 'app-shell__main--fluid' : '',
    variant === 'narrow' ? 'app-shell__main--narrow' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className="app-shell" data-responsive-shell="true">
      <div className={mainClass}>{children}</div>
    </Component>
  );
}
