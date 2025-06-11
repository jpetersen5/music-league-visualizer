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

  const [useLocalFiles, setUseLocalFiles] = useState<boolean>(true); // Default to true

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log('SheetDataViewer: fetchData called.');

    // Determine the ID to use for service calls
    const idToUseForServices = useLocalFiles ? TEST_SHEET_ID : sheetId;

    if (!useLocalFiles && !sheetId) {
      console.log("SheetDataViewer: Not using local files and no valid sheetId provided. Clearing data.");
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
      setIsLoading(false);
      setError(null); // Or perhaps setError("No sheet ID provided for remote fetching.");
      return;
    }

    console.log(`SheetDataViewer: Fetching data. Mode: ${useLocalFiles ? 'LOCAL' : 'REMOTE'}. ID for services: ${idToUseForServices}`);

    try {
      // Ensure a valid string ID is passed if services expect it.
      // Services are designed to ignore this ID if useLocalFiles is true, but they still expect a string.
      const validIdPlaceholder = idToUseForServices || TEST_SHEET_ID; // Fallback for safety, though idToUseForServices should be set if we reach here.

      const [roundsData, competitorsData, votesData, submissionsData] = await Promise.all([
        getRounds(validIdPlaceholder, useLocalFiles),
        getCompetitors(validIdPlaceholder, useLocalFiles),
        getVotes(validIdPlaceholder, useLocalFiles),
        getSubmissions(validIdPlaceholder, useLocalFiles)
      ]);

      setAllRounds(roundsData);
      setAllCompetitors(competitorsData);
      setAllVotes(votesData);
      setAllSubmissions(submissionsData);
      console.log('SheetDataViewer: Data fetched and state updated.');

    } catch (e: any) {
      console.error("SheetDataViewer: Error fetching data", e);
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
  }, [sheetId, useLocalFiles, setIsLoading, setError, setAllRounds, setAllCompetitors, setAllVotes, setAllSubmissions]);


  useEffect(() => {
    console.log(`SheetDataViewer: useEffect triggered. useLocalFiles: ${useLocalFiles}, sheetId: ${sheetId}`);
    // Reset view and component-specific states when sheetId or useLocalFiles changes
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
    // Data states (allRounds, etc.) are cleared by fetchData if needed or before fetching.

    if (useLocalFiles) {
      console.log("SheetDataViewer: useLocalFiles is true, triggering fetchData.");
      fetchData();
    } else if (sheetId) { // For remote fetches, sheetId (prop) must be valid
      console.log(`SheetDataViewer: useLocalFiles is false, triggering fetchData for remote sheetId: ${sheetId}.`);
      fetchData();
    } else {
      // This case handles when not using local files AND there's no valid sheetId (e.g., bad URL or no URL from parent)
      console.log("SheetDataViewer: Clearing data - Not using local files and no sheetId provided.");
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
      setIsLoading(false);
      setError(null); // Or a specific error message like "No sheet ID provided."
    }
  }, [sheetId, useLocalFiles, fetchData]);

  const handleRoundSelect = (roundId: string) => {
    const round = allRounds.find(r => r.ID === roundId);
    if (round) {
      setSelectedRound(round);
      setCurrentView('ROUND_DETAILS');
    } else {
      console.error(`SheetDataViewer: Could not find round with ID ${roundId} in allRounds. Available rounds:`, allRounds);
    }
  };

  // This callback is now used by RoundsList, but RoundsList itself doesn't fetch.
  // SheetDataViewer fetches rounds and passes them to RoundsList.
  // The handleRoundsFetched prop in RoundsList might need to be re-evaluated or removed if RoundsList no longer fetches.
  // For now, we preserve it but setAllRounds is the primary way rounds are updated.
  const handleRoundsFetched = useCallback((rounds: Round[]) => {
     // This might be redundant if fetchData is the sole source of rounds.
     // However, if RoundsList were to have independent refresh capability, it might be used.
     // For now, direct state update from fetchData is primary.
    console.log("SheetDataViewer: handleRoundsFetched called (potentially redundant now).", rounds);
    // setAllRounds(rounds);
  }, [/* setAllRounds */]);


  const handleBackToList = () => {
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
  };

  // UI to toggle useLocalFiles state
  const toggleDataSource = () => {
    setUseLocalFiles(prev => !prev);
  };

  // Conditional rendering based on whether sheetId is required and present
  if (!useLocalFiles && !sheetId) {
    return (
      <div>
        <p>Please provide a Google Sheet ID when not using local test data.</p>
        <button onClick={toggleDataSource}>
          {useLocalFiles ? 'Switch to Google Sheets URL' : 'Switch to Local Test Data'}
        </button>
      </div>
    );
  }


  if (isLoading) {
    return (
        <div>
            <p>Loading data... (Mode: {useLocalFiles ? 'Local' : 'Remote'})</p>
            <button onClick={toggleDataSource} disabled={isLoading}>
                Switch to {useLocalFiles ? 'Google Sheets URL' : 'Local Test Data'}
            </button>
        </div>
    );
  }

  if (error) {
    return (
        <div>
            <p>Error: {error}</p>
            <button onClick={toggleDataSource}>
                {useLocalFiles ? 'Switch to Google Sheets URL' : 'Switch to Local Test Data'}
            </button>
        </div>
    );
  }

  return (
    <>
      <div>
        <button onClick={toggleDataSource} disabled={isLoading}>
          {useLocalFiles ? 'Switch to Google Sheets URL' : 'Switch to Local Test Data'}
        </button>
        <p>Data source: {useLocalFiles ? 'Local Test Files' : `Google Sheet (ID: ${sheetId || 'N/A'})`}</p>
      </div>

      {currentView === 'LIST_ROUNDS' && (
        <RoundsList
          sheetId={useLocalFiles ? TEST_SHEET_ID : sheetId} // Pass relevant ID
          onRoundSelect={handleRoundSelect}
          // onRoundsFetched is kept for now, but its role might diminish
          // as SheetDataViewer now fetches all data including rounds.
          onRoundsFetched={handleRoundsFetched}
          // Indicate to RoundsList whether it should attempt to fetch (e.g. if it had its own useLocalFiles logic)
          // For this refactor, we assume SheetDataViewer is the source of truth for 'allRounds'
          // So, RoundsList should probably just display the 'rounds' prop.
          // Adding a hypothetical prop to control fetching within RoundsList:
          // shouldFetch={false} // Or pass useLocalFiles and let RoundsList decide.
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
