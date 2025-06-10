// src/components/RoundDetails.tsx
import React, { useState, useEffect } from 'react';
import { Round, Submission, Vote } from '../types';
import { getSubmissions, getVotes } from '../services/googleSheets';
import { fetchTrackDataFromBackend, SongData } from '../services/spotifyAPI';
import VotesChart from './VotesChart';
import './RoundDetails.scss'; // Import SCSS file

interface RoundDetailsProps {
  sheetId: string | null;
  selectedRound: Round | null;
  onBackToList: () => void;
}

const RoundDetails: React.FC<RoundDetailsProps> = ({ sheetId, selectedRound, onBackToList }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [spotifyTrackDetails, setSpotifyTrackDetails] = useState<Record<string, SongData | null>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingSpotifyData, setIsLoadingSpotifyData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRound || !sheetId) {
      setSubmissions([]);
      setVotes([]);
      setSpotifyTrackDetails({});
      setError(null);
      setSpotifyError(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setIsLoadingSpotifyData(true);
      setError(null);
      setSpotifyError(null);
      setSpotifyTrackDetails({});

      try {
        const allSubmissions = await getSubmissions(sheetId);
        const roundSubmissions = allSubmissions.filter(sub => sub.RoundID === selectedRound.ID);
        setSubmissions(roundSubmissions);

        if (roundSubmissions.length > 0) {
          const detailsMap: Record<string, SongData | null> = {};
          let anySpotifyFetchFailed = false;

          const spotifyPromises = roundSubmissions.map(sub => {
            const artistName = sub.Artist?.split(',')[0].trim();
            return fetchTrackDataFromBackend(artistName || null, sub.Title || null, sub.Album || null)
              .then(trackData => ({ uri: sub.SpotifyURI, data: trackData }))
              .catch(sError => {
                console.error(`RoundDetails: Error fetching Spotify data for URI ${sub.SpotifyURI}:`, sError);
                return { uri: sub.SpotifyURI, data: null };
              });
          });

          const results = await Promise.all(spotifyPromises);

          results.forEach(result => {
            detailsMap[result.uri] = result.data;
            if (!result.data) {
              anySpotifyFetchFailed = true;
            }
          });

          setSpotifyTrackDetails(detailsMap);
          if (anySpotifyFetchFailed) {
            console.warn("RoundDetails: Some Spotify track details could not be fetched via backend.");
            setSpotifyError("Warning: Some Spotify track details could not be fetched. Data might be incomplete or missing audio features/genres.");
          }
          setIsLoadingSpotifyData(false);
        } else {
          setIsLoadingSpotifyData(false);
        }

        const allVotes = await getVotes(sheetId);
        const roundVotes = allVotes.filter(vote => vote.RoundID === selectedRound.ID);
        setVotes(roundVotes);

      } catch (err) {
        console.error(`RoundDetails: Error fetching sheet details for round ${selectedRound.ID}:`, err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setSubmissions([]);
        setVotes([]);
        setSpotifyTrackDetails({});
        setIsLoadingSpotifyData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [selectedRound, sheetId]);

  if (!selectedRound) {
    // This message can also be styled if needed via a class
    return <p>No round selected. Please select a round from the list.</p>;
  }

  const showChart = !isLoading && !error && votes.length > 0 && submissions.length > 0;

  return (
    <div className="round-details-container">
      <button onClick={onBackToList} className="round-details-back-button">&larr; Back to Rounds List</button>
      <h2 className="round-details-header">{selectedRound.Name}</h2>
      <p className="round-details-description">{selectedRound.Description}</p>
      {selectedRound.PlaylistURL && (
        <p className="round-details-playlist-link">
          <a href={selectedRound.PlaylistURL} target="_blank" rel="noopener noreferrer">Spotify Playlist (Original)</a>
        </p>
      )}

      {isLoading && <p className="loading-message">Loading round details from sheet...</p>}
      {isLoadingSpotifyData && !isLoading && <p className="loading-message spotify-loading-message">Loading Spotify track data via backend...</p>}

      {error && <p className="error-message">{error}</p>}
      {spotifyError && <p className="spotify-error-message">{spotifyError}</p>}

      {!isLoading && !error && (
        <>
          {showChart ? (
            <VotesChart
              votes={votes}
              submissions={submissions}
              spotifyTrackDetails={spotifyTrackDetails}
            />
          ) : (
            !isLoading && (votes.length === 0 || submissions.length === 0) && <p className="chart-unavailable-message">No votes or submissions yet for this round to display a chart.</p>
          )}

          <section className="submissions-section">
            <h3>Submissions ({submissions.length})</h3>
            {submissions.length === 0 ? <p className="no-data-message">No submissions for this round.</p> : (
              <ul>
                {submissions.map((sub) => {
                  const trackInfo = spotifyTrackDetails[sub.SpotifyURI];
                  const albumArtUrl = trackInfo?.image_url;

                  return (
                    <li key={sub.SpotifyURI + sub.SubmitterID} className="submission-item">
                      {albumArtUrl && (
                        <img src={albumArtUrl} alt={sub.Album || 'Album art'} className="submission-item-artwork" />
                      )}
                      <div className="submission-item-info">
                        <strong>{sub.Title}</strong> by {sub.Artist}
                        <br />
                        Album: {sub.Album}
                        {sub.SpotifyURI.startsWith('spotify:track:') && (
                           <> | <a href={`https://open.spotify.com/track/${sub.SpotifyURI.split(':')[2]}`} target="_blank" rel="noopener noreferrer">Listen on Spotify</a></>
                        )}
                        <br />
                        Submitted by: {sub.SubmitterID}
                        {sub.Comment && <p><em>Comment: {sub.Comment}</em></p>}
                        <p className="submission-item-visibility">Visible to Voters: {sub.VisibleToVoters}</p>
                        {trackInfo && (
                          <div className="submission-spotify-data">
                            <p><strong>Additional Spotify Data:</strong></p>
                            {trackInfo.genres && trackInfo.genres.length > 0 && <p>Genres: {trackInfo.genres.join(', ')}</p>}
                            {typeof trackInfo.tempo === 'number' && <p>Tempo: {Math.round(trackInfo.tempo)} BPM {typeof trackInfo.tempo_confidence === 'number' && `(Confidence: ${trackInfo.tempo_confidence.toFixed(2)})`}</p>}
                            {typeof trackInfo.time_signature === 'number' && <p>Time Signature: {trackInfo.time_signature}/4 {typeof trackInfo.time_signature_confidence === 'number' && `(Confidence: ${trackInfo.time_signature_confidence.toFixed(2)})`}</p>}
                            {typeof trackInfo.danceability === 'number' && <p>Danceability: {trackInfo.danceability.toFixed(2)}</p>}
                            {typeof trackInfo.energy === 'number' && <p>Energy: {trackInfo.energy.toFixed(2)}</p>}
                            {typeof trackInfo.valence === 'number' && <p>Valence: {trackInfo.valence.toFixed(2)}</p>}
                            {typeof trackInfo.loudness === 'number' && <p>Loudness: {trackInfo.loudness.toFixed(2)} dB</p>}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="votes-section">
            <h3>Votes ({votes.length})</h3>
            {votes.length === 0 ? <p className="no-data-message">No votes for this round yet.</p> : (
              <ul>
                {votes.map((vote, index) => {
                  const votedTrackDetails = spotifyTrackDetails[vote.SpotifyURI];
                  const albumArtUrl = votedTrackDetails?.image_url;
                  return (
                    <li key={`${vote.SpotifyURI}-${vote.VoterID}-${index}`} className="vote-item">
                      Voter: {vote.VoterID}, Points: {vote.PointsAssigned}
                      <div className="vote-item-track-info">
                        {albumArtUrl && (
                            <img src={albumArtUrl} alt={'Album art'} className="vote-item-artwork" />
                        )}
                        <span>
                            Track URI: {vote.SpotifyURI}
                            {votedTrackDetails && typeof votedTrackDetails.tempo === 'number' ? ` (Tempo: ${votedTrackDetails.tempo.toFixed(0)})` : ''}
                             {votedTrackDetails && votedTrackDetails.genres && votedTrackDetails.genres.length > 0 ? ` (Genre: ${votedTrackDetails.genres[0]})` : ''}
                        </span>
                      </div>
                      {vote.Comment && <p><em>Comment: {vote.Comment}</em></p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default RoundDetails;
