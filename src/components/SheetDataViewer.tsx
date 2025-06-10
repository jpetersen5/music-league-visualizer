// src/components/SheetDataViewer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import RoundsList from './RoundsList';
import RoundDetails from './RoundDetails';
import CompetitorsView from './CompetitorsView';
import { Round, Competitor, Submission, Vote } from '../types';
import { getCompetitors, getSubmissions, getVotes } from '../services/googleSheets';

interface SheetDataViewerProps {
  sheetId: string | null;
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

  // Reset view and fetch data when sheetId changes
  useEffect(() => {
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
    setAllRounds([]);
    setAllCompetitors([]);
    setAllSubmissions([]);
    setAllVotes([]);
    setError(null);
    console.log('SheetDataViewer: sheetId changed, state reset.', sheetId);

    if (sheetId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          console.log('SheetDataViewer: Fetching data for sheetId:', sheetId);
          const [competitors, submissions, votes] = await Promise.all([
            getCompetitors(sheetId),
            getSubmissions(sheetId),
            getVotes(sheetId),
          ]);
          setAllCompetitors(competitors);
          setAllSubmissions(submissions);
          setAllVotes(votes);
          console.log('SheetDataViewer: Data fetched successfully.');
        } catch (err) {
          console.error('SheetDataViewer: Error fetching data:', err);
          setError('Failed to fetch data. Please check the sheet ID and permissions.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [sheetId]);

  const handleRoundSelect = (roundId: string) => {
    const round = allRounds.find(r => r.ID === roundId);
    if (round) {
      setSelectedRound(round);
      setCurrentView('ROUND_DETAILS');
    } else {
      console.error(`SheetDataViewer: Could not find round with ID ${roundId} in allRounds.`);
    }
  };

  const handleRoundsFetched = useCallback((rounds: Round[]) => {
    setAllRounds(rounds);
  }, []);

  const handleBackToList = () => {
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
  };

  if (!sheetId) {
    // This component should ideally only be rendered when sheetId is available.
    // App.tsx can handle the message "Please submit a Google Sheet URL..."
    return null;
  }

  if (isLoading) {
    return <p>Loading data...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  // At this point, sheetId is guaranteed to be non-null,
  // and isLoading and error states have been handled.

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
          allCompetitors={allCompetitors}
          onBackToList={handleBackToList}
        />
      )}
      {/* CompetitorsView is part of the data display for this sheet */}
      <CompetitorsView competitors={allCompetitors} />
    </>
  );
};

export default SheetDataViewer;
