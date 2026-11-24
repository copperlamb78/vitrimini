import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import type { ButtonShape } from '../types/catalog';
import type { ResolvedStoreTheme } from '../utils/storeTheme';

export interface ThemedCardProps extends HTMLAttributes<HTMLDivElement> {
  resolvedTheme: ResolvedStoreTheme;
  shape?: ButtonShape;
  children: ReactNode;
}

function getCardRadiusClass(shape: ButtonShape): string {
  if (shape === 'professional') return 'rounded-lg';
  if (shape === 'relaxed') return 'rounded-3xl';
  return 'rounded-2xl';
}

/**
 * Container reutilizável com superfície, texto, borda e raio harmônicos com o tema.
 */
export function ThemedCard({
  resolvedTheme,
  shape,
  className = '',
  style,
  children,
  ...rest
}: ThemedCardProps) {
  const effectiveShape = shape ?? resolvedTheme.buttonShape;
  const radiusClass = getCardRadiusClass(effectiveShape);

  const mergedStyle: CSSProperties = {
    backgroundColor: `var(--vm-surface, ${resolvedTheme.surfaceColor})`,
    color: `var(--vm-text, ${resolvedTheme.textColor})`,
    borderColor: resolvedTheme.borderColor,
    borderWidth: '1px',
    borderStyle: 'solid',
    ...style,
  };

  return (
    <div
      {...rest}
      className={`${radiusClass} transition-colors ${className}`}
      style={mergedStyle}
    >
      {children}
    </div>
  );
}
