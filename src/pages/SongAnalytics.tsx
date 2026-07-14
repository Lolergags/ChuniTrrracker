import React, { useContext, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { UserContext } from '../App';
import { usePlayerData } from '../lib/hooks/usePlayerData';

const SongAnalytics: React.FC = () => {
  const { username } = useContext(UserContext);
  const { data, isLoading } = usePlayerData(username);

  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Group by level constant (rounded to 1 decimal place, e.g., 14.0, 14.1)
    const distribution: Record<string, { name: string; ajc: number; aj: number; fc: number; clear: number; failed: number }> = {};
    
    data.processedScores.forEach(s => {
      // Only process Master/Ultima for cleaner analytics, or keep all. Let's keep all.
      const constStr = s.constant.toFixed(1);
      if (!distribution[constStr]) {
        distribution[constStr] = { name: constStr, ajc: 0, aj: 0, fc: 0, clear: 0, failed: 0 };
      }
      
      const bucket = distribution[constStr];
      if (s.lamp === 'AJC') bucket.ajc++;
      else if (s.lamp === 'AJ') bucket.aj++;
      else if (s.lamp === 'FC') bucket.fc++;
      else if (s.lamp === 'CLEAR') bucket.clear++;
      else bucket.failed++;
    });

    // Convert to array and sort by constant
    return Object.values(distribution).sort((a, b) => parseFloat(a.name) - parseFloat(b.name));
  }, [data]);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Song Analytics</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Lamp distribution across difficulty constants.
      </p>
      
      {isLoading && <p style={{ color: 'var(--text-secondary)' }}>Loading analytics...</p>}

      {!isLoading && chartData.length > 0 && (
        <div style={{ height: '500px', width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} angle={-45} textAnchor="end" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="ajc" stackId="a" fill="var(--rank-ajc)" name="All Justice Critical" />
              <Bar dataKey="aj" stackId="a" fill="var(--rank-aj)" name="All Justice" />
              <Bar dataKey="fc" stackId="a" fill="var(--rank-fc)" name="Full Combo" />
              <Bar dataKey="clear" stackId="a" fill="var(--rank-clear)" name="Clear" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SongAnalytics;
