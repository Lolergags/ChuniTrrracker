import React, { useState, useEffect } from 'react';

interface CronBuilderProps {
  value: string;
  onChange: (cron: string) => void;
  disabled?: boolean;
}

export function CronBuilder({ value, onChange, disabled }: CronBuilderProps) {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [time, setTime] = useState('12:00');
  const [dayOfWeek, setDayOfWeek] = useState('0'); 
  const [dayOfMonth, setDayOfMonth] = useState('1');

  // Parse initial value on mount only once to avoid loops
  useEffect(() => {
    if (!value) return;
    const parts = value.split(' ');
    if (parts.length !== 5) return;
    
    const [min, hour, dom, , dow] = parts;
    if (isNaN(parseInt(min)) || isNaN(parseInt(hour))) return;

    const paddedHour = hour.padStart(2, '0');
    const paddedMin = min.padStart(2, '0');
    
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run on mount only to prevent resetting user interaction midway

  const updateCron = (f: string, t: string, dow: string, dom: string) => {
    const [hour, min] = t.split(':');
    const h = parseInt(hour || '0', 10).toString();
    const m = parseInt(min || '0', 10).toString();
    
    let cronStr = '';
    if (f === 'daily') {
      cronStr = `${m} ${h} * * *`;
    } else if (f === 'weekly') {
      cronStr = `${m} ${h} * * ${dow}`;
    } else if (f === 'monthly') {
      cronStr = `${m} ${h} ${dom} * *`;
    }
    onChange(cronStr);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const f = e.target.value as 'daily' | 'weekly' | 'monthly';
    setFrequency(f);
    updateCron(f, time, dayOfWeek, dayOfMonth);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value || '00:00';
    setTime(t);
    updateCron(frequency, t, dayOfWeek, dayOfMonth);
  };

  const handleDayOfWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dow = e.target.value;
    setDayOfWeek(dow);
    updateCron(frequency, time, dow, dayOfMonth);
  };

  const handleDayOfMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dom = e.target.value;
    setDayOfMonth(dom);
    updateCron(frequency, time, dayOfWeek, dom);
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <select 
        value={frequency} 
        onChange={handleFrequencyChange} 
        disabled={disabled}
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      
      {frequency === 'weekly' && (
        <select 
          value={dayOfWeek} 
          onChange={handleDayOfWeekChange} 
          disabled={disabled}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        </select>
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
      
      <span style={{ color: 'var(--text-secondary)' }}>at</span>
      
      <input 
        type="time" 
        value={time} 
        onChange={handleTimeChange}
        disabled={disabled}
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', colorScheme: 'dark' }}
      />
    </div>
  );
}
