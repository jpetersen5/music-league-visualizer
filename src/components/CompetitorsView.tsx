// src/components/CompetitorsView.tsx
import React from 'react';
import { Competitor } from '../types';
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

  return (
    <div className="competitors-view-container">
      <h2>Competitors</h2>
      <ul className="competitor-list">
        {competitors.map((competitor) => (
          <li key={competitor.ID} className="competitor-item">
            <h3 className="competitor-item-name">{competitor.Name || 'Unnamed Competitor'}</h3>
            <p className="competitor-item-id">ID: {competitor.ID}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompetitorsView;
