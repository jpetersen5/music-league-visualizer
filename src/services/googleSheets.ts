// src/services/googleSheets.ts
import Papa from 'papaparse';
import { Round, Competitor, Vote, Submission } from '../types';

const TEST_SHEET_ID = '14xgTqTxigrXPKVnl1nqV-k0Sczr8hZziRdtEXjW2eVQ'; // User-provided test ID

const SHEET_NAMES = {
  rounds: 'rounds',
  competitors: 'competitors',
  votes: 'votes',
  submissions: 'submissions',
} as const; // Use "as const" for stricter typing on names

type SheetNameValues = typeof SHEET_NAMES[keyof typeof SHEET_NAMES];

// Helper function to construct the gviz CSV URL
const getSheetDataUrl = (sheetId: string, sheetName: SheetNameValues): string => {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
};

// Interface for options to fetchAndParseSheet
interface FetchAndParseOptions {
  transformHeader?: (header: string) => string;
  // Add other options if needed, e.g., for more complex row transformations
}

// Core fetching and parsing function
async function fetchAndParseSheet<T>(url: string, options?: FetchAndParseOptions): Promise<T[]> {
  console.log(`Fetching and parsing sheet from URL: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try to get more error information from the response body if possible
      const errorBody = await response.text();
      console.error(`Failed to fetch CSV: ${response.status} ${response.statusText}. Response body: ${errorBody}`);
      // Google Sheets gviz endpoint might return HTML with an error message
      // Check if the body contains common error indicators
      if (errorBody.includes("gid must be a number") || errorBody.includes("Invalid sheet ID") || errorBody.includes("Worksheet not found")) {
         throw new Error(`Failed to fetch CSV: Invalid sheet name ('${url.substring(url.lastIndexOf('=') + 1)}') or sheet not shared correctly? (${response.statusText})`);
      }
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvText = await response.text();

    // Check if the CSV text is empty or indicates an error (e.g. Google's HTML error page)
    if (!csvText.trim() || csvText.toLowerCase().includes("<html")) {
        console.error("Fetched data is empty or HTML, not CSV. URL:", url, "Response:", csvText.substring(0, 500));
        throw new Error("No data found or invalid CSV format. Ensure the sheet tab exists and the Google Sheet is shared correctly ('Anyone with the link can view').");
    }

    return new Promise<T[]>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically convert numbers, booleans based on content
        transformHeader: options?.transformHeader ?? ((header: string) => header.replace(/\s+/g, '')), // Default header transform
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error("Parsing errors for URL", url, results.errors);
            // Provide more specific error feedback if a common error type
            const firstError = results.errors[0];
            if (firstError.code === 'UndetectableDelimiter') {
                 reject(new Error("Parsing error: Could not detect delimiter. Is the data valid CSV?"));
            } else {
                reject(new Error(`Error parsing CSV data from ${url}. Check console for details.`));
            }
            return;
          }
          // Ensure data is not empty after parsing
          if (!results.data || results.data.length === 0) {
            console.warn("Parsing successful, but no data rows found for URL:", url);
            // This could be a valid case (empty sheet) or an issue with the sheet/query
          }
          resolve(results.data as T[]);
        },
        error: (error) => {
          console.error("PapaParse error for URL", url, error);
          reject(new Error(`PapaParse failed: ${error.message}`));
        }
      });
    });
  } catch (error) {
    console.error(`Error in fetchAndParseSheet for ${url}:`, error);
    // Re-throw or return empty array based on how you want to handle errors upstream
    throw error; // Re-throw to allow upstream components to handle it
  }
}

// --- Concrete data fetching functions ---
// These now accept a sheetId, which will eventually come from user input.

export const getRounds = async (sheetId: string = TEST_SHEET_ID): Promise<Round[]> => {
  const url = getSheetDataUrl(sheetId, SHEET_NAMES.rounds);
  // Specific header transformations can be added if the default isn't enough
  return fetchAndParseSheet<Round>(url);
};

export const getCompetitors = async (sheetId: string = TEST_SHEET_ID): Promise<Competitor[]> => {
  const url = getSheetDataUrl(sheetId, SHEET_NAMES.competitors);
  return fetchAndParseSheet<Competitor>(url);
};

export const getVotes = async (sheetId: string = TEST_SHEET_ID): Promise<Vote[]> => {
  const url = getSheetDataUrl(sheetId, SHEET_NAMES.votes);
  // Example of specific transform if 'Points Assigned' needs to be 'PointsAssigned'
  // and 'Spotify URI' to 'SpotifyURI' etc. The default transform handles spaces.
  // `dynamicTyping` should handle `PointsAssigned` string to number.
  return fetchAndParseSheet<Vote>(url);
};

export const getSubmissions = async (sheetId: string = TEST_SHEET_ID): Promise<Submission[]> => {
  const url = getSheetDataUrl(sheetId, SHEET_NAMES.submissions);
  // `VisibleToVoters` is "Yes" or "No", papaparse with dynamicTyping might make it boolean true/false.
  // If it needs to remain "Yes"/"No" string, then dynamicTyping for this column might be an issue,
  // or a custom transformRow function in fetchAndParseSheet would be needed.
  // For now, assuming string "Yes"/"No" is fine or boolean conversion is acceptable.
  return fetchAndParseSheet<Submission>(url);
};

// Example of how to extract sheet ID from a full Google Sheet URL
export const extractSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};
