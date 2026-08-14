import * as React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  /** Semantic tone — maps to the app's meaning-carrying accents. */
  tone?: 'teal' | 'lime' | 'coral' | 'amber' | 'purple' | 'sage' | 'neutral';
  variant?: 'soft' | 'solid';
  style?: React.CSSProperties;
}

/** Small status label. Soft (tinted) or solid fill; tones carry meaning (lime=win, coral=urgent…). */
export declare function Badge(props: BadgeProps): React.JSX.Element;
