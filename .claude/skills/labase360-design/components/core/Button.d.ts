import * as React from 'react';

/**
 * La Base 360 button — teal primary (structural color), warm-gradient CTA for the club site.
 * @startingPoint section="Core" subtitle="Buttons — primary, secondary, ghost, CTA" viewport="700x150"
 */
export interface ButtonProps {
  /** Visual style. primary=teal, cta=warm gradient pill (club site). */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'cta';
  size?: 'sm' | 'md' | 'lg';
  /** Force pill (999px) radius. CTA is always pill. */
  pill?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

export declare function Button(props: ButtonProps): React.JSX.Element;
