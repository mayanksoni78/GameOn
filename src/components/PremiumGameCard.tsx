import React from 'react';
import { BaseCard, BaseCardProps, BaseCardState } from './BaseComponent';
import { GameCard, GameCardProps } from './GameCard';
import { IconId } from './PremiumIcon';
import { Href } from 'expo-router';

export interface PremiumGameCardProps extends BaseCardProps {
  id: IconId;
  subtitle?: string;
  route: Href;
  accent?: string;
  category?: string;
  difficulty?: string;
  players?: string;
  image?: any;
  highScore?: number;
}

/**
 * PremiumGameCard Component
 * Wraps the unified GameCard component ensuring OOP inheritance compatibility.
 * Symmetrical, minimal two-area design:
 * 1. Artwork Area (dominant 16:10 aspect ratio)
 * 2. Game Title Area (compact 50px with subtle play indicator)
 * Strictly zero descriptions, subtitles, or redundant labels.
 */
export class PremiumGameCard extends BaseCard<PremiumGameCardProps, BaseCardState> {
  public renderContent(): React.ReactNode {
    const { id, title, route, accentColor, accent, image, cardWidth } = this.props;

    return (
      <GameCard
        id={id}
        title={title}
        route={route}
        accentColor={accent || accentColor}
        image={image}
        cardWidth={cardWidth}
        category={this.props.category}
        players={this.props.players}
      />
    );
  }
}

export { GameCard };
export default PremiumGameCard;