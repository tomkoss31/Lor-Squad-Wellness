import * as React from 'react';

/**
 * Surface container. App = green + hairline border; club = white, 22px radius, top accent rule.
 * @startingPoint section="Core" subtitle="Card surfaces — app, light, club" viewport="700x220"
 */
export interface CardProps {
  /** app=green surface (default), light=white app card, club=cream-site card. */
  tone?: 'app' | 'light' | 'club';
  /** Accent color for the rule. Club cards get a 5px top rule; others a 3px left rule. */
  accent?: string | null;
  padding?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export declare function Card(props: CardProps): React.JSX.Element;
