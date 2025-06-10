export interface Round {
  ID: string;
  Created: string;
  Name: string;
  Description: string;
  PlaylistURL: string;
}

export interface Competitor {
  ID: string;
  Name: string;
}

export interface Vote {
  SpotifyURI: string;
  VoterID: string;
  Created: string;
  PointsAssigned: number;
  Comment: string;
  RoundID: string;
}

export interface Submission {
  SpotifyURI: string;
  Title: string;
  Album: string;
  Artist: string;
  SubmitterID: string;
  Created: string;
  Comment: string;
  RoundID: string;
  VisibleToVoters: "Yes" | "No";
}
