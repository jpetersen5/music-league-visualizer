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

const mockSubmissionsCsv = `Spotify URI,Title,Album,Artist,Submitter ID,Created,Comment,Round ID,Visible To Voters
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

// Define a general mock fetch implementation
async function mockFetchImplementation(url: string): Promise<Response> {
    let csvData = '';
    let ok = true;
    let status = 200;
    let statusText = 'OK';

    if (url === '/testdata/rounds.csv') {
        csvData = mockRoundsCsv;
    } else if (url === '/testdata/competitors.csv') {
        csvData = mockCompetitorsCsv;
    } else if (url === '/testdata/votes.csv') {
        csvData = mockVotesCsv;
    } else if (url === '/testdata/submissions.csv') {
        csvData = mockSubmissionsCsv;
    } else if (url === 'http://error.test/500') { // For testing 500 error
        ok = false;
        status = 500;
        statusText = 'Internal Server Error';
        csvData = 'Server Error Text'; // Simulate error response body
    } else if (url === 'http://error.test/404') { // For testing 404 error
        ok = false;
        status = 404;
        statusText = 'Not Found';
        csvData = 'File Not Found'; // Simulate error response body
    } else if (url === 'http://error.test/empty') { // For testing empty CSV response
         csvData = ''; // Empty data
    } else if (url === 'http://error.test/403') {
        ok = false; status = 403; statusText = 'Forbidden'; csvData = 'Access denied';
    } else if (url === 'http://error.test/503') {
        ok = false; status = 503; statusText = 'Service Unavailable'; csvData = 'Service down';
    }
    // Fallback for unhandled URLs used by existing tests for error states in individual functions
    // These specific URLs are tied to how tests like `getRounds handles fetch error for local data`
    // were set up before this centralized mock. We need to ensure those tests still can trigger
    // specific error conditions if they were relying on mockImplementation being set per-test.
    // For now, the most common error cases are covered by the specific http://error.test URLs
    // and the direct /testdata/ paths.
    // A generic fallback for truly unhandled URLs:
    else if (!url.startsWith('/testdata/')) { // Avoid overriding testdata paths with this generic error
        console.warn(`Unhandled URL in mockFetchImplementation: ${url}. Returning generic 404.`);
        ok = false;
        status = 404;
        statusText = 'Not Found';
        csvData = 'Generic error response for unhandled URL';
    }
    // If url starts with /testdata/ but isn't one of the above, it means a test is asking for a
    // testdata file that *doesn't* have a mock constant. This is an error in the test setup.
    else if (url.startsWith('/testdata/')) {
        console.error(`mockFetchImplementation: Attempted to fetch unmocked local data: ${url}`);
        ok = false;
        status = 404; // Or 500, as it's a server-side (test setup) error
        statusText = 'Test data not mocked';
        csvData = `No mock CSV data defined for ${url}`;
    }


    return Promise.resolve({
        ok,
        text: () => Promise.resolve(csvData),
        status,
        statusText,
    } as Response);
}

describe('googleSheets service - local data fetching', () => {
    let fetchSpy: jest.SpyInstance;

    beforeAll(() => {
        fetchSpy = jest.spyOn(global, 'fetch');
    });

    beforeEach(() => {
        // Assign the mock implementation to global.fetch before each test
        fetchSpy.mockImplementation(mockFetchImplementation);
    });

    afterEach(() => {
        // Clear mock usage history after each test
        fetchSpy.mockClear();
    });

    afterAll(() => {
        // Restore the original fetch function
        fetchSpy.mockRestore();
    });

    test('getRounds should fetch and parse rounds.csv correctly', async () => {
        const rounds = await getRounds(TEST_SHEET_ID, true); // TEST_SHEET_ID is a placeholder
        expect(global.fetch).toHaveBeenCalledWith('/testdata/rounds.csv');
        expect(rounds).toHaveLength(4);
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
        expect(competitors).toHaveLength(4);
        expect(competitors[0].ID).toBe('competitor_id_1');
        expect(competitors[0].Name).toBe('NerdyFoxTV');
        expect(competitors[1].Name).toBe('Hababa');
        expect(competitors[2].ID).toBe('competitor_id_3');
        expect(competitors[3].Name).toBe('Spleen');
    });

    test('getVotes should fetch and parse votes.csv correctly', async () => {
        const votes = await getVotes(TEST_SHEET_ID, true);
        expect(global.fetch).toHaveBeenCalledWith('/testdata/votes.csv');
        expect(votes).toHaveLength(6);
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
        expect(submissions).toHaveLength(5);
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
        fetchSpy.mockImplementation(async () => ({
             ok: false, status: 500, statusText: 'Internal Server Error', text: async () => 'Server Error Text'
        }));
        await expect(getRounds(TEST_SHEET_ID, true)).rejects.toThrow(
            "Failed to fetch local rounds CSV from '/testdata/rounds.csv'. Status: 500 - Internal Server Error. Ensure the file exists and is accessible."
        );
    });

    test('getRounds handles fetch error with empty statusText for local data', async () => {
        fetchSpy.mockImplementation(async () => ({
             ok: false, status: 404, statusText: '', text: async () => 'Error Text'
        }));
        await expect(getRounds(TEST_SHEET_ID, true)).rejects.toThrow(
            "Failed to fetch local rounds CSV from '/testdata/rounds.csv'. Status: 404. Ensure the file exists and is accessible."
        );
    });

    test('getRounds handles empty CSV content for local data', async () => {
        fetchSpy.mockImplementation(async (url: string) => {
            if (url === '/testdata/rounds.csv') {
                return { ok: true, status: 200, text: async () => '' } as Response;
            }
            // Default to a 404 for other URLs in this specific test
            return { ok: false, status: 404, statusText: 'Not Found', text: async () => 'Not Found' } as Response;
        });
        const rounds = await getRounds(TEST_SHEET_ID, true);
        expect(rounds).toEqual([]);
    });

    // Tests for getVotes
    test('getVotes should fetch and parse votes.csv correctly', async () => {
        const votes = await getVotes(TEST_SHEET_ID, true);
        expect(fetchSpy).toHaveBeenCalledWith('/testdata/votes.csv');
        expect(votes).toHaveLength(6);
        expect(votes[0].SpotifyURI).toBe('spotify:track:track1_round1');
        expect(votes[0].VoterID).toBe('competitor_id_1');
    });

    test('getVotes handles fetch error for local data', async () => {
        fetchSpy.mockImplementation(async () => ({
            ok: false, status: 404, statusText: 'Not Found', text: async () => 'File not found'
        }));
        await expect(getVotes(TEST_SHEET_ID, true)).rejects.toThrow(
            "Failed to fetch local votes CSV from '/testdata/votes.csv'. Status: 404 - Not Found. Ensure the file exists and is accessible."
        );
    });

    test('getVotes handles fetch error with empty statusText for local data', async () => {
        fetchSpy.mockImplementation(async () => ({
            ok: false, status: 500, statusText: '', text: async () => 'Server problem'
        }));
        await expect(getVotes(TEST_SHEET_ID, true)).rejects.toThrow(
            "Failed to fetch local votes CSV from '/testdata/votes.csv'. Status: 500. Ensure the file exists and is accessible."
        );
    });

    // Tests for getCompetitors
    test('getCompetitors should fetch and parse competitors.csv correctly', async () => {
        const competitors = await getCompetitors(TEST_SHEET_ID, true);
        expect(fetchSpy).toHaveBeenCalledWith('/testdata/competitors.csv');
        expect(competitors).toHaveLength(4);
        expect(competitors[0].ID).toBe('competitor_id_1');
    });

    test('getCompetitors handles fetch error for local data', async () => {
        fetchSpy.mockImplementation(async () => ({
            ok: false, status: 403, statusText: 'Forbidden', text: async () => 'Access denied'
        }));
        await expect(getCompetitors(TEST_SHEET_ID, true)).rejects.toThrow(
            "Failed to fetch local competitors CSV from '/testdata/competitors.csv'. Status: 403 - Forbidden. Ensure the file exists and is accessible."
        );
    });

    // Tests for getSubmissions
    test('getSubmissions should fetch and parse submissions.csv correctly', async () => {
        const submissions = await getSubmissions(TEST_SHEET_ID, true);
        expect(fetchSpy).toHaveBeenCalledWith('/testdata/submissions.csv');
        expect(submissions).toHaveLength(5);
        expect(submissions[0].SpotifyURI).toBe('spotify:track:track1_round1');
    });

    test('getSubmissions handles fetch error for local data', async () => {
        fetchSpy.mockImplementation(async () => ({
            ok: false, status: 503, statusText: 'Service Unavailable', text: async () => 'Service down'
        }));
        await expect(getSubmissions(TEST_SHEET_ID, true)).rejects.toThrow(
            "Failed to fetch local submissions CSV from '/testdata/submissions.csv'. Status: 503 - Service Unavailable. Ensure the file exists and is accessible."
        );
    });
});
