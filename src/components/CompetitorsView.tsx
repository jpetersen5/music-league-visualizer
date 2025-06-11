// src/components/CompetitorsView.tsx
import React from 'react';
import { Competitor } from '../types';
import './CompetitorsView.scss'; // Import SCSS file

interface CompetitorsViewProps {
  competitors: Competitor[];
}

const CompetitorsView: React.FC<CompetitorsViewProps> = ({ competitors }) => {
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
      <table className="competitors-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Total Points</th>
          </tr>
        </thead>
        <tbody>
          {sortedCompetitors.map((competitor, index, array) => {
            // Rank calculation, handling ties
            let rank = index + 1;
            if (index > 0 && array[index - 1].totalPoints === competitor.totalPoints) {
              // If current competitor has same points as previous, they have the same rank
              // Need to find the rank of the first competitor with these points
              const firstEqualCompetitorIndex = array.findIndex(c => c.totalPoints === competitor.totalPoints);
              rank = firstEqualCompetitorIndex + 1;
            }
            return (
              <tr key={competitor.ID}>
                <td>{rank}</td>
                <td>{competitor.Name}</td>
                <td>{competitor.totalPoints ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CompetitorsView;
