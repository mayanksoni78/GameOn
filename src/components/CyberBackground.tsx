import React from 'react';
import { BaseBackground, BaseBackgroundProps, BaseComponentState } from './BaseComponent';
import { ThemedGameBackground, GameTheme } from './ThemedGameBackground';
import { type SharedValue } from 'react-native-reanimated';

export interface CyberBackgroundProps extends BaseBackgroundProps {
  variant?: 'dashboard' | 'game';
  theme?: GameTheme;
  autoScroll?: boolean;
  scrollOffset?: SharedValue<number>;
  opacity?: number;
}

/**
 * CyberBackground Component
 * Provides backward-compatible wrapper for ThemedGameBackground adhering to OOP BaseBackground architecture.
 */
export class CyberBackground extends BaseBackground<CyberBackgroundProps, BaseComponentState> {
  public renderContent(): React.ReactNode {
    const activeTheme: GameTheme =
      this.props.theme || (this.props.variant === 'dashboard' ? 'arcade' : 'arcade');
    return <ThemedGameBackground theme={activeTheme} opacity={this.props.opacity} />;
  }
}

export { ThemedGameBackground };
export type { GameTheme };
export default CyberBackground;