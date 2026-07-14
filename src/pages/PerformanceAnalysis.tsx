import React, { useEffect, useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { api } from '../lib/api/client.js';
import type { ApiHeatmapData, ApiChartMeta } from '../lib/types/index.js';

const GRADES = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', '< S'];

const PerformanceAnalysis: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<ApiHeatmapData[]>([]);
  const [metaData, setMetaData] = useState<ApiChartMeta[]>([]);
  
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);

  useEffect(() => {
    // Fetch global data
    Promise.all([
      api.getHeatmap(),
      api.getChartMeta()
    ]).then(([heatmap, meta]) => {
      setHeatmapData(heatmap);
      setMetaData(meta);
      setIsLoadingGlobal(false);
    }).catch(err => {
      console.error(err);
      setIsLoadingGlobal(false);
    });
  }, []);

  // Process Heatmap Data
  const { constants, grid } = useMemo(() => {
    if (!heatmapData.length) return { constants: [], grid: {} };
    
    // Get unique constants and sort them
    const constSet = new Set<number>();
    const countsByConst: Record<number, number> = {};
    
    heatmapData.forEach(d => {
      constSet.add(d.constant);
      countsByConst[d.constant] = (countsByConst[d.constant] || 0) + d.count;
    });
    
    const sortedConstants = Array.from(constSet).sort((a, b) => a - b);
    
    // Build grid [grade][constant] -> percentage 0-1
    const gridData: Record<string, Record<number, { percent: number, count: number }>> = {};
    GRADES.forEach(g => gridData[g] = {});
    
    heatmapData.forEach(d => {
      if (gridData[d.grade]) {
        gridData[d.grade][d.constant] = {
          count: d.count,
          percent: countsByConst[d.constant] > 0 ? d.count / countsByConst[d.constant] : 0
        };
      }
    });
    
    return { constants: sortedConstants, grid: gridData };
  }, [heatmapData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{data.title}</p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Level: <span style={{ color: 'var(--text-primary)' }}>{data.difficulty} {data.constant.toFixed(1)}</span></p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avg Score: <span style={{ color: 'var(--text-primary)' }}>{Math.round(data.avgScore).toLocaleString()}</span></p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Plays: <span style={{ color: 'var(--text-primary)' }}>{data.playCount}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 0' }}>
      
      {/* Global Meta Section */}
      <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Global Meta</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Universal statistics aggregated across all players and songs on the server.
      </p>

      {isLoadingGlobal ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading global statistics...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Heatmap */}
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Grade Density Heatmap</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Shows the normalized percentage of scores for each Chart Constant that fall into a specific Grade. (Brighter = Higher %)
            </p>
            
            <div style={{ display: 'inline-grid', gridTemplateColumns: `60px repeat(${constants.length}, 30px)`, gap: '2px', paddingBottom: '1rem' }}>
              {/* Header row */}
              <div style={{ padding: '4px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}></div>
              {constants.map(c => (
                <div key={c} style={{ padding: '4px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                  {c.toFixed(1)}
                </div>
              ))}

              {/* Data rows */}
              {GRADES.map(grade => (
                <React.Fragment key={grade}>
                  <div style={{ padding: '4px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {grade}
                  </div>
                  {constants.map(c => {
                    const cell = grid[grade][c];
                    const percent = cell?.percent || 0;
                    // Background opacity scales with percentage. 
                    const bg = `rgba(170, 59, 255, ${percent * 1.5})`; // x1.5 to make colors pop more
                    return (
                      <div 
                        key={c} 
                        title={`CC: ${c.toFixed(1)} | Grade: ${grade} | ${cell?.count || 0} plays (${(percent * 100).toFixed(1)}%)`}
                        style={{ 
                          background: percent > 0 ? bg : 'rgba(255,255,255,0.02)', 
                          borderRadius: '2px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          cursor: 'crosshair',
                          height: '30px'
                        }} 
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Bubble Chart */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Global Chart Meta</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Popularity (Play Count) vs Average Score. Bubble size represents Chart Constant. Identifies highly played "farm" charts vs avoided charts.
            </p>
            <div style={{ height: '500px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="playCount" 
                    name="Play Count" 
                    stroke="var(--text-secondary)"
                    label={{ value: 'Play Count (Popularity)', position: 'insideBottomRight', fill: 'var(--text-secondary)', offset: -10 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="avgScore" 
                    name="Avg Score" 
                    domain={['dataMin - 10000', 'dataMax + 10000']} 
                    stroke="var(--text-secondary)" 
                    tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                    label={{ value: 'Average Score', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                  />
                  <ZAxis type="number" dataKey="constant" range={[20, 200]} name="Constant" />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter name="Charts" data={metaData} fill="#ff66ff" fillOpacity={0.6} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default PerformanceAnalysis;
