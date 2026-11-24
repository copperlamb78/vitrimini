import { useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import type { ButtonFill, ButtonShape } from '../types/catalog';
import { hexToRgba, type ResolvedStoreTheme } from '../utils/storeTheme';

interface ThemedButtonBaseProps {
  variant?: 'primary' | 'secondary';
  shape?: ButtonShape;
  fill?: ButtonFill;
  highlighted?: boolean;
  resolvedTheme: ResolvedStoreTheme;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  disabled?: boolean;
}

type ButtonAsButton = ThemedButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ThemedButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = ThemedButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ThemedButtonBaseProps> & {
    href: string;
  };

export type ThemedButtonProps = ButtonAsButton | ButtonAsAnchor;

function getShapeClass(shape: ButtonShape): string {
  if (shape === 'professional') return 'rounded-lg';
  if (shape === 'relaxed') return 'rounded-full';
  return 'rounded-2xl';
}

/**
 * Botão/link temático compartilhado entre Vitrine e VitriLink.
 * Garante contraste real no modo outline (fundo transparente + borda 2px) e toque >= 44px.
 */
export function ThemedButton(props: ThemedButtonProps) {
  const {
    variant = 'primary',
    shape,
    fill,
    highlighted = false,
    resolvedTheme,
    className = '',
    style,
    children,
    disabled = false,
    href,
    ...rest
  } = props;

  const [isHovered, setIsHovered] = useState(false);

  const effectiveShape = shape ?? resolvedTheme.buttonShape;
  const effectiveFill = fill ?? resolvedTheme.buttonFill;
  const shapeClass = getShapeClass(effectiveShape);

  const isOutline = effectiveFill === 'outline' && !highlighted;

  let computedStyle: CSSProperties;

  if (isOutline) {
    computedStyle = {
      backgroundColor:
        isHovered && !disabled
          ? hexToRgba(resolvedTheme.outlineColor, 0.1)
          : 'transparent',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: resolvedTheme.outlineColor,
      color: resolvedTheme.outlineColor,
    };
  } else if (variant === 'secondary' && !highlighted) {
    computedStyle = {
      backgroundColor:
        isHovered && !disabled
          ? hexToRgba(resolvedTheme.textColor, 0.06)
          : resolvedTheme.surfaceColor,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: resolvedTheme.borderColor,
      color: resolvedTheme.textColor,
    };
  } else {
    computedStyle = {
      backgroundColor: resolvedTheme.primaryColor,
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      color: resolvedTheme.textOnPrimary,
      filter: isHovered && !disabled ? 'brightness(0.95)' : undefined,
    };
  }

  const mergedStyle: CSSProperties = {
    ...computedStyle,
    ...style,
  };

  const baseClassName = `inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 font-semibold transition-all duration-150 ${shapeClass} ${
    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.99]'
  } ${className}`;

  if (typeof href === 'string') {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        {...anchorProps}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={baseClassName}
        style={mergedStyle}
        onMouseEnter={(e) => {
          setIsHovered(true);
          anchorProps.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setIsHovered(false);
          anchorProps.onMouseLeave?.(e);
        }}
      >
        {children}
      </a>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={buttonProps.type ?? 'button'}
      {...buttonProps}
      disabled={disabled}
      className={baseClassName}
      style={mergedStyle}
      onMouseEnter={(e) => {
        setIsHovered(true);
        buttonProps.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        buttonProps.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}
