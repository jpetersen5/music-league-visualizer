import { getRounds, getCompetitors, getVotes, getSubmissions, TEST_SHEET_ID } from './googleSheets';

// Mock data representing the content of your CSV files
const mockRoundsCsv = `ID,Created,Name,Description,Playlist URL
round_id_1,2025-03-03T00:46:13Z,Can Openers,Songs that were the first track on an album,https://open.spotify.com/playlist/2ievyieWski9zKu0XThEub
round_id_2,2025-03-03T00:46:14Z,1990s,Songs released in the 1990s,https://open.spotify.com/playlist/1gnfQ3WfIY6jVem6WhYWgO
round_id_3,2025-03-03T00:46:15Z,Empty Round,A round with no submissions or votes,https://open.spotify.com/playlist/empty
round_id_4,2025-03-03T00:46:16Z,Colors Round,Songs with colors,https://open.spotify.com/playlist/colors`;

const mockCompetitorsCsv = `ID,Name
competitor_id_1,NerdyFoxTV
competitor_id_2,Hababa
competitor_id_3,Bode
competitor_id_4,Spleen`;

const mockSubmissionsCsv = `Spotify URI,Title,Album,Artist(s),Submitter ID,Created,Comment,Round ID,Visible To Voters
spotify:track:track1_round1,Story,Grow,Chon,competitor_id_2,2025-03-03T01:35:47Z,Great opener,round_id_1,Yes
spotify:track:track2_round1,Iconoclast,Iconoclast,Symphony X,competitor_id_1,2025-03-03T01:20:58Z,Absolute banger,round_id_1,Yes
spotify:track:track3_round1,8 Gates Of Pleasure,Every Sound Has A Color,Night Verses,competitor_id_3,2025-03-03T08:03:03Z,,round_id_1,No
spotify:track:track1_round2,Circle,In a Reverie,Lacuna Coil,competitor_id_1,2025-03-11T18:27:40Z,90s classic,round_id_2,Yes
spotify:track:track2_round2,Fatal Tragedy,Metropolis Pt. 2,Dream Theater,competitor_id_3,2025-03-11T17:44:26Z,,round_id_2,Yes`;

const mockVotesCsv = `Spotify URI,Voter ID,Created,Points Assigned,Comment,Round ID
spotify:track:track1_round1,competitor_id_1,2025-03-07T00:32:10Z,3,Love Chon!,round_id_1
spotify:track:track1_round1,competitor_id_3,2025-03-07T00:32:16Z,2,Chon good,round_id_1
spotify:track:track2_round1,competitor_id_2,2025-03-07T00:53:12Z,1,Symphony X rocks,round_id_1
spotify:track:track1_round2,competitor_id_4,2025-03-13T22:36:33Z,3,Cool 90s song,round_id_2
spotify:track:track2_round2,competitor_id_1,2025-03-13T22:40:40Z,2,DT FTW,round_id_2
spotify:track:track2_round2,competitor_id_2,2025-03-14T01:22:15Z,1,,round_id_2`;

// Mock global.fetch
global.fetch = jest.fn();

const mockFetch = (url: string) => {
    let csvData = '';
    if (url === '/testdata/rounds.csv') csvData = mockRoundsCsv;
    else if (url === '/testdata/competitors.csv') csvData = mockCompetitorsCsv;
    else if (url === '/testdata/votes.csv') csvData = mockVotesCsv;
    else if (url === '/testdata/submissions.csv') csvData = mockSubmissionsCsv;
    else return Promise.resolve({ ok: false, status: 404, text: async () => 'Not Found' } as Response);

    return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => csvData,
    } as Response);
};

describe('googleSheets service - local data fetching', () => {
    beforeEach(() => {
        // Assign the mock implementation to global.fetch before each test
        (global.fetch as jest.Mock).mockImplementation(mockFetch);
    });

    afterEach(() => {
        // Clear all mocks after each test
        jest.clearAllMocks();
    });

    test('getRounds should fetch and parse rounds.csv correctly', async () => {
        const rounds = await getRounds(TEST_SHEET_ID, true); // TEST_SHEET_ID is a placeholder
        expect(global.fetch).toHaveBeenCalledWith('/testdata/rounds.csv');
        expect(rounds).toHaveLength(4); // Updated length
        expect(rounds[0].Name).toBe('Can Openers');
        expect(rounds[0].ID).toBe('round_id_1');
        expect(rounds[1].PlaylistURL).toBe('https://open.spotify.com/playlist/1gnfQ3WfIY6jVem6WhYWgO');
        expect(rounds[1].ID).toBe('round_id_2');
        expect(rounds[2].Name).toBe('Empty Round');
        expect(rounds[3].ID).toBe('round_id_4');
    });

    test('getCompetitors should fetch and parse competitors.csv correctly', async () => {
        const competitors = await getCompetitors(TEST_SHEET_ID, true);
        expect(global.fetch).toHaveBeenCalledWith('/testdata/competitors.csv');
        expect(competitors).toHaveLength(4); // Updated length
        expect(competitors[0].ID).toBe('competitor_id_1');
        expect(competitors[0].Name).toBe('NerdyFoxTV');
        expect(competitors[1].Name).toBe('Hababa');
        expect(competitors[2].ID).toBe('competitor_id_3');
        expect(competitors[3].Name).toBe('Spleen');
    });

    test('getVotes should fetch and parse votes.csv correctly', async () => {
        const votes = await getVotes(TEST_SHEET_ID, true);
        expect(global.fetch).toHaveBeenCalledWith('/testdata/votes.csv');
        expect(votes).toHaveLength(6); // Updated length
        expect(votes[0].SpotifyURI).toBe('spotify:track:track1_round1');
        expect(votes[0].VoterID).toBe('competitor_id_1');
        expect(votes[0].PointsAssigned).toBe(3);
        expect(votes[0].RoundID).toBe('round_id_1');
        expect(votes[1].PointsAssigned).toBe(2);
        expect(votes[1].VoterID).toBe('competitor_id_3');
        expect(votes[3].SpotifyURI).toBe('spotify:track:track1_round2');
        expect(votes[3].VoterID).toBe('competitor_id_4');
    });

    test('getSubmissions should fetch and parse submissions.csv correctly', async () => {
        const submissions = await getSubmissions(TEST_SHEET_ID, true);
        expect(global.fetch).toHaveBeenCalledWith('/testdata/submissions.csv');
        expect(submissions).toHaveLength(5); // Updated length
        expect(submissions[0].SpotifyURI).toBe('spotify:track:track1_round1');
        expect(submissions[0].Title).toBe('Story');
        expect(submissions[0].Artist).toBe('Chon');
        expect(submissions[0].SubmitterID).toBe('competitor_id_2');
        expect(submissions[0].RoundID).toBe('round_id_1');
        expect(submissions[0].VisibleToVoters).toBe('Yes');
        expect(submissions[1].Title).toBe('Iconoclast');
        expect(submissions[1].SubmitterID).toBe('competitor_id_1');
        expect(submissions[3].SpotifyURI).toBe('spotify:track:track1_round2');
        expect(submissions[4].VisibleToVoters).toBe('Yes');
    });

    test('getRounds handles fetch error for local data', async () => {
        (global.fetch as jest.Mock).mockImplementation(async () => ({
             ok: false, status: 500, text: async () => 'Internal Server Error', statusText: 'Internal Server Error' // Added statusText
        }));
        await expect(getRounds(TEST_SHEET_ID, true)).rejects.toThrow('Failed to fetch local rounds CSV: Internal Server Error.');
    });

    test('getRounds handles empty CSV content for local data', async () => {
        (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
            if (url === '/testdata/rounds.csv') {
                return { ok: true, status: 200, text: async () => '' };
            }
            return { ok: false, status: 404, text: async () => 'Not Found' };
        });
        const rounds = await getRounds(TEST_SHEET_ID, true);
        expect(rounds).toEqual([]);
    });

});
