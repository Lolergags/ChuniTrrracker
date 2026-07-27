import React, { useEffect, useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, BarChart, Bar, Legend, LineChart, Line, Brush } from 'recharts';
import { RotateCcw } from 'lucide-react';
import { api } from '../lib/api/client.js';
import type { ApiHeatmapData, ApiChartMeta, ApiLampDistribution, ApiOpYield, ApiPlayerOpDistribution } from '../lib/types/index.js';
import { useGlobal } from '../lib/context/useGlobal.js';
import { GlobalFilterBar } from '../components/GlobalFilterBar.js';
import { LampTooltip } from '../components/ChartTooltips.js';


const GRADES = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', '< S'];

const PerformanceAnalysis: React.FC = () => {
  const [heatmapData, setHeatmapData] = useState<ApiHeatmapData[]>([]);
  const [metaData, setMetaData] = useState<ApiChartMeta[]>([]);
  const [lampData, setLampData] = useState<ApiLampDistribution[]>([]);
  const [opYieldData, setOpYieldData] = useState<ApiOpYield[]>([]);
  const [playerOpData, setPlayerOpData] = useState<ApiPlayerOpDistribution[]>([]);
  
  const { filters } = useGlobal();
  const [globalScatterZoomX, setGlobalScatterZoomX] = useState<[number, number] | null>(null);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);

  useEffect(() => {
    setIsLoadingGlobal(true);
    // Fetch global data
    const apiFilters = { 
      ...filters, 
      ratingMin: filters.ratingMin || '0', 
      ratingMax: filters.ratingMax || '22.0' 
    };
    Promise.all([
      api.getHeatmap(apiFilters),
      api.getChartMeta(apiFilters),
      api.getLampDistribution(apiFilters),
      api.getOpYield(apiFilters),
      api.getPlayerOpDistribution(apiFilters)
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

  const getConstantLabel = (constant: number) => {
    return constant.toFixed(1);
  };

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
      constant: getConstantLabel(d.constant),
      ajRate: d.total > 0 ? ((d.ajc + d.aj) / d.total) * 100 : 0,
      fcRate: d.total > 0 ? ((d.ajc + d.aj + d.fc) / d.total) * 100 : 0,
    }));
  }, [lampData]);

  const sortedLampData = useMemo(() => {
    return lampData.map(d => ({
      ...d,
      constantLabel: getConstantLabel(d.constant)
    })).sort((a, b) => a.constant - b.constant);
  }, [lampData]);

  const sortedOpYield = useMemo(() => {
    return opYieldData.map(d => ({
      ...d,
      constantLabel: getConstantLabel(d.constant)
    })).sort((a, b) => a.constant - b.constant);
  }, [opYieldData]);

  const opDistribution = useMemo(() => {
    const BUCKET_SIZE = 5;
    const buckets: Record<string, number> = {};

    for (let b = 0; b < 100; b += BUCKET_SIZE) {
      const label = `${b}-${b + BUCKET_SIZE}%`;
      buckets[label] = 0;
    }

    playerOpData.forEach(p => {
      const percent = Math.min(99.9, Math.max(0, p.opPercent || 0));
      const b = Math.floor(percent / BUCKET_SIZE) * BUCKET_SIZE;
      const label = `${b}-${b + BUCKET_SIZE}%`;
      buckets[label] = (buckets[label] || 0) + 1;
    });

    return Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count
    }));
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
          <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Server Meta & Skill Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Universal statistics aggregated across all players and songs on the server.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-end' }}>
          <GlobalFilterBar showRating={true} />
        </div>
      </div>

      {isLoadingGlobal ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading global statistics...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Heatmap */}
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Grade Rank Heatmap by Chart Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Shows the normalized percentage of scores for each Chart Constant that fall into a specific Grade. (Brighter = Higher %)
            </p>
            
            <div style={{ display: 'inline-grid', gridTemplateColumns: `60px repeat(${constants.length}, 40px)`, gap: '2px', paddingBottom: '1rem' }}>
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
                        style={{ 
                          backgroundColor: bg, 
                          color: percent > 0.3 ? '#fff' : 'var(--text-secondary)',
                          fontSize: '0.75rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderRadius: '2px',
                          aspectRatio: '1',
                          fontWeight: percent > 0.3 ? 'bold' : 'normal'
                        }}
                        title={`${grade} @ Level ${getConstantLabel(c)}: ${(percent * 100).toFixed(1)}% (${cell?.count || 0} scores)`}
                      >
                        {percent > 0 ? (percent * 100).toFixed(0) : ''}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Column Labels */}
              <div></div>
              {constants.map(c => (
                <div key={c} style={{ padding: '4px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {getConstantLabel(c)}
                </div>
              ))}
            </div>
          </div>

          {/* Survival Rate */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>AJ & FC Survival Rate by Chart Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The exact percentage chance of a player achieving an All Justice or Full Combo plotted against the Chart Constant. Shows the difficulty cliff.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-md" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={survivalData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="constant" stroke="var(--text-secondary)" tick={{ dy: 6 }} />
                    <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(val: any) => [val.toFixed(1) + '%']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="ajRate" stroke="var(--rank-aj)" strokeWidth={3} name="All Justice Rate" dot={{ r: 3, fill: 'var(--rank-aj)' }} />
                    <Line type="monotone" dataKey="fcRate" stroke="var(--rank-fc)" strokeWidth={3} name="Full Combo Rate" dot={{ r: 3, fill: 'var(--rank-fc)' }} />
                    <Brush dataKey="constant" height={25} stroke="var(--accent-primary)" fill="rgba(0,0,0,0.4)" tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lamp Distribution Stacked Bar */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Server Lamp Distribution by Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Normalized distribution of all logged lamps across chart constants. Compare this against your personal dashboard.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-md" style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedLampData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} stackOffset="expand">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="constantLabel" stroke="var(--text-secondary)" tick={{ dy: 6 }} />
                    <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `${Math.round(val * 100)}%`} />
                    <Tooltip content={<LampTooltip />} /><Legend content={(props: any) => {
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
                    <Bar dataKey="ajc" stackId="a" fill="var(--rank-ajc)" name="All Justice Critical" activeBar={false} />
                    <Bar dataKey="aj" stackId="a" fill="var(--rank-aj)" name="All Justice" activeBar={false} />
                    <Bar dataKey="fc" stackId="a" fill="var(--rank-fc)" name="Full Combo" activeBar={false} />
                    <Bar dataKey="clear" stackId="a" fill="var(--rank-clear)" name="Clear" activeBar={false} />
                    <Bar dataKey="failed" stackId="a" fill="var(--rank-failed)" name="Failed" activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lucrative OP Levels */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Average Overpower (OP%) Yield by Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The average percentage of maximum Overpower rewarded per play grouped by Chart Constant.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-sm" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedOpYield} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="constantLabel" stroke="var(--text-secondary)" tick={{ dy: 6 }} />
                    <YAxis stroke="var(--text-secondary)" domain={[0, 100]} tickFormatter={(val) => val.toFixed(0) + '%'} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(val: any) => [val.toFixed(2) + '%', "Average OP Yield"]}
                    />
                    <Bar dataKey="avgOp" fill="var(--accent-secondary)" name="Average OP" radius={[4, 4, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Player Skill Stratification */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Player Overpower (OP) Distribution</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The bell curve of total Overpower for all players on the server.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-sm" style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={opDistribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="bucket" stroke="var(--text-secondary)" tick={{ dy: 6, fontSize: 11 }} interval={1} />
                    <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar dataKey="count" fill="var(--accent-primary)" name="Players" radius={[4, 4, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bubble Chart */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Chart Level Constant vs Average Score Scatter</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Level vs Average Score. Bubble size represents Play Count (Popularity). Identifies highly played "farm" charts vs avoided charts.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '0.2rem' }}>Filter Level:</span>
                {[
                  { label: 'All', range: null },
                  { label: '1-12+', range: [1.0, 12.9] },
                  { label: '13-13+', range: [13.0, 13.9] },
                  { label: '14-14+', range: [14.0, 14.9] },
                  { label: '15+', range: [15.0, 15.4] }
                ].map(preset => {
                  const isActive = preset.range === null ? !globalScatterZoomX : (globalScatterZoomX && globalScatterZoomX[0] === preset.range[0] && globalScatterZoomX[1] === preset.range[1]);
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setGlobalScatterZoomX(preset.range as [number, number] | null)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        background: isActive ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.08)',
                        border: '1px solid ' + (isActive ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.15)'),
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: isActive ? 'bold' : 'normal',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                {globalScatterZoomX && (
                  <button
                    onClick={() => setGlobalScatterZoomX(null)}
                    title="Reset Zoom"
                    style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                )}
              </div>
            </div>

            <div className="scrollable-content-wrapper" style={{ overflowY: 'hidden' }}>
              <div className="chart-min-width-md" style={{ height: '430px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      type="number" 
                      dataKey="constant" 
                      name="Chart Constant" 
                      stroke="var(--text-secondary)"
                      tick={{ dy: 6 }}
                      domain={globalScatterZoomX || ['dataMin', 'dataMax']}
                      label={{ value: 'Chart Constant (Level)', position: 'insideBottomRight', fill: 'var(--text-secondary)', offset: -10 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="avgScore" 
                      name="Avg Score" 
                      domain={[975000, 1010000]}
                      ticks={[975000, 990000, 1000000, 1005000, 1007500, 1009000, 1010000]}
                      stroke="var(--text-secondary)" 
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      tickFormatter={(val) => {
                        if (val === 1010000) return '1010k (AJC)';
                        if (val === 1009000) return '1009k (SSS+)';
                        if (val === 1007500) return '1007.5k (SSS)';
                        if (val === 1005000) return '1005k (SS+)';
                        if (val === 1000000) return '1000k (SS)';
                        if (val === 990000) return '990k (S+)';
                        if (val === 975000) return '975k (S)';
                        return (val / 1000).toFixed(0) + 'k';
                      }}
                      width={85}
                    />
                    <ZAxis type="number" dataKey="playCount" domain={[0, 'dataMax']} range={[20, 1200]} name="Plays" />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter name="Charts" data={metaData.filter((d: any) => d.avgScore >= 975000)} fill="#ff66ff" fillOpacity={0.6} />
                    <Brush dataKey="constant" height={25} stroke="#ff66ff" fill="rgba(0,0,0,0.4)" tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default PerformanceAnalysis;
