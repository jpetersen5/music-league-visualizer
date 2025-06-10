// src/components/SheetDataViewer.tsx
import React, { useState, useEffect } from 'react';
import RoundsList from './RoundsList';
import RoundDetails from './RoundDetails';
import CompetitorsView from './CompetitorsView';
import { Round } from '../types';

interface SheetDataViewerProps {
  sheetId: string | null;
}

type View = 'LIST_ROUNDS' | 'ROUND_DETAILS';

const SheetDataViewer: React.FC<SheetDataViewerProps> = ({ sheetId }) => {
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [currentView, setCurrentView] = useState<View>('LIST_ROUNDS');
  const [allRounds, setAllRounds] = useState<Round[]>([]);

  // Reset view when sheetId changes
  useEffect(() => {
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
    setAllRounds([]);
    console.log('SheetDataViewer: sheetId changed, state reset.', sheetId);
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

  const handleRoundsFetched = (rounds: Round[]) => {
    setAllRounds(rounds);
  };

  const handleBackToList = () => {
    setSelectedRound(null);
    setCurrentView('LIST_ROUNDS');
  };

  if (!sheetId) {
    // This component should ideally only be rendered when sheetId is available.
    // App.tsx can handle the message "Please submit a Google Sheet URL..."
    return null;
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
          sheetId={sheetId}
          selectedRound={selectedRound}
          onBackToList={handleBackToList}
        />
      )}
      {/* CompetitorsView is part of the data display for this sheet */}
      <CompetitorsView sheetId={sheetId} />
    </>
  );
};

export default SheetDataViewer;
