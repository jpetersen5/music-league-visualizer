// src/components/RoundsList.tsx
import React, { useState, useEffect } from 'react';
import { Round } from '../types';
import { getRounds } from '../services/googleSheets';
import './RoundsList.scss'; // Import SCSS file

interface RoundsListProps {
  sheetId: string | null;
  onRoundSelect: (roundId: string) => void;
  onRoundsFetched?: (rounds: Round[]) => void; // New prop
}

const RoundsList: React.FC<RoundsListProps> = ({ sheetId, onRoundSelect, onRoundsFetched }) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sheetId) {
      setRounds([]);
      if (onRoundsFetched) {
        onRoundsFetched([]); // Clear rounds in parent as well
      }
      return;
    }

    const fetchRounds = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedRounds = await getRounds(sheetId);

        if (fetchedRounds.length > 0 && typeof fetchedRounds[0].ID === 'undefined') { // Check if ID is undefined
            console.error("RoundsList: Fetched data might be malformed. 'ID' is missing or undefined.", fetchedRounds[0]);
            setError("Fetched rounds data is not in the expected format. 'ID' property is missing. Check sheet headers and data structure.");
            setRounds([]);
            if (onRoundsFetched) {
              onRoundsFetched([]);
            }
        } else {
            setRounds(fetchedRounds);
            if (onRoundsFetched) {
              onRoundsFetched(fetchedRounds);
            }
        }
      } catch (err) {
        console.error('RoundsList: Error fetching rounds:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching rounds.';
        setError(errorMessage);
        setRounds([]);
        if (onRoundsFetched) {
          onRoundsFetched([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRounds();
  }, [sheetId, onRoundsFetched]); // Added onRoundsFetched to dependency array

  if (!sheetId) {
    return <p>Please submit a Google Sheet URL above to load rounds.</p>;
  }

  if (isLoading) {
    return <p>Loading rounds...</p>;
  }

  if (error) {
    // Provide more specific advice if the error indicates a common issue like sheet not found/shared
    let detailedError = error;
    if (error.includes("Invalid sheet name") || error.includes("Worksheet not found") || error.includes("gid must be a number")) {
        detailedError = `Error: The 'rounds' sheet tab was not found or is not shared correctly in the provided Google Sheet. Please ensure the sheet tab is named 'rounds' and the Google Sheet is shared with "Anyone with the link can view". Original error: ${error}`;
    } else if (error.includes("Failed to fetch CSV") && (error.includes("404") || error.includes("400"))) { // Added 400 for bad requests
        detailedError = `Error: Could not fetch the 'rounds' sheet. This might be due to an incorrect Spreadsheet ID, the sheet tab name not being 'rounds', or the sheet not being published/shared correctly ("Anyone with the link can view"). Original error: ${error}`;
    } else if (error.includes("ID property is missing")) {
        detailedError = `Error: Fetched data for 'rounds' is missing the 'ID' column. Please check the 'rounds' sheet tab for correct headers (e.g., 'ID', 'Name', 'Description', 'Playlist URL'). Original error: ${error}`;
    }

    // Using className for error message
    return <p className="rounds-list-error">{detailedError}</p>;
  }

  if (rounds.length === 0 && !isLoading) { // Ensure not to show "No rounds found" while still loading initially
    // This paragraph can also be styled via .rounds-list-container > p if needed
    return <p>No rounds found. This could mean the 'rounds' sheet is empty, not named correctly ('rounds'), or not shared properly. Please check the sheet and ensure it's accessible and has data.</p>;
  }

  return (
    <div className="rounds-list-container"> {/* Updated className */}
      <h2>Rounds</h2>
      <div className="rounds-card-list"> {/* Changed ul to div and added class */}
        {rounds.map((round) => (
          // Ensure round and round.ID are valid before rendering
          round && typeof round.ID !== 'undefined' ? (
            <div // Changed li to div
              key={round.ID}
              onClick={() => onRoundSelect(round.ID)}
              className="round-card" // Changed className
              // Removed inline styles and onMouseEnter/onMouseLeave
            >
              <h3 className="rounds-list-item-name">{round.Name || 'Unnamed Round'}</h3>
              <p className="rounds-list-item-description">{round.Description || 'No description.'}</p>
              {round.PlaylistURL && (
                <p className="rounds-list-item-playlist">
                  <a href={round.PlaylistURL} target="_blank" rel="noopener noreferrer">Spotify Playlist</a>
                </p>
              )}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default RoundsList;
