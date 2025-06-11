// src/components/SheetDataViewer.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import RoundsList from './RoundsList';
import RoundDetails from './RoundDetails';
import CompetitorsView from './CompetitorsView';
import { Round, Competitor, Submission, Vote } from '../types';
import { getRounds, getCompetitors, getSubmissions, getVotes, TEST_SHEET_ID } from '../services/googleSheets'; // extractSheetIdFromUrl removed as sheetId is a direct prop
import { calculateCumulativePoints } from '../utils/pointUtils';

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
  const [allCompetitors, setAllCompetitors] = useState<Competitor[]>([]); // Raw competitors
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);
  const [competitorsForDisplay, setCompetitorsForDisplay] = useState<Competitor[]>([]); // For CompetitorsView
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate points for RoundDetails view (cumulative up to selectedRound)
  // This calculates points for competitors based on votes up to and including the selectedRound.
  const competitorsForRoundDetailsView = useMemo(() => {
    if (!selectedRound || !allCompetitors.length || !allSubmissions.length || !allVotes.length || !allRounds.length) {
      // Return allCompetitors with totalPoints initialized to 0 if not all data is ready or no round is selected
      return allCompetitors.map(c => ({ ...c, totalPoints: 0 }));
    }
    return calculateCumulativePoints(
      allCompetitors, // raw competitor list
      allSubmissions,
      allVotes,
      allRounds,
      selectedRound.ID // targetRoundId
    );
  }, [selectedRound, allCompetitors, allSubmissions, allVotes, allRounds]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const idToUseForServices = sheetId || TEST_SHEET_ID; // Use sheetId or TEST_SHEET_ID as fallback

    if (!sheetId) { // Check specifically for sheetId to decide on fetching or showing error
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
      setCompetitorsForDisplay([]); // Clear display version
      setIsLoading(false);
      setError("Please provide a Google Sheet ID."); // Set error message
      return;
    }

    try {
      const [roundsData, competitorsData, votesData, submissionsData] = await Promise.all([
        getRounds(idToUseForServices),
        getCompetitors(idToUseForServices),
        getVotes(idToUseForServices),
        getSubmissions(idToUseForServices)
      ]);

      setAllRounds(roundsData);
      setAllCompetitors(competitorsData); // Store raw competitors
      setAllVotes(votesData);
      setAllSubmissions(submissionsData);

      // Calculate points for CompetitorsView (total points)
      const competitorsWithTotalPoints = calculateCumulativePoints(
        competitorsData, // Use raw competitors from fetch
        submissionsData,
        votesData,
        roundsData,
        null // null for targetRoundId means all rounds
      );
      setCompetitorsForDisplay(competitorsWithTotalPoints);

    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      // Clear data on error to prevent inconsistent state
      setAllRounds([]);
      setAllCompetitors([]); // Clear raw
      setAllVotes([]);
      setAllSubmissions([]);
      setCompetitorsForDisplay([]); // Clear display version
    } finally {
      setIsLoading(false);
    }
  }, [sheetId, setIsLoading, setError, setAllRounds, setAllCompetitors, setAllVotes, setAllSubmissions, setCompetitorsForDisplay]);


  useEffect(() => {
    // Reset view and component-specific states when sheetId changes
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');

    if (sheetId) {
      fetchData();
    } else {
      setAllRounds([]);
      setAllCompetitors([]);
      setAllVotes([]);
      setAllSubmissions([]);
      setCompetitorsForDisplay([]); // Clear display version too
      setIsLoading(false);
      setError("Please provide a Google Sheet ID."); // Set error message
    }
  }, [sheetId, fetchData, setCompetitorsForDisplay]);

  const handleRoundSelect = (roundId: string) => {
    const round = allRounds.find(r => r.ID === roundId);
    if (round) {
      setSelectedRound(round);
      setCurrentView('ROUND_DETAILS');
    }
  };

  const handleRoundsFetched = useCallback((rounds: Round[]) => {
    // This callback might be useful if RoundsList needs to inform SheetDataViewer
    // about the rounds it has fetched, for example, to pre-select a round or validate.
    // Currently, SheetDataViewer fetches its own rounds, submissions, etc.,
    // so this callback is less critical for data population here but could be used for other logic.
  }, []);


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
          sheetId={sheetId}
          onRoundSelect={handleRoundSelect}
          onRoundsFetched={handleRoundsFetched}
        />
      )}
      {currentView === 'ROUND_DETAILS' && selectedRound && (
        <RoundDetails
          selectedRound={selectedRound}
          allSubmissions={allSubmissions}
          allVotes={allVotes}
          allCompetitors={allCompetitors} // Keep this for existing logic in RoundDetails
          competitorsForRoundView={competitorsForRoundDetailsView} // New prop
          onBackToList={handleBackToList}
        />
      )}
      <CompetitorsView competitors={competitorsForDisplay} />
    </>
  );
};

export default SheetDataViewer;
