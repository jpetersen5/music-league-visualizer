// src/components/SheetDataViewer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import RoundsList from './RoundsList';
import RoundDetails from './RoundDetails';
import CompetitorsView from './CompetitorsView';
import { Round, Competitor, Submission, Vote } from '../types';
import { getRounds, getCompetitors, getSubmissions, getVotes, TEST_SHEET_ID } from '../services/googleSheets'; // extractSheetIdFromUrl removed as sheetId is a direct prop

interface SheetDataViewerProps {
  sheetId: string | null; // This is the currentSheetId, effectively
  // Assuming onDataLoaded and onError are not primary props for this component's own data management
  // If they were, their usage would need to be integrated.
}

type View = 'LIST_ROUNDS' | 'ROUND_DETAILS';

const SheetDataViewer: React.FC<SheetDataViewerProps> = ({ sheetId }) => {
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [currentView, setCurrentView] = useState<View>('LIST_ROUNDS');
  const [allRounds, setAllRounds] = useState<Round[]>([]);
  const [allCompetitors, setAllCompetitors] = useState<Competitor[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // console.log('SheetDataViewer: fetchData called.'); // Removed console log

    const idToUseForServices = sheetId || TEST_SHEET_ID; // Use sheetId or TEST_SHEET_ID as fallback

    if (!sheetId) { // Check specifically for sheetId to decide on fetching or showing error
      // console.log("SheetDataViewer: No valid sheetId provided. Clearing data."); // Removed console log
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
      setIsLoading(false);
      setError("Please provide a Google Sheet ID."); // Set error message
      return;
    }

    // console.log(`SheetDataViewer: Fetching data for remote sheetId: ${idToUseForServices}`); // Removed console log

    try {
      const [roundsData, competitorsData, votesData, submissionsData] = await Promise.all([
        getRounds(idToUseForServices),
        getCompetitors(idToUseForServices),
        getVotes(idToUseForServices),
        getSubmissions(idToUseForServices)
      ]);

      setAllRounds(roundsData);
      setAllCompetitors(competitorsData);
      setAllVotes(votesData);
      setAllSubmissions(submissionsData);
      // console.log('SheetDataViewer: Data fetched and state updated.'); // Removed console log

    } catch (e: any) {
      // console.error("SheetDataViewer: Error fetching data", e); // Removed console log
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      // Clear data on error to prevent inconsistent state
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [sheetId, setIsLoading, setError, setAllRounds, setAllCompetitors, setAllVotes, setAllSubmissions]);


  useEffect(() => {
    // console.log(`SheetDataViewer: useEffect triggered. sheetId: ${sheetId}`); // Removed console log
    // Reset view and component-specific states when sheetId changes
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');

    if (sheetId) {
      // console.log(`SheetDataViewer: Triggering fetchData for remote sheetId: ${sheetId}.`); // Removed console log
      fetchData();
    } else {
      // console.log("SheetDataViewer: Clearing data - no sheetId provided."); // Removed console log
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
      setIsLoading(false);
      setError("Please provide a Google Sheet ID."); // Set error message
    }
  }, [sheetId, fetchData]);

  const handleRoundSelect = (roundId: string) => {
    const round = allRounds.find(r => r.ID === roundId);
    if (round) {
      setSelectedRound(round);
      setCurrentView('ROUND_DETAILS');
    } else {
      // console.error(`SheetDataViewer: Could not find round with ID ${roundId} in allRounds. Available rounds:`, allRounds); // Removed console log
    }
  };

  const handleRoundsFetched = useCallback((rounds: Round[]) => {
    // console.log("SheetDataViewer: handleRoundsFetched called (potentially redundant now).", rounds); // Removed console log
    // setAllRounds(rounds); // This was already commented out
  }, [/* setAllRounds */]);


  const handleBackToList = () => {
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
  };

  if (!sheetId && !isLoading) { // Adjusted condition to show message when no sheetId and not loading
    return <p>Please provide a Google Sheet ID.</p>;
  }

  if (isLoading) {
    return <p>Loading data from Google Sheet (ID: {sheetId || TEST_SHEET_ID})...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <>
      {currentView === 'LIST_ROUNDS' && (
        <RoundsList
          sheetId={sheetId} // Pass sheetId directly
          onRoundSelect={handleRoundSelect}
          onRoundsFetched={handleRoundsFetched}
          // shouldFetch={false} // This was a hypothetical prop
        />
      )}
      {currentView === 'ROUND_DETAILS' && selectedRound && (
        <RoundDetails
          selectedRound={selectedRound}
          allSubmissions={allSubmissions}
          allVotes={allVotes}
          allCompetitors={allCompetitors}
          onBackToList={handleBackToList}
        />
      )}
      <CompetitorsView competitors={allCompetitors} />
    </>
  );
};

export default SheetDataViewer;
