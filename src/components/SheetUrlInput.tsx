// src/components/SheetUrlInput.tsx
import React, { useState } from 'react';
import { extractSheetIdFromUrl } from '../services/googleSheets';
import './SheetUrlInput.scss'; // Import SCSS file

interface SheetUrlInputProps {
  onSheetIdSubmit: (sheetId: string) => void;
  disabled?: boolean; // To disable input/button during loading
}

const SheetUrlInput: React.FC<SheetUrlInputProps> = ({ onSheetIdSubmit, disabled }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = () => {
    setError('');
    if (!inputValue.trim()) {
      setError('Please paste a Google Sheet URL.');
      return;
    }

    const sheetId = extractSheetIdFromUrl(inputValue);

    if (sheetId) {
      onSheetIdSubmit(sheetId);
      // Optionally clear input after successful submission:
    } else {
      setError('Invalid Google Sheet URL. Please ensure it is a valid URL and the sheet is shared correctly.');
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    if (error) { // Clear error when user starts typing again
      setError('');
    }
  };

  return (
    <div className="sheet-url-input-container">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Paste your Google Sheet URL here"
        disabled={disabled}
        aria-label="Google Sheet URL"
        className="sheet-url-input-field"
      />
      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="sheet-url-input-button"
      >
        Load Data
      </button>
      {error && <p className="sheet-url-input-error">{error}</p>}
      <p className="sheet-url-input-helper">
        Ensure your Google Sheet is shared with "Anyone with the link can view".
      </p>
    </div>
  );
};

export default SheetUrlInput;
