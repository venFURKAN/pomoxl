import React, { useState, useEffect } from 'react';
import { loadData, MODES } from '../utils/storage';
import { Target, Clock, Activity, Calendar, CheckSquare, Zap } from 'lucide-react';

const StatsView = () => {
  const [sessionHistory, setSessionHistory] = useState([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [statsSummary, setStatsSummary] = useState({ todayMin: 0, weekMin: 0, completedTasks: 0 });
  const [selectedDayIdx, setSelectedDayIdx] = useState(6); // default: today (last in array)

  const loadStats = () => {
    const data = loadData();
    const allSessions = data.sessions || [];
    setSessionHistory([...allSessions].reverse());

    let secs = 0;
    let poms = 0;
    allSessions.forEach(s => {
      secs += s.duration || 0;
      if (s.mode === MODES.POMODORO) poms += 1;
    });
    setTotalSeconds(secs);
    setPomodorosCompleted(poms);

    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    let weekFocusSecs = 0;
    let todayFocusSecs = 0;
    const todayStr = new Date().toDateString();

    const chart = last7.map(date => {
      const dateString = date.toDateString();
      const daySeconds = allSessions
        .filter(s => s.mode === MODES.POMODORO && new Date(s.timestamp).toDateString() === dateString)
        .reduce((acc, curr) => acc + (curr.duration || 0), 0);
      weekFocusSecs += daySeconds;
      if (dateString === todayStr) todayFocusSecs = daySeconds;
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dateString,
        minutes: Math.round(daySeconds / 60)
      };
    });
    setChartData(chart);

    const tasks = data.tasks || [];
    const completedTasks = tasks.filter(t => t.completed).length;
    setStatsSummary({
      todayMin: Math.round(todayFocusSecs / 60),
      weekMin: Math.round(weekFocusSecs / 60),
      completedTasks
    });
  };

  useEffect(() => {
    loadStats();
    window.addEventListener('session_completed', loadStats);
    window.addEventListener('tasks_updated', loadStats);
    return () => {
      window.removeEventListener('session_completed', loadStats);
      window.removeEventListener('tasks_updated', loadStats);
    };
  }, []);

  // Format seconds → "1h 30m" or "45m"
  const formatSecs = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Format minutes → "1h 30m" or "45m"
  const formatMins = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Format minutes for bar label (same)
  const formatBarLabel = (mins) => {
    if (mins === 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const maxChartValue = Math.max(...chartData.map(d => d.minutes), 60);

  // Sessions filtered by selected day
  const selectedDateStr = chartData[selectedDayIdx]?.dateString;
  const filteredHistory = sessionHistory.filter(session => {
    if (!selectedDateStr) return true;
    return new Date(session.timestamp).toDateString() === selectedDateStr;
  });

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <Zap size={16} color="#F6AD55" /> Today's Focus
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-strong)', marginTop: '8px' }}>
            {formatMins(statsSummary.todayMin)}
          </div>
        </div>

        <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <Calendar size={16} color="var(--primary)" /> This Week
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-strong)', marginTop: '8px' }}>
            {formatMins(statsSummary.weekMin)}
          </div>
        </div>

        <div className="panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <CheckSquare size={16} color="#4A90E2" /> Completed Tasks
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-strong)', marginTop: '8px' }}>
            {statsSummary.completedTasks}
          </div>
        </div>
      </div>

      {/* Bar Chart — click a bar to filter session history */}
      <div className="panel" style={{ padding: '32px' }}>
        <h2 className="panel-title" style={{ marginBottom: '8px' }}><Activity size={20} /> Focus Analysis (Last 7 Days)</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '32px', fontWeight: 600 }}>
          Click a day to filter session history below.
        </p>

        <div style={{ display: 'flex', height: '220px', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', paddingBottom: '16px', borderBottom: '2px solid var(--panel-border)' }}>
          {chartData.map((data, idx) => {
            const heightPercent = maxChartValue > 0 ? (data.minutes / maxChartValue) * 100 : 0;
            const isToday = idx === chartData.length - 1;
            const isSelected = idx === selectedDayIdx;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDayIdx(idx)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '12px', height: '100%', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
                  {data.minutes > 0 && (
                    <span style={{
                      position: 'absolute', bottom: `${heightPercent}%`, marginBottom: '8px',
                      fontSize: '0.7rem', fontWeight: 800,
                      color: isSelected ? 'var(--accent-color)' : isToday ? 'var(--primary)' : 'var(--text-muted)'
                    }}>
                      {formatBarLabel(data.minutes)}
                    </span>
                  )}
                  <div style={{
                    width: 'min(100%, 45px)',
                    height: `${heightPercent || 3}%`,
                    background: isSelected
                      ? 'var(--accent-color)'
                      : isToday
                        ? 'var(--primary)'
                        : 'var(--primary-transparent)',
                    borderRadius: '12px 12px 0 0',
                    transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s',
                    boxShadow: isSelected ? '0px -4px 20px var(--primary-transparent)' : 'none',
                    outline: isSelected ? '2px solid var(--accent-color)' : 'none',
                    outlineOffset: '2px'
                  }} />
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 800 : isToday ? 800 : 600,
                  color: isSelected ? 'var(--accent-color)' : isToday ? 'var(--text-strong)' : 'var(--text-muted)'
                }}>
                  {data.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Small Detail Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="panel" style={{ padding: '24px' }}>
          <div className="interval-box-header" style={{ marginBottom: '12px', fontSize: '0.75rem' }}><Clock size={16} /> All-Time Focus</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-strong)' }}>
            {formatSecs(totalSeconds)}
          </div>
        </div>
        <div className="panel" style={{ padding: '24px' }}>
          <div className="interval-box-header" style={{ marginBottom: '12px', fontSize: '0.75rem' }}><Target size={16} /> Completed Pomodoros</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-strong)' }}>
            {pomodorosCompleted} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>sessions</span>
          </div>
        </div>
      </div>

      {/* Session History — filtered by selected day */}
      <div className="panel" style={{ padding: '32px' }}>
        <h3 className="panel-title" style={{ marginBottom: '8px' }}><Clock size={20} /> Session History</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px', fontWeight: 600 }}>
          {selectedDateStr
            ? `Showing sessions for: ${new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
            : 'All sessions'
          }
        </p>

        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>
            No sessions on this day.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '12px' }}>
            {filteredHistory.slice(0, 50).map((session, idx) => {
              const date = new Date(session.timestamp);
              const isPomo = session.mode === MODES.POMODORO;
              const isShort = session.mode === MODES.SHORT_BREAK;
              const durSecs = session.duration || 0;
              const durH = Math.floor(durSecs / 3600);
              const durM = Math.floor((durSecs % 3600) / 60);
              const durLabel = durH > 0 ? `${durH}h ${durM}m` : `${durM} min`;

              return (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px', background: 'var(--bg-color)', borderRadius: '16px',
                  border: `1px solid ${isPomo ? 'var(--pomodoro-color)' : (isShort ? 'var(--shortBreak-color)' : 'var(--longBreak-color)')}`,
                  borderLeftWidth: '6px'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-strong)' }}>
                      {isPomo ? 'Focus Session' : (isShort ? 'Short Break' : 'Long Break')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {date.toLocaleDateString('en-US')} • {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--text-strong)', fontSize: '1.2rem' }}>
                    {durLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default StatsView;
