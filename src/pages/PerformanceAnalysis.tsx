import React, { useContext, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { UserContext } from '../App';
import { usePlayerData } from '../lib/hooks/usePlayerData';

const PerformanceAnalysis: React.FC = () => {
  const { username } = useContext(UserContext);
  const { data, isLoading } = usePlayerData(username);

  // Transform data for scatter plot: x = Score, y = Constant, z = OP (size)
  const chartData = useMemo(() => {
    if (!data) return [];
    // Take top 500 scores so the browser doesn't lag rendering thousands of dots
    return data.processedScores.slice(0, 500).map(s => ({
      name: s.songTitle,
      score: s.score,
      constant: s.constant,
      opDisplay: Number((s.op / 10000).toFixed(2)),
      lamp: s.lamp
    }));
  }, [data]);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Performance Analysis</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Visualize your top 500 plays. Correlation between Score and Chart Constant.
      </p>

      {isLoading && <p style={{ color: 'var(--text-secondary)' }}>Loading visualization...</p>}

      {!isLoading && data && (
        <div style={{ height: '500px', width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                type="number" 
                dataKey="score" 
                name="Score" 
                domain={[900000, 1010000]} 
                stroke="var(--text-secondary)"
                tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'} 
              />
              <YAxis 
                type="number" 
                dataKey="constant" 
                name="Level Constant" 
                domain={['dataMin - 0.5', 'dataMax + 0.2']} 
                stroke="var(--text-secondary)" 
              />
              <ZAxis type="number" dataKey="opDisplay" range={[20, 150]} name="OP" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Scatter name="Scores" data={chartData} fill="var(--accent-primary)" fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default PerformanceAnalysis;
