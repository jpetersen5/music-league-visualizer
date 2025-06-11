import { Competitor, Submission, Vote, Round } from '../types';

export const calculateCumulativePoints = (
  allCompetitors: Competitor[],
  allSubmissions: Submission[],
  allVotes: Vote[],
  allRounds: Round[],
  targetRoundId: string | null
): Competitor[] => {
  // 1. Create a deep copy of allCompetitors and initialize totalPoints
  const competitorsWithPoints: Competitor[] = JSON.parse(JSON.stringify(allCompetitors));
  competitorsWithPoints.forEach(c => {
    if (c.totalPoints === undefined) {
      c.totalPoints = 0;
    }
  });

  // Create a map for quick lookup of competitors by ID
  const competitorMap = new Map<string, Competitor>();
  competitorsWithPoints.forEach(c => competitorMap.set(c.ID, c));

  // 2. Create a map for quick lookup of submissions
  const submissionOwnerMap = new Map<string, string>(); // Key: 'spotifyURI_roundID', Value: 'submitterID'
  allSubmissions.forEach(sub => {
    const key = sub.SpotifyURI + '_' + sub.RoundID;
    submissionOwnerMap.set(key, sub.SubmitterID);
  });

  // 3. Determine the set of RoundIDs to consider
  const relevantRoundIds = new Set<string>();

  if (targetRoundId === null) {
    // If targetRoundId is null, all rounds are relevant
    allRounds.forEach(r => relevantRoundIds.add(r.ID));
  } else {
    // Sort rounds by creation time to establish a sequence
    const sortedRounds = [...allRounds].sort((a, b) =>
      new Date(a.Created).getTime() - new Date(b.Created).getTime()
    );

    const targetRoundIndex = sortedRounds.findIndex(r => r.ID === targetRoundId);

    if (targetRoundIndex !== -1) {
      // If targetRound is found, include all rounds up to and including it
      for (let i = 0; i <= targetRoundIndex; i++) {
        relevantRoundIds.add(sortedRounds[i].ID);
      }
    } else {
      // If targetRoundId is specified but not found, include all rounds (permissive fallback)
      allRounds.forEach(r => relevantRoundIds.add(r.ID));
    }
  }

  // 4. Iterate through allVotes
  allVotes.forEach(vote => {
    // a. Check if vote.RoundID is one of the rounds to be included
    if (!relevantRoundIds.has(vote.RoundID)) {
      return; // Skip this vote
    }

    // b. Construct the key for submissionOwnerMap
    const submissionKey = vote.SpotifyURI + '_' + vote.RoundID;
    // c. Look up the submitterId
    const submitterId = submissionOwnerMap.get(submissionKey);

    if (submitterId) {
      // d. Find the competitor
      const competitor = competitorMap.get(submitterId);
      if (competitor) {
        // e. Add vote.PointsAssigned to their totalPoints
        competitor.totalPoints = (competitor.totalPoints || 0) + vote.PointsAssigned;
      }
    }
  });

  // 5. Return the augmented list of competitors
  return competitorsWithPoints;
};
