import React, { useEffect, useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { api } from '../lib/api/client.js';
import type { ApiHeatmapData, ApiChartMeta, ApiLampDistribution, ApiOpYield, ApiPlayerOpDistribution } from '../lib/types/index.js';
import { useGlobal } from '../lib/context/useGlobal.js';
import { GlobalFilterBar } from '../components/GlobalFilterBar.js';

const GRADES = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', '< S'];

const PerformanceAnalysis: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<ApiHeatmapData[]>([]);
  const [metaData, setMetaData] = useState<ApiChartMeta[]>([]);
  const [lampData, setLampData] = useState<ApiLampDistribution[]>([]);
  const [opYieldData, setOpYieldData] = useState<ApiOpYield[]>([]);
  const [playerOpData, setPlayerOpData] = useState<ApiPlayerOpDistribution[]>([]);
  
  const { filters } = useGlobal();
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);

  useEffect(() => {
    setIsLoadingGlobal(true);
    // Fetch global data
    Promise.all([
      api.getHeatmap(filters),
      api.getChartMeta(filters),
      api.getLampDistribution(filters),
      api.getOpYield(filters),
      api.getPlayerOpDistribution(filters)
    ]).then(([heatmap, meta, lamps, opYield, playerOp]) => {
      setHeatmapData(heatmap);
      setMetaData(meta);
      setLampData(lamps);
      setOpYieldData(opYield);
      setPlayerOpData(playerOp);
      setIsLoadingGlobal(false);
    }).catch(err => {
      console.error(err);
      setIsLoadingGlobal(false);
    });
  }, [filters]);

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

  const survivalData = useMemo(() => {
    return lampData.sort((a, b) => a.constant - b.constant).map(d => ({
      constant: d.constant.toFixed(1),
      ajRate: d.total > 0 ? ((d.ajc + d.aj) / d.total) * 100 : 0,
      fcRate: d.total > 0 ? ((d.ajc + d.aj + d.fc) / d.total) * 100 : 0,
    }));
  }, [lampData]);

  const sortedLampData = useMemo(() => {
    return lampData.map(d => ({
      ...d,
      constantLabel: d.constant.toFixed(1)
    })).sort((a, b) => a.constant - b.constant);
  }, [lampData]);

  const sortedOpYield = useMemo(() => {
    return opYieldData.map(d => ({
      ...d,
      constantLabel: d.constant.toFixed(1)
    })).sort((a, b) => a.constant - b.constant);
  }, [opYieldData]);

  const opDistribution = useMemo(() => {
    const buckets: Record<string, number> = {};
    const PERCENT_BUCKET_SIZE = 0.5;
    let minBucket = Infinity;
    let maxBucket = 0;

    playerOpData.forEach(p => {
      const percent = p.opPercent || 0;
      const bucketIndex = Math.floor(percent / PERCENT_BUCKET_SIZE);
      const b = bucketIndex * PERCENT_BUCKET_SIZE;
      const formattedB = b.toFixed(1);
      
      buckets[formattedB] = (buckets[formattedB] || 0) + 1;
      if (b < minBucket) minBucket = b;
      if (b > maxBucket) maxBucket = b;
    });

    if (minBucket === Infinity) return [];

    const result = [];
    const minIndex = Math.floor(minBucket / PERCENT_BUCKET_SIZE);
    const maxIndex = Math.floor(maxBucket / PERCENT_BUCKET_SIZE);

    for (let i = minIndex; i <= maxIndex; i++) {
      const val = i * PERCENT_BUCKET_SIZE;
      const key = val.toFixed(1);
      result.push({
        bucket: `${key}%`,
        count: buckets[key] || 0
      });
    }
    return result;
  }, [playerOpData]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Global Meta</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Universal statistics aggregated across all players and songs on the server.
          </p>
        </div>
        <GlobalFilterBar />
      </div>

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

          {/* Survival Rate */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>AJ & FC Survival Rate</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              The exact percentage chance of a player achieving an All Justice or Full Combo plotted against the Chart Constant. Shows the difficulty cliff.
            </p>
            <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={survivalData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="constant" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(val: any) => [val.toFixed(1) + '%']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ajRate" stroke="var(--rank-aj)" strokeWidth={3} name="All Justice Rate" dot={{ r: 3, fill: 'var(--rank-aj)' }} />
                  <Line type="monotone" dataKey="fcRate" stroke="var(--rank-fc)" strokeWidth={3} name="Full Combo Rate" dot={{ r: 3, fill: 'var(--rank-fc)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lamp Distribution Stacked Bar */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Server-Wide Lamp Distribution</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Normalized distribution of all logged lamps across chart constants. Compare this against your personal dashboard.
            </p>
            <div style={{ height: '350px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedLampData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }} stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="constantLabel" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `${Math.round(val * 100)}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value: any) => [value, undefined]}
                  />
                  <Legend content={(props: any) => {
                    const { payload } = props;
                    const order = ['All Justice Critical', 'All Justice', 'Full Combo', 'Clear', 'Failed'];
                    const sortedPayload = [...(payload || [])].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
                    return (
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                        {sortedPayload.map((entry, index) => (
                          <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                            <span style={{ width: 14, height: 14, backgroundColor: entry.color, display: 'inline-block', marginRight: 8, borderRadius: '2px' }}></span>
                            <span style={{ color: 'var(--text-primary)' }}>{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }} />
                  <Bar dataKey="ajc" stackId="a" fill="var(--rank-ajc)" name="All Justice Critical" />
                  <Bar dataKey="aj" stackId="a" fill="var(--rank-aj)" name="All Justice" />
                  <Bar dataKey="fc" stackId="a" fill="var(--rank-fc)" name="Full Combo" />
                  <Bar dataKey="clear" stackId="a" fill="var(--rank-clear)" name="Clear" />
                  <Bar dataKey="failed" stackId="a" fill="var(--rank-failed)" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lucrative OP Levels */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Average OP Yield by Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              The average percentage of maximum Overpower rewarded per play grouped by Chart Constant.
            </p>
            <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedOpYield} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="constantLabel" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" domain={['auto', 'auto']} tickFormatter={(val) => val.toFixed(0) + '%'} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(val: any) => [val.toFixed(2) + '%', "Average OP Yield"]}
                  />
                  <Bar dataKey="avgOp" fill="var(--accent-secondary)" name="Average OP" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Player Skill Stratification */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Server Skill Stratification</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              The bell curve of total Overpower for all players on the server.
            </p>
            <div style={{ height: '250px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opDistribution} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="bucket" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="count" fill="var(--accent-primary)" name="Players" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bubble Chart */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Global Chart Meta</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Level vs Average Score. Bubble size represents Play Count (Popularity). Identifies highly played "farm" charts vs avoided charts.
            </p>
            <div style={{ height: '500px', width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="constant" 
                    name="Chart Constant" 
                    stroke="var(--text-secondary)"
                    domain={['dataMin', 'dataMax']}
                    label={{ value: 'Chart Constant (Level)', position: 'insideBottomRight', fill: 'var(--text-secondary)', offset: -10 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="avgScore" 
                    name="Avg Score" 
                    domain={[975000, 1010000]}
                    stroke="var(--text-secondary)" 
                    tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                    label={{ value: 'Average Score', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }}
                  />
                  <ZAxis type="number" dataKey="playCount" domain={[0, 'dataMax']} range={[20, 1200]} name="Plays" />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter name="Charts" data={metaData.filter((d: any) => d.avgScore >= 975000)} fill="#ff66ff" fillOpacity={0.6} />
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
