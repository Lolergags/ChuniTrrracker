import React, { useState, useEffect } from 'react';

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
}

export function CronBuilder({ value, onChange, disabled }: CronBuilderProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'hourly_interval'>('daily');
  const [time, setTime] = useState('12:00');
  const [dayOfWeek, setDayOfWeek] = useState('0'); 
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [hourInterval, setHourInterval] = useState('12');
  const [minute, setMinute] = useState('00');

  // Parse initial value on mount only once to avoid loops
  useEffect(() => {
    if (!value) return;
    const parts = value.split(' ');
    if (parts.length !== 5) return;
    
    const [minStr, hourStr, dom, , dow] = parts;
    if (isNaN(parseInt(minStr))) return;

    const paddedMin = minStr.padStart(2, '0');
    setMinute(paddedMin);

    if (hourStr.startsWith('*/')) {
      setFrequency('hourly_interval');
      setHourInterval(hourStr.split('/')[1] || '12');
      setTime(`00:${paddedMin}`);
    } else {
      if (isNaN(parseInt(hourStr))) return;
      const paddedHour = hourStr.padStart(2, '0');
      setTime(`${paddedHour}:${paddedMin}`);
      
      if (dom !== '*' && dom !== '?') {
        setFrequency('monthly');
        setDayOfMonth(dom);
      } else if (dow !== '*' && dow !== '?') {
        setFrequency('weekly');
        setDayOfWeek(dow);
      } else {
        setFrequency('daily');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCron = (f: string, t: string, dow: string, dom: string, hi: string, min: string) => {
    let cronStr = '';
    if (f === 'hourly_interval') {
      const m = parseInt(min || '0', 10).toString();
      cronStr = `${m} */${hi} * * *`;
    } else {
      const [hour, timeMin] = t.split(':');
      const h = parseInt(hour || '0', 10).toString();
      const m = parseInt(timeMin || '0', 10).toString();
      
      if (f === 'daily') {
        cronStr = `${m} ${h} * * *`;
      } else if (f === 'weekly') {
        cronStr = `${m} ${h} * * ${dow}`;
      } else if (f === 'monthly') {
        cronStr = `${m} ${h} ${dom} * *`;
      }
    }
    onChange(cronStr);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value as any;
    setFrequency(f);
    updateCron(f, time, dayOfWeek, dayOfMonth, hourInterval, minute);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value || '00:00';
    setTime(t);
    const m = t.split(':')[1] || '00';
    setMinute(m);
    updateCron(frequency, t, dayOfWeek, dayOfMonth, hourInterval, m);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const m = e.target.value;
    setMinute(m);
    updateCron(frequency, time, dayOfWeek, dayOfMonth, hourInterval, m);
  };

  const handleHourIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hi = e.target.value;
    setHourInterval(hi);
    updateCron(frequency, time, dayOfWeek, dayOfMonth, hi, minute);
  };

  const toggleDayOfWeek = (day: string) => {
    let days = dayOfWeek.split(',').filter(Boolean);
    if (days.includes(day)) {
      days = days.filter(d => d !== day);
    } else {
      days.push(day);
      days.sort((a, b) => parseInt(a) - parseInt(b));
    }
    
    if (days.length === 0) {
      days = ['0'];
    }
    
    const newDow = days.join(',');
    setDayOfWeek(newDow);
    updateCron(frequency, time, newDow, dayOfMonth, hourInterval, minute);
  };

  const handleDayOfMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dom = e.target.value;
    setDayOfMonth(dom);
    updateCron(frequency, time, dayOfWeek, dom, hourInterval, minute);
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <select 
        value={frequency} 
        onChange={handleFrequencyChange} 
        disabled={disabled}
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <option value="hourly_interval">Every X Hours</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>

      {frequency === 'hourly_interval' && (
        <>
          <select 
            value={hourInterval} 
            onChange={handleHourIntervalChange} 
            disabled={disabled}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {[1, 2, 3, 4, 6, 8, 12].map(h => (
              <option key={h} value={h}>{h} {h === 1 ? 'Hour' : 'Hours'}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-secondary)' }}>at minute</span>
          <input 
            type="number"
            min="0"
            max="59"
            value={minute}
            onChange={handleMinuteChange}
            disabled={disabled}
            style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </>
      )}
      
      {frequency === 'weekly' && (
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {[
            { v: '0', l: 'Sun' },
            { v: '1', l: 'Mon' },
            { v: '2', l: 'Tue' },
            { v: '3', l: 'Wed' },
            { v: '4', l: 'Thu' },
            { v: '5', l: 'Fri' },
            { v: '6', l: 'Sat' }
          ].map(d => (
            <button
              key={d.v}
              type="button"
              disabled={disabled}
              onClick={() => toggleDayOfWeek(d.v)}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: dayOfWeek.split(',').includes(d.v) ? 'var(--accent-primary)' : 'var(--border-color)',
                backgroundColor: dayOfWeek.split(',').includes(d.v) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: dayOfWeek.split(',').includes(d.v) ? 'white' : 'var(--text-primary)',
                cursor: disabled ? 'default' : 'pointer'
              }}
            >
              {d.l}
            </button>
          ))}
        </div>
      )}

      {frequency === 'monthly' && (
        <select 
          value={dayOfMonth} 
          onChange={handleDayOfMonthChange} 
          disabled={disabled}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {Array.from({length: 31}, (_, i) => i + 1).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      )}
      
      {frequency !== 'hourly_interval' && (
        <>
          <span style={{ color: 'var(--text-secondary)' }}>at</span>
          <input 
            type="time" 
            value={time} 
            onChange={handleTimeChange}
            disabled={disabled}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', colorScheme: 'dark' }}
          />
        </>
      )}
    </div>
  );
}
