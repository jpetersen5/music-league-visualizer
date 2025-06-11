// src/App.tsx
import React, { useState } from 'react';
import './App.scss';
import SheetUrlInput from './components/SheetUrlInput';
import SheetDataViewer from './components/SheetDataViewer'; // New import

function App() {
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false); // Keep this for SheetUrlInput disabling

  const handleSheetIdSubmit = (newSheetId: string) => {
    console.log('App: New sheet ID submitted:', newSheetId);
    // To ensure SheetDataViewer's useEffect triggers correctly if the same ID is re-submitted,
    // we can briefly set sheetId to null then back, or change SheetDataViewer's key.
    setSheetId(null); // Clear previous to help trigger changes in children
    setIsLoadingSheet(true);

    // Using a timeout to allow the null state to propagate and then set the new sheetId.
    // This helps ensure that child components like SheetDataViewer see the change from null -> newId,
    // or from oldId -> null -> newId, reliably triggering their useEffects.
    setTimeout(() => {
        setSheetId(newSheetId);
        setIsLoadingSheet(false);
    }, 0); // Using 0ms timeout is a common pattern for this
  };

  return (
    <div className="App">
      {/* Added new class 'app-header' for specific styling, kept 'App-header' if CRA uses it for base styles */}
      <header className="App-header app-header">
        <h1>Google Sheets Data Visualizer</h1>
      </header>
      <main className="app-main">
        <SheetUrlInput onSheetIdSubmit={handleSheetIdSubmit} disabled={isLoadingSheet} />

        {isLoadingSheet && <p className="app-loading-message">Processing new Sheet ID...</p>}

        {!isLoadingSheet && sheetId && (
          <SheetDataViewer sheetId={sheetId} />
        )}

        {!isLoadingSheet && !sheetId && (
          <p className="app-initial-prompt">Please submit a Google Sheet URL to get started.</p>
        )}
      </main>
    </div>
  );
}

export default App;
