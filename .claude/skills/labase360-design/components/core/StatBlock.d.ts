import * as React from 'react';

export interface StatBlockProps {
  /** Eyebrow label above the value (mono caps). */
  label?: string;
  value: string | number;
  unit?: string | null;
  /** Delta text, e.g. "+12%". */
  delta?: string | null;
  deltaTone?: 'up' | 'down' | 'flat';
  /** Value color — teal by default; lime for a win. */
  accent?: string;
  style?: React.CSSProperties;
}

/** Labelled metric — mono value with aligned numerals, eyebrow label, optional delta. */
export declare function StatBlock(props: StatBlockProps): React.JSX.Element;
