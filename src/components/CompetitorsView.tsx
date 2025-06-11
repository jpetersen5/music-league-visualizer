// src/components/CompetitorsView.tsx
import React from 'react';
import { Competitor } from '../types';
import CompetitorCard from './CompetitorCard'; // New import
// Removed: import { getCompetitors } from '../services/googleSheets';
import './CompetitorsView.scss'; // Import SCSS file

interface CompetitorsViewProps {
  // Removed: sheetId: string | null;
  competitors: Competitor[];
}

const CompetitorsView: React.FC<CompetitorsViewProps> = ({ competitors }) => {
  // Removed: useState for competitors, isLoading, error
  // Removed: useEffect for data fetching

  // Parent component (SheetDataViewer) handles loading and error states.
  // This component now directly uses the competitors prop.

  if (competitors.length === 0) {
    // This message can also be styled via .competitors-view-container > p
    return <p>No competitors data available.</p>;
  }

  const sortedCompetitors = [...competitors].sort((a, b) => {
    const pointsA = a.totalPoints === undefined ? 0 : a.totalPoints;
    const pointsB = b.totalPoints === undefined ? 0 : b.totalPoints;
    return pointsB - pointsA; // For descending order
  });

  return (
    <div className="competitors-view-container">
      <h2>Competitors</h2>
      <div className="competitor-list">
        {sortedCompetitors.map((competitor) => (
          <CompetitorCard key={competitor.ID} competitor={competitor} pointsLabel="Total Points:" />
        ))}
      </div>
    </div>
  );
};

export default CompetitorsView;
