import Sentiment from 'sentiment';

/**
 * Calculates a sentiment score for a given text.
 * The score ranges from -1 (very negative) to 1 (very positive).
 *
 * @param text The input string to analyze.
 * @returns A sentiment score between -1 and 1, or 0 if the text is empty/whitespace.
 */
export function getSentimentScore(text: string): number {
  if (!text || text.trim() === '') {
    return 0;
  }

  const sentiment = new Sentiment();
  const analysis = sentiment.analyze(text);

  // Normalize the raw score. The library's typical effective range for 'score'
  // is often within -5 to +5. Dividing by 5 is a reasonable normalization strategy.
  const normalizedScore = analysis.score / 5;

  // Clamp the result to be within -1 and 1 to handle potential outliers.
  return Math.max(-1, Math.min(1, normalizedScore));
}

/**
 * Determines a background color based on a sentiment score.
 * The score is expected to be between -1 (very negative) and 1 (very positive).
 *
 * @param score The sentiment score.
 * @returns An HSL color string for negative/positive scores, or a light gray for neutral.
 */
export function getSentimentColor(score: number): string {
  // Clamp the score to ensure it's within the expected -1 to 1 range.
  const clampedScore = Math.max(-1, Math.min(1, score));

  if (clampedScore < -0.05) {
    // Negative sentiment: Interpolate hue from red (0) towards yellow (60)
    // As score goes from -1 to 0: hue = 60 * (1 + score)
    const hue = 60 * (1 + clampedScore);
    return `hsl(${hue}, 100%, 85%)`;
  } else if (clampedScore > 0.05) {
    // Positive sentiment: Interpolate hue from yellow (60) towards green (120)
    // As score goes from 0 to 1: hue = 60 + (60 * score)
    const hue = 60 + 60 * clampedScore;
    return `hsl(${hue}, 100%, 85%)`;
  } else {
    // Neutral sentiment: Return a light gray
    return 'hsl(0, 0%, 95%)';
  }
}
