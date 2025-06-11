import React from 'react';
import { Competitor } from '../types';

interface CompetitorCardProps {
  competitor: Competitor;
  pointsLabel: string; // e.g., "Total Points:", "Cumulative Points:"
}

const CompetitorCard: React.FC<CompetitorCardProps> = ({ competitor, pointsLabel }) => {
  return (
    <div key={competitor.ID} className="competitor-card">
      <h3 className="competitor-item-name">{competitor.Name || 'Unnamed Competitor'}</h3>
      <p className="competitor-item-points">
        {pointsLabel} {competitor.totalPoints !== undefined ? competitor.totalPoints : 0}
      </p>
    </div>
  );
};

export default CompetitorCard;
