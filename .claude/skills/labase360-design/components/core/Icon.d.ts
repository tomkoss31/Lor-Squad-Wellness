import * as React from 'react';

export interface IconProps {
  /** Lucide icon name, e.g. "activity", "flame", "check". */
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

/**
 * Icon — Lucide wrapper (CDN). Substitution for an unprovided brand icon set.
 */
export declare function Icon(props: IconProps): React.JSX.Element;
