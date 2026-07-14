import React, { useContext, useEffect, useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { GlobalContext } from '../lib/context/GlobalContext.js';
import { api } from '../lib/api/client.js';
import type { ApiProcessedScore } from '../lib/types/index.js';

const PerformanceAnalysis: React.FC = () => {
  const { activePlayer } = useContext(GlobalContext);
  const [scores, setScores] = useState<ApiProcessedScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activePlayer) return;
    setIsLoading(true);
    api.getPlayerScores(activePlayer, 500)
      .then(data => setScores(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [activePlayer]);

  // Transform data for scatter plot: x = Score, y = Constant, z = OP (size)
  const chartData = useMemo(() => {
    return scores.map(s => ({
      name: s.songTitle,
      score: s.score,
      constant: s.constant,
      opDisplay: Number((s.op / 10000).toFixed(2)),
      lamp: s.lamp
    }));
  }, [scores]);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Performance Analysis</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Visualize your top 500 plays. Correlation between Score and Chart Constant.
      </p>

      {!activePlayer && <p style={{ color: 'var(--text-secondary)' }}>Select a player to view performance analysis.</p>}
      {isLoading && <p style={{ color: 'var(--text-secondary)' }}>Loading visualization...</p>}

      {!isLoading && activePlayer && scores.length > 0 && (
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
