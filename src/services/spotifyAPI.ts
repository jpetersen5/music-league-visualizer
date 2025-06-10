// src/services/spotifyAPI.ts

// IMPORTANT: Replace with your actual backend API URL
const API_URL = 'http://localhost:5000'; // Placeholder for your backend server

export interface SongData {
    image_url: string;
    tempo?: number | null;
    time_signature?: number | null;
    tempo_confidence?: number | null;
    time_signature_confidence?: number | null;
    danceability?: number | null;
    energy?: number | null;
    valence?: number | null;
    loudness?: number | null;
    genres?: string[]; // Made genres optional as per backend logic (can be empty if not found)
}

let spotifyAccessToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null; // To handle concurrent requests for token

const fetchNewSpotifyAccessToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_URL}/api/spotify/get_access_token`);
    if (!response.ok) {
      console.error('Failed to fetch Spotify access token:', response.status, await response.text());
      throw new Error('Failed to fetch Spotify access token');
    }
    const data = await response.json();
    if (!data.access_token) {
        console.error('No access_token in response from backend:', data);
        throw new Error('No access_token in response from backend');
    }
    console.log("Fetched new Spotify Access Token");
    return data.access_token || null;
  } catch (error) {
    console.error('Error fetching new Spotify access token:', error);
    spotifyAccessToken = null; // Clear token on error
    tokenPromise = null; // Clear promise on error
    throw error; // Re-throw to be caught by callers
  }
};

// Ensures only one token request is made at a time if multiple calls happen concurrently
const getSpotifyAccessToken = async (): Promise<string | null> => {
    if (spotifyAccessToken) { // Basic check, doesn't handle expiration here, assumes token is valid if present
        return spotifyAccessToken;
    }
    if (!tokenPromise) { // If no token and no request in flight
        console.log("No Spotify token, fetching new one...");
        tokenPromise = fetchNewSpotifyAccessToken().then(token => {
            spotifyAccessToken = token;
            tokenPromise = null; // Clear promise after completion
            return token;
        }).catch(error => {
            tokenPromise = null; // Clear promise on error
            throw error;
        });
    }
    return tokenPromise;
};


export const fetchTrackDataFromBackend = async (
    artist: string | null,
    title: string | null,
    album: string | null
): Promise<SongData | null> => {
    let tokenForRequest: string | null = null;
    try {
        tokenForRequest = await getSpotifyAccessToken();
    } catch (error) {
        // If token fetching fails, we can't proceed.
        console.error("Could not obtain Spotify access token for fetchTrackDataFromBackend.");
        return null;
    }

    if (!tokenForRequest) {
        console.error("Spotify access token is null, cannot fetch song data.");
        return null;
    }

    // Ensure empty strings if null, as per backend example
    const queryArtist = artist || "";
    const queryTitle = title || "";
    const queryAlbum = album || "";

    const queryParams = new URLSearchParams({
        artist: queryArtist,
        title: queryTitle,
        album: queryAlbum,
        access_token: tokenForRequest,
    });

    try {
        const response = await fetch(`${API_URL}/api/spotify/fetch_song_data?${queryParams.toString()}`);

        if (!response.ok) {
            // If 401, token might be expired, try to refresh it once and retry
            if (response.status === 401) {
                console.warn("Spotify API returned 401. Attempting to refresh token and retry...");
                spotifyAccessToken = null; // Force refresh
                tokenForRequest = await getSpotifyAccessToken(); // Get new token
                if (!tokenForRequest) {
                    console.error("Failed to refresh Spotify token, aborting retry.");
                    return null;
                }
                // Retry the request with the new token
                const retryQueryParams = new URLSearchParams({
                    artist: queryArtist,
                    title: queryTitle,
                    album: queryAlbum,
                    access_token: tokenForRequest,
                });
                const retryResponse = await fetch(`${API_URL}/api/spotify/fetch_song_data?${retryQueryParams.toString()}`);
                if (!retryResponse.ok) {
                    console.error(`Failed to fetch song data on retry (${retryResponse.status}):`, await retryResponse.text());
                    return null;
                }
                const retryData = await retryResponse.json();
                return retryData.error ? null : (retryData as SongData); // Check for backend's own error structure
            }
            console.error(`Failed to fetch song data (${response.status}):`, await response.text());
            return null;
        }

        const data = await response.json();
        // The backend might return an object with an "error" key for 404s or other issues
        if (data.error) {
            console.warn(`Backend returned error for song data: ${data.error}`, {artist, title, album});
            return null;
        }
        return data as SongData;
    } catch (error) {
        console.error("Error fetching song data from backend:", error);
        return null;
    }
};

// The old export {}; is no longer needed as we have new exports.
