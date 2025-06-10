// src/components/CompetitorsView.tsx
import React, { useState, useEffect } from 'react';
import { Competitor } from '../types';
import { getCompetitors } from '../services/googleSheets';
import './CompetitorsView.scss'; // Import SCSS file

interface CompetitorsViewProps {
  sheetId: string | null; // sheetId can be null initially
}

const CompetitorsView: React.FC<CompetitorsViewProps> = ({ sheetId }) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sheetId) {
      setCompetitors([]); // Clear competitors if sheetId is not set
      return;
    }

    const fetchCompetitors = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedCompetitors = await getCompetitors(sheetId);

        // Basic validation
        if (fetchedCompetitors.length > 0 && !fetchedCompetitors[0].ID) {
            console.error("CompetitorsView: Fetched data might be malformed. 'ID' is missing.", fetchedCompetitors[0]);
            setError("Fetched competitors data is not in the expected format. Check console for details.");
            setCompetitors([]);
        } else {
            setCompetitors(fetchedCompetitors);
        }
      } catch (err) {
        console.error('CompetitorsView: Error fetching competitors:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching competitors.');
        setCompetitors([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitors();
  }, [sheetId]); // Re-run effect when sheetId changes

  // Do not render if sheetId is not yet available.
  // App.tsx should control when this component is actually displayed.
  if (!sheetId) {
    return null;
  }

  if (isLoading) {
    // This message can also be styled via .competitors-view-container > p
    return <p>Loading competitors...</p>;
  }

  if (error) {
    return <p className="competitors-view-error">Error loading competitors: {error}</p>;
  }

  if (competitors.length === 0) {
    // This message can also be styled via .competitors-view-container > p
    return <p>No competitors found for the provided Google Sheet ID, or the 'competitors' sheet is empty or not shared correctly.</p>;
  }

  return (
    <div className="competitors-view-container"> {/* Updated className */}
      <h2>Competitors</h2>
      <ul className="competitor-list"> {/* Added className for ul */}
        {competitors.map((competitor) => ( // Removed underscore from (competitor)_
          <li key={competitor.ID} className="competitor-item"> {/* Added className */}
            <h3 className="competitor-item-name">{competitor.Name || 'Unnamed Competitor'}</h3>
            <p className="competitor-item-id">ID: {competitor.ID}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompetitorsView;
