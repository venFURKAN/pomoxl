import React, { useState, useEffect, useRef } from 'react';
import { MODES, loadData } from '../utils/storage';
import { Play, Pause, Settings as SettingsIcon, RotateCcw, Dices, Target, Plus } from 'lucide-react';
import { playSound, initAudio } from '../utils/audio';

const Timer = ({ settings, onSessionComplete, onSettingsChange }) => {
  const [mode, setMode] = useState(MODES.POMODORO);
  const [sessions, setSessions] = useState({
    [MODES.POMODORO]: { timeLeft: settings.pomodoro * 60, startTotal: settings.pomodoro * 60, isActive: false, hasStarted: false },
    [MODES.SHORT_BREAK]: { timeLeft: settings.shortBreak * 60, startTotal: settings.shortBreak * 60, isActive: false, hasStarted: false },
    [MODES.LONG_BREAK]: { timeLeft: settings.longBreak * 60, startTotal: settings.longBreak * 60, isActive: false, hasStarted: false },
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    pomodoro: settings.pomodoro,
    shortBreak: settings.shortBreak,
    longBreak: settings.longBreak,
  });
  const [activeTaskName, setActiveTaskName] = useState('');
  // Track completed pomodoros for auto long-break
  const pomodoroCountRef = useRef(0);

  const loadActiveTask = () => {
    const data = loadData();
    if (data.activeTaskId && data.tasks) {
      const t = data.tasks.find(x => x.id === data.activeTaskId);
      setActiveTaskName(t && !t.completed ? t.text : '');
    } else {
      setActiveTaskName('');
    }
  };

  useEffect(() => {
    loadActiveTask();
    window.addEventListener('active_task_updated', loadActiveTask);
    return () => window.removeEventListener('active_task_updated', loadActiveTask);
  }, []);

  useEffect(() => {
    setTempSettings({
      pomodoro: settings.pomodoro,
      shortBreak: settings.shortBreak,
      longBreak: settings.longBreak,
    });
  }, [settings.pomodoro, settings.shortBreak, settings.longBreak]);

  useEffect(() => {
    setSessions(prev => {
      const next = { ...prev };
      // Only update timeLeft (and startTotal) for sessions that haven't been started yet
      if (!prev[MODES.POMODORO].hasStarted)
        next[MODES.POMODORO] = { ...next[MODES.POMODORO], timeLeft: settings.pomodoro * 60, startTotal: settings.pomodoro * 60 };
      else
        next[MODES.POMODORO] = { ...next[MODES.POMODORO], timeLeft: Math.min(prev[MODES.POMODORO].timeLeft, settings.pomodoro * 60) };

      if (!prev[MODES.SHORT_BREAK].hasStarted)
        next[MODES.SHORT_BREAK] = { ...next[MODES.SHORT_BREAK], timeLeft: settings.shortBreak * 60, startTotal: settings.shortBreak * 60 };
      else
        next[MODES.SHORT_BREAK] = { ...next[MODES.SHORT_BREAK], timeLeft: Math.min(prev[MODES.SHORT_BREAK].timeLeft, settings.shortBreak * 60) };

      if (!prev[MODES.LONG_BREAK].hasStarted)
        next[MODES.LONG_BREAK] = { ...next[MODES.LONG_BREAK], timeLeft: settings.longBreak * 60, startTotal: settings.longBreak * 60 };
      else
        next[MODES.LONG_BREAK] = { ...next[MODES.LONG_BREAK], timeLeft: Math.min(prev[MODES.LONG_BREAK].timeLeft, settings.longBreak * 60) };
      return next;
    });
  }, [settings.pomodoro, settings.shortBreak, settings.longBreak]);

  const currentSession = sessions[mode];
  const timeLeft = currentSession.timeLeft;
  const isActive = currentSession.isActive;
  const hasStarted = currentSession.hasStarted;

  // Title bar update
  useEffect(() => {
    const runningMode = Object.values(MODES).find(m => sessions[m].isActive) || mode;
    const runningSession = sessions[runningMode];
    const rMin = String(Math.floor(runningSession.timeLeft / 60)).padStart(2, '0');
    const rSec = String(runningSession.timeLeft % 60).padStart(2, '0');
    let titleMode = 'Focus';
    if (runningMode === MODES.SHORT_BREAK) titleMode = 'Short Break';
    if (runningMode === MODES.LONG_BREAK) titleMode = 'Long Break';

    if (settings.zenMode) {
      document.title = `Pomoxl - ${titleMode}`;
    } else if (Object.values(MODES).some(m => sessions[m].isActive)) {
      document.title = `▶ ${rMin}:${rSec} - ${titleMode}`;
    } else {
      const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const sec = String(timeLeft % 60).padStart(2, '0');
      let curTitleMode = 'Focus';
      if (mode === MODES.SHORT_BREAK) curTitleMode = 'Short Break';
      if (mode === MODES.LONG_BREAK) curTitleMode = 'Long Break';
      document.title = `${min}:${sec} - ${curTitleMode}`;
    }
    return () => { document.title = 'Pomoxl'; };
  }, [sessions, mode, settings.zenMode, timeLeft]);

  // Accent color by mode
  useEffect(() => {
    const root = document.documentElement;
    if (mode === MODES.POMODORO) root.style.setProperty('--accent-color', 'var(--pomodoro-color)');
    if (mode === MODES.SHORT_BREAK) root.style.setProperty('--accent-color', 'var(--shortBreak-color)');
    if (mode === MODES.LONG_BREAK) root.style.setProperty('--accent-color', 'var(--longBreak-color)');
  }, [mode]);

  // Main countdown + auto-transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev => {
        let stateChanged = false;
        const next = { ...prev };
        let completedMode = null;

        Object.values(MODES).forEach(m => {
          if (next[m].isActive && next[m].timeLeft > 0) {
            next[m] = { ...next[m], timeLeft: next[m].timeLeft - 1 };
            stateChanged = true;
          } else if (next[m].isActive && next[m].timeLeft === 0) {
            next[m] = { ...next[m], isActive: false, hasStarted: false };
            stateChanged = true;
            completedMode = m;
          }
        });

        if (completedMode) {
          setTimeout(() => {
            if (settings.soundEnabled ?? true) playSound(completedMode);
            if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Pomoxl', { body: `Time is up! Your ${completedMode} session has finished.` });
            }
            const duration = completedMode === MODES.POMODORO ? settings.pomodoro * 60 :
              (completedMode === MODES.SHORT_BREAK ? settings.shortBreak * 60 : settings.longBreak * 60);
            onSessionComplete(duration, completedMode);

            if (completedMode === MODES.POMODORO) {
              pomodoroCountRef.current += 1;
              const count = pomodoroCountRef.current;
              const nextMode = (count % 4 === 0) ? MODES.LONG_BREAK : MODES.SHORT_BREAK;
              const nextDuration = nextMode === MODES.LONG_BREAK ? settings.longBreak * 60 : settings.shortBreak * 60;
              setMode(nextMode);

              setSessions(s => ({
                ...s,
                [nextMode]: {
                  timeLeft: nextDuration,
                  startTotal: nextDuration,
                  isActive: !!settings.autoStartBreaks,
                  hasStarted: !!settings.autoStartBreaks
                }
              }));
            } else {
              // Break finished → go back to Pomodoro, always idle (user starts manually)
              setMode(MODES.POMODORO);
              setSessions(s => ({
                ...s,
                [MODES.POMODORO]: {
                  timeLeft: settings.pomodoro * 60,
                  startTotal: settings.pomodoro * 60,
                  isActive: false,
                  hasStarted: false
                }
              }));
            }
          }, 0);
        }

        return stateChanged ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, settings, onSessionComplete]);

  // Only one mode can run at a time
  const toggleTimer = () => {
    // Strict mode: if a pomodoro is running, cannot start a break
    if (settings.strictMode && sessions[MODES.POMODORO].isActive && mode !== MODES.POMODORO) return;

    initAudio();
    setSessions(prev => {
      const next = { ...prev };
      Object.values(MODES).forEach(m => {
        if (m !== mode && next[m].isActive) {
          next[m] = { ...next[m], isActive: false };
        }
      });
      next[mode] = {
        ...next[mode],
        isActive: !next[mode].isActive,
        hasStarted: true,
        // Lock in the startTotal at the moment the user first starts this session
        startTotal: next[mode].hasStarted ? next[mode].startTotal : next[mode].timeLeft
      };
      return next;
    });
  };

  // Reset ALL sessions to defaults
  const resetAll = () => {
    pomodoroCountRef.current = 0;
    setSessions({
      [MODES.POMODORO]: { timeLeft: settings.pomodoro * 60, startTotal: settings.pomodoro * 60, isActive: false, hasStarted: false },
      [MODES.SHORT_BREAK]: { timeLeft: settings.shortBreak * 60, startTotal: settings.shortBreak * 60, isActive: false, hasStarted: false },
      [MODES.LONG_BREAK]: { timeLeft: settings.longBreak * 60, startTotal: settings.longBreak * 60, isActive: false, hasStarted: false },
    });
  };

  // +1 minute to current timer
  const addMinute = () => {
    setSessions(prev => ({
      ...prev,
      [mode]: { ...prev[mode], timeLeft: prev[mode].timeLeft + 60 }
    }));
  };

  const handleModeChange = (newMode) => {
    // Strict mode: block switching away from POMODORO while it's running
    if (settings.strictMode && sessions[MODES.POMODORO].isActive && newMode !== MODES.POMODORO) return;
    setMode(newMode);
  };

  const handleInlineChange = (key, value) => {
    if (!/^\d{0,3}$/.test(value)) return;
    setTempSettings((prev) => ({ ...prev, [key]: value }));
    const num = Number(value);
    if (num > 0) {
      onSettingsChange({ ...settings, [key]: num });
    }
  };

  const handleRandomizeTemplate = () => {
    const anyActive = Object.values(MODES).some(m => sessions[m].isActive);
    if (anyActive) return;
    const PRESETS = [
      { pomodoro: 25, shortBreak: 5, longBreak: 15 },
      { pomodoro: 45, shortBreak: 10, longBreak: 20 },
      { pomodoro: 50, shortBreak: 10, longBreak: 25 },
      { pomodoro: 90, shortBreak: 15, longBreak: 30 },
    ];
    let preset;
    do {
      preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    } while (preset.pomodoro === settings.pomodoro && PRESETS.length > 1);
    setTempSettings({
      pomodoro: preset.pomodoro.toString(),
      shortBreak: preset.shortBreak.toString(),
      longBreak: preset.longBreak.toString()
    });
    onSettingsChange({ ...settings, pomodoro: preset.pomodoro, shortBreak: preset.shortBreak, longBreak: preset.longBreak });
  };

  const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');

  const getLabel = () => {
    if (mode === MODES.POMODORO) return 'FOCUSING';
    if (mode === MODES.SHORT_BREAK) return 'SHORT BREAK';
    return 'LONG BREAK';
  };

  const totalDuration =
    mode === MODES.POMODORO ? settings.pomodoro * 60 :
      (mode === MODES.SHORT_BREAK ? settings.shortBreak * 60 : settings.longBreak * 60);
  const startTotal = currentSession.startTotal || totalDuration;
  const progressPercent = startTotal > 0 ? (Math.min(timeLeft, startTotal) / startTotal) : 0;
  const radius = 166;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressPercent * circumference;

  // Strict mode: reset and tab-switching blocked while pomodoro runs
  const pomodoroRunning = sessions[MODES.POMODORO].isActive;
  const isResetBlocked = settings.strictMode && pomodoroRunning;
  const isTabBlocked = (newMode) => settings.strictMode && pomodoroRunning && newMode !== MODES.POMODORO;
  const isStartBlocked = settings.strictMode && isActive;

  return (
    <div className="panel animate-fade-in timer-container" style={{ position: 'relative' }}>
      <button
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          opacity: isResetBlocked ? 0 : 0.4,
          pointerEvents: isResetBlocked ? 'none' : 'auto',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          cursor: 'pointer',
          padding: 0
        }}
        onClick={resetAll}
        title="Reset All Timers"
      >
        <RotateCcw size={22} color="var(--text-muted)" />
      </button>

      <div className="nav-tabs" style={{ alignItems: 'flex-start', marginBottom: showSettings ? '32px' : '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            className={`nav-tab ${mode === MODES.POMODORO ? 'active' : ''}`}
            onClick={() => handleModeChange(MODES.POMODORO)}
            style={{ position: 'relative' }}
          >
            FOCUS
            {sessions[MODES.POMODORO].isActive && mode !== MODES.POMODORO && (
              <span className="bg-active-dot" title="Focus timer is running" />
            )}
          </button>
          {showSettings && (
            <input
              className="timer-settings-input"
              value={tempSettings.pomodoro}
              onChange={(e) => handleInlineChange('pomodoro', e.target.value)}
              title="Focus Duration (mins)"
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            className={`nav-tab ${mode === MODES.SHORT_BREAK ? 'active' : ''}`}
            onClick={() => handleModeChange(MODES.SHORT_BREAK)}
            style={{ position: 'relative', opacity: isTabBlocked(MODES.SHORT_BREAK) ? 0.4 : 1, cursor: isTabBlocked(MODES.SHORT_BREAK) ? 'not-allowed' : 'pointer' }}
          >
            SHORT
            {sessions[MODES.SHORT_BREAK].isActive && mode !== MODES.SHORT_BREAK && (
              <span className="bg-active-dot" title="Short Break timer is running" />
            )}
          </button>
          {showSettings && (
            <input
              className="timer-settings-input"
              value={tempSettings.shortBreak}
              onChange={(e) => handleInlineChange('shortBreak', e.target.value)}
              title="Short Break Duration (mins)"
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            className={`nav-tab ${mode === MODES.LONG_BREAK ? 'active' : ''}`}
            onClick={() => handleModeChange(MODES.LONG_BREAK)}
            style={{ position: 'relative', opacity: isTabBlocked(MODES.LONG_BREAK) ? 0.4 : 1, cursor: isTabBlocked(MODES.LONG_BREAK) ? 'not-allowed' : 'pointer' }}
          >
            LONG
            {sessions[MODES.LONG_BREAK].isActive && mode !== MODES.LONG_BREAK && (
              <span className="bg-active-dot" title="Long Break timer is running" />
            )}
          </button>
          {showSettings && (
            <input
              className="timer-settings-input"
              value={tempSettings.longBreak}
              onChange={(e) => handleInlineChange('longBreak', e.target.value)}
              title="Long Break Duration (mins)"
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            className={`nav-tab-icon ${showSettings ? 'active' : ''}`}
            title="Quick Settings"
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon size={18} />
          </button>
          {showSettings && (
            <button
              className="dice-btn"
              onClick={handleRandomizeTemplate}
              title="Randomize Work & Break Set"
            >
              <Dices size={24} />
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', width: '340px', height: '340px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
        <svg width="340" height="340" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', zIndex: 0 }}>
          <circle cx="170" cy="170" r={radius} stroke="var(--panel-border)" strokeWidth="6" fill="transparent" />
          <circle
            cx="170" cy="170" r={radius}
            stroke="var(--accent-color)"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        </svg>

        <div className="timer-circle" style={{ borderColor: 'transparent', zIndex: 1, margin: 0, position: 'absolute', width: '100%', height: '100%' }}>
          <div className="timer-circle-label">{getLabel()}</div>
          <div
            className="timer-text"
            style={{
              filter: settings.zenMode ? 'blur(14px)' : 'none',
              transition: 'filter 0.5s',
              opacity: settings.zenMode ? 0.6 : 1,
              userSelect: settings.zenMode ? 'none' : 'auto',
              pointerEvents: settings.zenMode ? 'none' : 'auto'
            }}
          >
            {settings.zenMode ? '88:88' : `${m}:${s}`}
          </div>
          <button
            className="btn btn-primary"
            onClick={toggleTimer}
            disabled={isStartBlocked}
            style={{
              marginTop: '32px',
              borderRadius: '100px',
              minWidth: '150px',
              backgroundColor: 'var(--accent-color)',
              boxShadow: '0 8px 24px var(--primary-transparent)',
              opacity: isStartBlocked ? 0.4 : 1,
              cursor: isStartBlocked ? 'not-allowed' : 'pointer'
            }}
          >
            {isActive ? <><Pause size={20} fill="currentColor" /> PAUSE</> : <><Play size={20} fill="currentColor" /> START</>}
          </button>

          {/* +1 min button — only visible when active */}
          {isActive && (
            <button
              onClick={addMinute}
              title="Add 1 minute"
              style={{
                marginTop: '12px',
                background: 'transparent',
                border: '1px solid var(--panel-border)',
                borderRadius: '100px',
                padding: '6px 18px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={14} /> 1 min
            </button>
          )}
        </div>
      </div>

      {/* Pomodoro counter */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            title={`Pomodoro ${i}`}
            style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: (pomodoroCountRef.current % 4) >= i ? 'var(--accent-color)' : 'var(--panel-border)',
              transition: 'background 0.4s'
            }}
          />
        ))}
      </div>

      {activeTaskName && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Working On
          </span>
          <div style={{
            opacity: 0.9, display: 'flex', alignItems: 'center', fontSize: '1rem',
            color: 'var(--text-strong)', fontWeight: 800,
            background: 'var(--panel-border)', padding: '10px 24px', borderRadius: '100px'
          }}>
            {activeTaskName}
          </div>
        </div>
      )}
    </div>
  );
};

export default Timer;
