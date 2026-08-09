import * as React from 'react';

export interface EyebrowPillProps {
  children?: React.ReactNode;
  /** Warm fills for the club site; "app" = surface + teal text. */
  tone?: 'yellow' | 'orange' | 'pink' | 'sage' | 'peach' | 'app';
  style?: React.CSSProperties;
}

/** Signature eyebrow pill — mono caps, .2em tracking, sits above a title. */
export declare function EyebrowPill(props: EyebrowPillProps): React.JSX.Element;
