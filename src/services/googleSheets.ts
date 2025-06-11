// src/services/googleSheets.ts
import Papa from 'papaparse';
import { Round, Competitor, Vote, Submission } from '../types';

export const TEST_SHEET_ID = '14xgTqTxigrXPKVnl1nqV-k0Sczr8hZziRdtEXjW2eVQ'; // User-provided test ID

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
        error: (error: Error) => {
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

export const getRounds = async (sheetId: string = TEST_SHEET_ID, useLocalTestData: boolean = false): Promise<Round[]> => {
  if (useLocalTestData) {
    const localUrl = '/testdata/rounds.csv';
    console.log(`Fetching rounds from local test data: ${localUrl}`);
    try {
      const response = await fetch(localUrl);
      if (!response.ok) {
        // Attempt to get more info from the response body for local file errors
        const errorBody = await response.text();
        console.error(`Failed to fetch local rounds CSV: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 500)}`);
        throw new Error(`Failed to fetch local rounds CSV: ${response.statusText}. Ensure '/public${localUrl}' exists and is accessible.`);
      }
      const csvText = await response.text();
      if (!csvText.trim()) {
        console.warn("Local rounds CSV is empty:", localUrl);
        return [];
      }
      // Basic check for HTML in local file response (e.g. if a router serves a 404 page as HTML)
      if (csvText.toLowerCase().includes("<html")) {
        console.error("Local rounds data is HTML, not CSV. URL:", localUrl, "Response:", csvText.substring(0, 200));
        throw new Error("Failed to fetch local rounds CSV: Expected CSV, got HTML. Check path and server setup. URL: " + localUrl);
      }
      return new Promise<Round[]>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: true,
          transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, ''),
          complete: (results) => {
            if (results.errors.length > 0) {
              results.errors.forEach(err => console.error("PapaParse local rounds error:", err.message, "(Code:", err.code, ") for URL", localUrl));
              const firstError = results.errors[0];
              if (firstError.code === 'UndetectableDelimiter') {
                 reject(new Error("Parsing error (local rounds): Could not detect delimiter. Is the data valid CSV?"));
              } else {
                reject(new Error(`Error parsing local rounds CSV from ${localUrl}. First error: ${firstError.message} (Code: ${firstError.code})`));
              }
              return;
            }
            const filteredData = results.data.filter(row => Object.values(row as any).some(val => val !== null && val !== '')) as Round[];
            resolve(filteredData);
          },
          error: (error: Error) => {
            console.error("PapaParse critical error for local rounds CSV", localUrl, error);
            reject(new Error(`PapaParse failed critically for local rounds: ${error.message}`));
          }
        });
      });
    } catch (error) {
      console.error(`Error fetching/parsing local rounds from ${localUrl}:`, error);
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  } else {
    const url = getSheetDataUrl(sheetId, SHEET_NAMES.rounds);
    return fetchAndParseSheet<Round>(url, {
        transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, '')
    });
  }
};

export const getCompetitors = async (sheetId: string = TEST_SHEET_ID, useLocalTestData: boolean = false): Promise<Competitor[]> => {
  if (useLocalTestData) {
    const localUrl = '/testdata/competitors.csv';
    console.log(`Fetching competitors from local test data: ${localUrl}`);
    try {
      const response = await fetch(localUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch local competitors CSV: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 500)}`);
        throw new Error(`Failed to fetch local competitors CSV: ${response.statusText}. Ensure '/public${localUrl}' exists and is accessible.`);
      }
      const csvText = await response.text();
      if (!csvText.trim()) {
        console.warn("Local competitors CSV is empty:", localUrl);
        return [];
      }
      if (csvText.toLowerCase().includes("<html")) {
        console.error("Local competitors data is HTML, not CSV. URL:", localUrl, "Response:", csvText.substring(0, 200));
        throw new Error("Failed to fetch local competitors CSV: Expected CSV, got HTML. Check path and server setup. URL: " + localUrl);
      }
      return new Promise<Competitor[]>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: true,
          transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, ''),
          complete: (results) => {
            if (results.errors.length > 0) {
              results.errors.forEach(err => console.error("PapaParse local competitors error:", err.message, "(Code:", err.code, ") for URL", localUrl));
               const firstError = results.errors[0];
              if (firstError.code === 'UndetectableDelimiter') {
                 reject(new Error("Parsing error (local competitors): Could not detect delimiter. Is the data valid CSV?"));
              } else {
                reject(new Error(`Error parsing local competitors CSV from ${localUrl}. First error: ${firstError.message} (Code: ${firstError.code})`));
              }
              return;
            }
            const filteredData = results.data.filter(row => Object.values(row as any).some(val => val !== null && val !== '')) as Competitor[];
            resolve(filteredData);
          },
          error: (error: Error) => {
            console.error("PapaParse critical error for local competitors CSV", localUrl, error);
            reject(new Error(`PapaParse failed critically for local competitors: ${error.message}`));
          }
        });
      });
    } catch (error) {
      console.error(`Error fetching/parsing local competitors from ${localUrl}:`, error);
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  } else {
    const url = getSheetDataUrl(sheetId, SHEET_NAMES.competitors);
    return fetchAndParseSheet<Competitor>(url, {
        transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, '')
    });
  }
};

export const getVotes = async (sheetId: string = TEST_SHEET_ID, useLocalTestData: boolean = false): Promise<Vote[]> => {
  if (useLocalTestData) {
    const localUrl = '/testdata/votes.csv';
    console.log(`Fetching votes from local test data: ${localUrl}`);
    try {
      const response = await fetch(localUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch local votes CSV: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 500)}`);
        throw new Error(`Failed to fetch local votes CSV: ${response.statusText}. Ensure '/public${localUrl}' exists and is accessible.`);
      }
      const csvText = await response.text();
      if (!csvText.trim()) {
        console.warn("Local votes CSV is empty:", localUrl);
        return [];
      }
      if (csvText.toLowerCase().includes("<html")) {
        console.error("Local votes data is HTML, not CSV. URL:", localUrl, "Response:", csvText.substring(0, 200));
        throw new Error("Failed to fetch local votes CSV: Expected CSV, got HTML. Check path and server setup. URL: " + localUrl);
      }
      return new Promise<Vote[]>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: true,
          transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, ''),
          complete: (results) => {
            if (results.errors.length > 0) {
              results.errors.forEach(err => console.error("PapaParse local votes error:", err.message, "(Code:", err.code, ") for URL", localUrl));
              const firstError = results.errors[0];
              if (firstError.code === 'UndetectableDelimiter') {
                 reject(new Error("Parsing error (local votes): Could not detect delimiter. Is the data valid CSV?"));
              } else {
                reject(new Error(`Error parsing local votes CSV from ${localUrl}. First error: ${firstError.message} (Code: ${firstError.code})`));
              }
              return;
            }
            const filteredData = results.data.filter(row => Object.values(row as any).some(val => val !== null && val !== '')) as Vote[];
            resolve(filteredData);
          },
          error: (error: Error) => {
            console.error("PapaParse critical error for local votes CSV", localUrl, error);
            reject(new Error(`PapaParse failed critically for local votes: ${error.message}`));
          }
        });
      });
    } catch (error) {
      console.error(`Error fetching/parsing local votes from ${localUrl}:`, error);
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  } else {
    const url = getSheetDataUrl(sheetId, SHEET_NAMES.votes);
    return fetchAndParseSheet<Vote>(url, {
        transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, '')
    });
  }
};

export const getSubmissions = async (sheetId: string = TEST_SHEET_ID, useLocalTestData: boolean = false): Promise<Submission[]> => {
  if (useLocalTestData) {
    const localUrl = '/testdata/submissions.csv';
    console.log(`Fetching submissions from local test data: ${localUrl}`);
    try {
      const response = await fetch(localUrl);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch local submissions CSV: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0, 500)}`);
        throw new Error(`Failed to fetch local submissions CSV: ${response.statusText}. Ensure '/public${localUrl}' exists and is accessible.`);
      }
      const csvText = await response.text();
      if (!csvText.trim()) {
        console.warn("Local submissions CSV is empty:", localUrl);
        return [];
      }
      if (csvText.toLowerCase().includes("<html")) {
        console.error("Local submissions data is HTML, not CSV. URL:", localUrl, "Response:", csvText.substring(0, 200));
        throw new Error("Failed to fetch local submissions CSV: Expected CSV, got HTML. Check path and server setup. URL: " + localUrl);
      }
      return new Promise<Submission[]>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: true,
          transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, ''),
          complete: (results) => {
            if (results.errors.length > 0) {
              results.errors.forEach(err => console.error("PapaParse local submissions error:", err.message, "(Code:", err.code, ") for URL", localUrl));
              const firstError = results.errors[0];
              if (firstError.code === 'UndetectableDelimiter') {
                 reject(new Error("Parsing error (local submissions): Could not detect delimiter. Is the data valid CSV?"));
              } else {
                reject(new Error(`Error parsing local submissions CSV from ${localUrl}. First error: ${firstError.message} (Code: ${firstError.code})`));
              }
              return;
            }
            const filteredData = results.data.filter(row =>
              Object.values(row as any).some(val => val !== null && val !== '')
            ) as Submission[];
            resolve(filteredData);
          },
          error: (error: Error) => {
            console.error("PapaParse critical error for local submissions CSV", localUrl, error);
            reject(new Error(`PapaParse failed critically for local submissions: ${error.message}`));
          }
        });
      });
    } catch (error) {
      console.error(`Error fetching/parsing local submissions from ${localUrl}:`, error);
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  } else {
    // Existing logic for fetching from Google Sheets (already modified in a previous step)
    const url = getSheetDataUrl(sheetId, SHEET_NAMES.submissions);
    console.log(`Fetching submissions from GSheet URL: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch submissions CSV: ${response.status} ${response.statusText}. Body: ${errorBody.substring(0,500)}`);
        if (errorBody.includes("gid must be a number") || errorBody.includes("Invalid sheet ID") || errorBody.includes("Worksheet not found")) {
           throw new Error(`Failed to fetch submissions CSV: Invalid sheet name ('${url.substring(url.lastIndexOf('=') + 1)}') or sheet not shared correctly? (${response.statusText})`);
        }
        throw new Error(`Failed to fetch submissions CSV: ${response.statusText}`);
      }
      const csvText = await response.text();

      if (!csvText.trim() || csvText.toLowerCase().includes("<html")) {
          console.error("Fetched submissions data is empty or HTML, not CSV. URL:", url, "Response:", csvText.substring(0, 200));
          if (csvText.toLowerCase().includes("<html")) {
              throw new Error("Failed to fetch CSV: Google Sheets returned an HTML page. This often means the sheet name is incorrect, the sheet is not published, or there are permission issues. URL: " + url);
          }
          throw new Error("No data found or invalid CSV format for submissions. Ensure the sheet tab exists and is shared correctly. URL: " + url);
      }

      const lines = csvText.split(/\r\n|\n|\r/);

      if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
        console.warn("Submissions CSV is effectively empty for URL:", url);
        return [];
      }

      let csvToParse: string;
      const firstLine = lines[0];
      const isMalformed = firstLine.startsWith('"Spotify URI') &&
                          firstLine.includes('spotify:track:') &&
                          firstLine.split('","').length < 3;

      if (isMalformed) {
        console.log("Malformed header detected in submissions sheet. Applying fix. Original first line sample:", firstLine.substring(0,150));
        if (lines.length < 2) {
          console.warn("Submissions CSV has only a malformed header and no subsequent lines. No data to parse for URL:", url);
          return [];
        }
        csvToParse = lines.slice(1).join('\n');
      } else {
        console.log("Submissions sheet header appears normal. Parsing as is. First line sample:", firstLine.substring(0,150));
        csvToParse = csvText;
      }

      if (!csvToParse.trim()) {
          console.warn("Submissions CSV to parse is empty after potential fix for URL:", url);
          return [];
      }

      return new Promise<Submission[]>((resolve, reject) => {
        Papa.parse(csvToParse, {
          header: true,
          skipEmptyLines: 'greedy',
          dynamicTyping: true,
          transformHeader: (header: string) => header.replace(/\s+/g, '').replace(/[()]/g, ''),
          complete: (results) => {
            if (results.errors.length > 0) {
              results.errors.forEach(err => console.error("PapaParse submissions error:", err.message, "(Code:", err.code, ") for URL", url));
              const firstError = results.errors[0];
               if (firstError.code === 'UndetectableDelimiter') {
                   reject(new Error("Parsing error (submissions): Could not detect delimiter. Is the data valid CSV?"));
              } else {
                  reject(new Error(`Error parsing CSV data for submissions from ${url}. First error: ${firstError.message} (Code: ${firstError.code})`));
              }
              return;
            }
            const filteredData = results.data.filter(row =>
              Object.values(row as any).some(val => val !== null && val !== '')
            ) as Submission[];
            resolve(filteredData);
          },
          error: (error: Error) => {
            console.error("PapaParse critical error for submissions URL", url, error);
            reject(new Error(`PapaParse failed critically for submissions: ${error.message}`));
          }
        });
      });

    } catch (error) {
      console.error(`Error in getSubmissions for GSheet URL ${url}:`, error);
      if (error instanceof Error) {
          throw error;
      } else {
          throw new Error(String(error));
      }
    }
  }
};

// Example of how to extract sheet ID from a full Google Sheet URL
export const extractSheetIdFromUrl = (url: string): string | null => {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};
