import { getSentimentScore, getSentimentColor } from './sentimentUtils';

describe('sentimentUtils', () => {
  describe('getSentimentScore', () => {
    it('should return a positive score for a positive string', () => {
      const score = getSentimentScore("This is great! I love it.");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return a negative score for a negative string', () => {
      const score = getSentimentScore("This is terrible, I hate it.");
      expect(score).toBeLessThan(0);
      expect(score).toBeGreaterThanOrEqual(-1);
    });

    it('should return a score close to 0 for a neutral string', () => {
      // Note: "neutral" can be tricky. Sentiment libraries might still assign a slight score.
      // We'll check if it's within a small range around 0.
      // "This is a statement." -> AFINN assigns 0.
      const score = getSentimentScore("This is a statement.");
      // For this library, a truly neutral statement often results in 0.
      // If it were more complex, we might use: expect(score).toBeCloseTo(0, 1);
      // For "This is a statement.", the sentiment library gives a score of 0.
      // analysis.score is 0. 0 / 5 = 0.
      expect(score).toEqual(0);
    });

    it('should return 0 for an empty string', () => {
      expect(getSentimentScore("")).toBe(0);
    });

    it('should return 0 for a string with only whitespace', () => {
      expect(getSentimentScore("   ")).toBe(0);
    });

    it('should clamp a very positive score to 1', () => {
      // "excellent fantastic wonderful amazing superb" has a raw score of 2+3+4+4+3 = 16
      // 16/5 = 3.2, which should be clamped to 1
      const score = getSentimentScore("excellent fantastic wonderful amazing superb joy triumph happy");
      expect(score).toBe(1);
    });

    it('should clamp a very negative score to -1', () => {
      // "awful dreadful horrible terrible vile" has a raw score of -3-3-3-3-3 = -15
      // -15/5 = -3, which should be clamped to -1
      const score = getSentimentScore("awful dreadful horrible terrible vile doom gloom sad");
      expect(score).toBe(-1);
    });
  });

  describe('getSentimentColor', () => {
    const NEUTRAL_COLOR = 'hsl(0, 0%, 95%)';

    it('should return green-like for score 1', () => {
      expect(getSentimentColor(1)).toBe('hsl(120, 100%, 85%)');
    });

    it('should return red-like for score -1', () => {
      expect(getSentimentColor(-1)).toBe('hsl(0, 100%, 85%)');
    });

    it('should return neutral for score 0', () => {
      expect(getSentimentColor(0)).toBe(NEUTRAL_COLOR);
    });

    it('should return neutral for score 0.05 (at positive threshold)', () => {
      expect(getSentimentColor(0.05)).toBe(NEUTRAL_COLOR);
    });

    it('should return neutral for score -0.05 (at negative threshold)', () => {
      expect(getSentimentColor(-0.05)).toBe(NEUTRAL_COLOR);
    });

    it('should return yellowish-green for score 0.5', () => {
      // hue = 60 + (60 * 0.5) = 60 + 30 = 90
      expect(getSentimentColor(0.5)).toBe('hsl(90, 100%, 85%)');
    });

    it('should return orange-like for score -0.5', () => {
      // hue = 60 * (1 + (-0.5)) = 60 * 0.5 = 30
      expect(getSentimentColor(-0.5)).toBe('hsl(30, 100%, 85%)');
    });

    it('should return positive color for score 0.06 (just above positive threshold)', () => {
      const color = getSentimentColor(0.06);
      expect(color).not.toBe(NEUTRAL_COLOR);
      // hue = 60 + (60 * 0.06) = 60 + 3.6 = 63.6
      expect(color).toBe('hsl(63.6, 100%, 85%)');
    });

    it('should return negative color for score -0.06 (just below negative threshold)', () => {
      const color = getSentimentColor(-0.06);
      expect(color).not.toBe(NEUTRAL_COLOR);
      // hue = 60 * (1 + (-0.06)) = 60 * 0.94 = 56.4
      expect(color).toBe('hsl(56.4, 100%, 85%)');
    });

    it('should return neutral color for score 0.04 (just below positive threshold)', () => {
      expect(getSentimentColor(0.04)).toBe(NEUTRAL_COLOR);
    });

    it('should return neutral color for score -0.04 (just above negative threshold)', () => {
      expect(getSentimentColor(-0.04)).toBe(NEUTRAL_COLOR);
    });

    it('should clamp scores greater than 1 for color calculation', () => {
      expect(getSentimentColor(1.5)).toBe('hsl(120, 100%, 85%)');
    });

    it('should clamp scores less than -1 for color calculation', () => {
      expect(getSentimentColor(-1.5)).toBe('hsl(0, 100%, 85%)');
    });
  });
});
