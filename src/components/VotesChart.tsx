// src/components/VotesChart.tsx
import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LabelList
} from 'recharts';
// Import TooltipProps
import type { TooltipProps } from 'recharts';
import { Vote, Submission } from '../types';
import { SongData } from '../services/spotifyAPI';
import './VotesChart.scss';

interface VotesChartProps {
  votes: Vote[];
  submissions: Submission[];
  spotifyTrackDetails?: Record<string, SongData | null>;
}

interface ChartDataPoint {
  name: string;
  points: number;
  spotifyUri: string;
}

// Define types for value and name if using TooltipProps<TValue, TName>
// TValue is the type of the value of the data point (e.g., 'points' which is number)
// TName is the type of the dataKey or name of the data series (e.g., 'points' which is string)
type ValueType = number;
type NameType = string;

const VotesChart: React.FC<VotesChartProps> = ({ votes, submissions, spotifyTrackDetails }) => {
  if (votes.length === 0) {
    return <p>No votes to display in chart.</p>;
  }

  const pointsPerUri: Record<string, number> = votes.reduce((acc, vote) => {
    acc[vote.SpotifyURI] = (acc[vote.SpotifyURI] || 0) + (vote.PointsAssigned || 0);
    return acc;
  }, {} as Record<string, number>);

  const chartData: ChartDataPoint[] = Object.entries(pointsPerUri)
    .map(([uri, points]) => {
      const submission = submissions.find(sub => sub.SpotifyURI === uri);
      let name = submission?.Title || uri;
      if (submission?.Artist) {
        name += ` - ${submission.Artist}`;
      }
      return { name, points, spotifyUri: uri };
    })
    .sort((a, b) => b.points - a.points);

  // If votes exist but chartData is empty, it means no submissions matched or all points were zero.
  if (chartData.length === 0) {
    return <p>No chart data to display (e.g., votes may not match submissions or all points are zero).</p>;
  }

  // Typed CustomTooltip
  const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // The payload[0].payload is the original ChartDataPoint object for this bar
      const originalDataPoint = payload[0].payload as ChartDataPoint;
      const currentPoints = payload[0].value; // This is the 'points' value for the hovered bar

      const spotifyInfo = originalDataPoint?.spotifyUri ? spotifyTrackDetails?.[originalDataPoint.spotifyUri] : null;

      return (
        <div className="votes-chart-tooltip">
          <p className="tooltip-label">{`${label}`}</p> {/* 'label' is the YAxis dataKey value (track name) */}
          <p className="tooltip-intro">{`Points: ${currentPoints}`}</p>
          {spotifyInfo?.genres?.[0] && <p className="tooltip-detail">Genre: {spotifyInfo.genres[0]}</p>}
          {typeof spotifyInfo?.tempo === 'number' && <p className="tooltip-detail">Tempo: {spotifyInfo.tempo.toFixed(0)} BPM</p>}
        </div>
      );
    }
    return null;
  };

  const yAxisTickFormatter = (value: string) => {
    const maxLength = 30; // Adjusted max length for Y-axis tick labels
    if (value.length > maxLength) {
      return `${value.substring(0, maxLength - 3)}...`; // Ensure space for "..."
    }
    return value;
  };

  return (
    <div className="votes-chart-container">
      <h4>Votes Distribution</h4>
      <ResponsiveContainer width="95%" height={Math.max(300, chartData.length * 35) + (chartData.length > 10 ? 20 : 0 )}>
        <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 35, left: 25, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} dataKey="points" /> {/* Added dataKey for clarity */}
          <YAxis
            type="category"
            dataKey="name"
            width={200}
            tickFormatter={yAxisTickFormatter}
            interval={0}
            tick={{ fontSize: 11, fill: '#333' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(200,200,200,0.2)'}}/>
          <Legend wrapperStyle={{paddingTop: '15px'}}/>
          <Bar dataKey="points" fill="#82ca9d" name="Total Points" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="points" position="right" style={{ fill: '#333', fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VotesChart;
