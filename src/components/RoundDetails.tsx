// src/components/RoundDetails.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Round, Submission, Vote, Competitor } from '../types';
import { fetchTrackDataFromBackend, SongData } from '../services/spotifyAPI';
import VotesChart from './VotesChart';
import ExpandableText from './ExpandableText';
import './RoundDetails.scss'; // Import SCSS file

interface RoundDetailsProps {
  selectedRound: Round | null;
  onBackToList: () => void;
  allSubmissions: Submission[];
  allVotes: Vote[];
  allCompetitors: Competitor[];
  competitorsForRoundView: Competitor[]; // New: Competitors with points up to this round
}

const normalizeID = (id: string): string => {
  return id ? id.toLowerCase().trim() : '';
};

const RoundDetails: React.FC<RoundDetailsProps> = ({
  selectedRound,
  onBackToList,
  allSubmissions,
  allVotes,
  allCompetitors,
  competitorsForRoundView, // New prop
}) => {
  const [currentRoundSubmissions, setCurrentRoundSubmissions] = useState<Submission[]>([]);
  const [currentRoundVotes, setCurrentRoundVotes] = useState<Vote[]>([]);
  const [spotifyTrackDetails, setSpotifyTrackDetails] = useState<Record<string, SongData | null>>({});
  const [isLoadingSpotifyData, setIsLoadingSpotifyData] = useState<boolean>(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [competitorMap, setCompetitorMap] = useState<Map<string, string>>(new Map());


  useEffect(() => {
    if (!selectedRound) {
      setCurrentRoundSubmissions([]);
      setCurrentRoundVotes([]);
      setSpotifyTrackDetails({});
      setSpotifyError(null);
      setCompetitorMap(new Map());
      return;
    }

    // Create competitor lookup map
    const newCompetitorMap = new Map<string, string>();
    allCompetitors.forEach(c => {
      if (c.ID) {
        newCompetitorMap.set(normalizeID(c.ID), c.Name);
      }
    });
    setCompetitorMap(newCompetitorMap);

    const normalizedSelectedRoundID = normalizeID(selectedRound.ID);

    const filteredSubmissions = allSubmissions.filter(sub =>
      sub.RoundID && normalizeID(sub.RoundID) === normalizedSelectedRoundID
    );
    setCurrentRoundSubmissions(filteredSubmissions);

    const filteredVotes = allVotes.filter(vote =>
      vote.RoundID && normalizeID(vote.RoundID) === normalizedSelectedRoundID
    );
    setCurrentRoundVotes(filteredVotes);

    // Reset Spotify data for the new round
    setSpotifyTrackDetails({});
    setSpotifyError(null);

    if (filteredSubmissions.length > 0) {
      setIsLoadingSpotifyData(true);
      const fetchSpotifyDetails = async () => {
        const detailsMap: Record<string, SongData | null> = {};
        let anySpotifyFetchFailed = false;

        const spotifyPromises = filteredSubmissions.map(sub => {
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
      };
      fetchSpotifyDetails();
    } else {
      setIsLoadingSpotifyData(false); // No submissions, so no Spotify data to load
    }
    // setError and setIsLoading related to sheet data are removed as this is handled by SheetDataViewer

  }, [selectedRound, allSubmissions, allVotes, allCompetitors]);

  // Memoize submitter name lookup function for potential use in render
  const getSubmitterName = useMemo(() => (submitterId: string | undefined): string => {
    if (!submitterId) return 'Unknown Submitter';
    return competitorMap.get(normalizeID(submitterId)) || submitterId;
  }, [competitorMap]);

  // Memoize voter name lookup function for potential use in render
  const getVoterName = useMemo(() => (voterId: string | undefined): string => {
    if (!voterId) return 'Unknown Voter';
    return competitorMap.get(normalizeID(voterId)) || voterId;
  }, [competitorMap]);


  if (!selectedRound) {
    return <p>No round selected. Please select a round from the list.</p>;
  }

  // isLoading and error for sheet data are handled by SheetDataViewer
  // We only manage isLoadingSpotifyData and spotifyError here.

  const showChart = currentRoundVotes.length > 0 && currentRoundSubmissions.length > 0;

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

      {/* Removed isLoading and error messages related to sheet data */}
      {isLoadingSpotifyData && <p className="loading-message spotify-loading-message">Loading Spotify track data via backend...</p>}
      {spotifyError && <p className="spotify-error-message">{spotifyError}</p>}

      {/* Conditional rendering based on data presence, not global loading/error state */}
      <>
        {showChart ? (
          <VotesChart
            votes={currentRoundVotes}
            submissions={currentRoundSubmissions}
            spotifyTrackDetails={spotifyTrackDetails}
            // Pass competitorMap or lookup functions if needed by chart for names
          />
        ) : (
          !isLoadingSpotifyData && (currentRoundVotes.length === 0 || currentRoundSubmissions.length === 0) &&
          <p className="chart-unavailable-message">No votes or submissions yet for this round to display a chart, or still loading Spotify data.</p>
        )}

        <section className="submissions-section">
          <h3>Submissions ({currentRoundSubmissions.length})</h3>
          {currentRoundSubmissions.length === 0 && !isLoadingSpotifyData ? <p className="no-data-message">No submissions for this round.</p> : (
            <div className="submission-list">
              {[...currentRoundSubmissions]
                .sort((a, b) => {
                  const pointsA = currentRoundVotes
                    .filter(vote => vote.SpotifyURI === a.SpotifyURI)
                    .reduce((sum, vote) => sum + vote.PointsAssigned, 0);
                  const pointsB = currentRoundVotes
                    .filter(vote => vote.SpotifyURI === b.SpotifyURI)
                    .reduce((sum, vote) => sum + vote.PointsAssigned, 0);
                  return pointsB - pointsA;
                })
                .map((sub) => {
                const totalScoreForSubmission = currentRoundVotes
                  .filter(vote => vote.SpotifyURI === sub.SpotifyURI)
                  .reduce((sum, vote) => sum + vote.PointsAssigned, 0);
                const trackInfo = spotifyTrackDetails[sub.SpotifyURI];
                const albumArtUrl = trackInfo?.image_url;
                const submitterName = getSubmitterName(sub.SubmitterID);

                const votesForThisSubmission = currentRoundVotes.filter(
                  vote => vote.SpotifyURI === sub.SpotifyURI
                );

                const sortedVotesForThisSubmission = [...votesForThisSubmission].sort((a, b) => {
                  return b.PointsAssigned - a.PointsAssigned; // For descending order
                });

                return (
                  <div key={sub.SpotifyURI + sub.SubmitterID} className="submission-card">
                    {albumArtUrl && (
                      <img src={albumArtUrl} alt={sub.Album || 'Album art'} className="submission-item-artwork" />
                    )}
                    <div className="submission-item-info">
                      <strong>{sub.Title}</strong> by {sub.Artist}
                      <br />
                      Album: {sub.Album}
                      <br />
                      <span className="submission-score">Score: {totalScoreForSubmission}</span>
                      {sub.SpotifyURI.startsWith('spotify:track:') && (
                        <>
                          {' | '}
                          <a
                            href={`https://open.spotify.com/track/${sub.SpotifyURI.split(':')[2]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Listen on Spotify"
                            className="spotify-link-icon"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="1em" // Default size, can be overridden by CSS
                              height="1em" // Default size, can be overridden by CSS
                              aria-hidden="true"
                              className="spotify-play-icon" // Added class for styling
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </a>
                        </>
                      )}
                      <br />
                      Submitted by: {submitterName}
                      {sub.Comment && <p><em>Comment: {sub.Comment}</em></p>}
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
                    {/* Display votes for this submission */}
                    {sortedVotesForThisSubmission.length > 0 && (
                      <div className="submission-votes-section">
                        <h4 className="submission-votes-header">Votes Received:</h4>
                        <ul className="submission-votes-list">
                          {sortedVotesForThisSubmission.map((vote, voteIndex) => {
                            const voterName = getVoterName(vote.VoterID);
                            return (
                              <li key={`${vote.VoterID}-${vote.SpotifyURI}-${voteIndex}`} className="submission-vote-item">
                                <p><strong>{voterName}</strong> (+{vote.PointsAssigned})</p>
                                {vote.Comment && <p><em><ExpandableText text={vote.Comment} maxLength={100} /></em></p>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {votesForThisSubmission.length === 0 && !isLoadingSpotifyData && (
                      <p className="no-votes-for-submission-message">No votes for this track yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* The old standalone "Votes" section is now removed. */}
      </>

      {/* New section for cumulative points of competitors up to this round */}
      <section className="competitors-cumulative-points-section">
        <h3>Standings (Up to {selectedRound.Name})</h3>
        {competitorsForRoundView && competitorsForRoundView.length > 0 ? (
          <table className="competitors-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {[...competitorsForRoundView]
                .sort((a, b) => {
                  const pointsA = a.totalPoints === undefined ? 0 : a.totalPoints;
                  const pointsB = b.totalPoints === undefined ? 0 : b.totalPoints;
                  return pointsB - pointsA; // For descending order
                })
                .map((competitor, index, sortedCompetitors) => {
                  // Basic rank calculation (handle ties by giving same rank)
                  let rank = index + 1;
                  if (index > 0 && sortedCompetitors[index - 1].totalPoints === competitor.totalPoints) {
                    // If current competitor has same points as previous, they have the same rank
                    // Need to find the rank of the first competitor with these points
                    const firstEqualCompetitorIndex = sortedCompetitors.findIndex(c => c.totalPoints === competitor.totalPoints);
                    rank = firstEqualCompetitorIndex + 1;
                  }
                  return (
                    <tr key={competitor.ID}>
                      <td>{rank}</td>
                      <td>{competitor.Name}</td>
                      <td>{competitor.totalPoints ?? 0}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        ) : (
          <p>No competitor standings available for this round yet.</p>
        )}
      </section>
    </div>
  );
};

export default RoundDetails;
