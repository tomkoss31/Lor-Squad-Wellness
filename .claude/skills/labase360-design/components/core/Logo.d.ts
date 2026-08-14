import * as React from 'react';

/**
 * The La Base 360 lockup — flat SVG mark + HTML wordmark (Anton + JetBrains Mono).
 * @startingPoint section="Core" subtitle="Brand lockup — mark + wordmark" viewport="700x160"
 */
export interface LogoProps {
  /** Mark colorway. dark=default, light=for cream grounds, mono=currentColor. */
  tone?: 'dark' | 'light' | 'mono';
  /** Show the "LA BASE 360" HTML wordmark next to the mark. */
  showText?: boolean;
  /** Mark height in px; text scales from it. */
  size?: number;
  layout?: 'horizontal' | 'stacked';
  style?: React.CSSProperties;
}

export declare function Logo(props: LogoProps): React.JSX.Element;
