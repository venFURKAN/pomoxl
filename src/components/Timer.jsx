import React, { useState, useEffect } from 'react';
import { MODES, loadData } from '../utils/storage';
import { Play, Pause, Settings as SettingsIcon, RotateCcw, Dices, Target } from 'lucide-react';

const Timer = ({ settings, onSessionComplete, onSettingsChange }) => {
  const [mode, setMode] = useState(MODES.POMODORO);
  
  const [sessions, setSessions] = useState({
    [MODES.POMODORO]: { timeLeft: settings.pomodoro * 60, isActive: false, hasStarted: false },
    [MODES.SHORT_BREAK]: { timeLeft: settings.shortBreak * 60, isActive: false, hasStarted: false },
    [MODES.LONG_BREAK]: { timeLeft: settings.longBreak * 60, isActive: false, hasStarted: false },
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const [tempSettings, setTempSettings] = useState({
    pomodoro: settings.pomodoro,
    shortBreak: settings.shortBreak,
    longBreak: settings.longBreak,
  });

  const [activeTaskName, setActiveTaskName] = useState('');

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

  // Sync temp settings if settings change externally
  useEffect(() => {
    setTempSettings({
      pomodoro: settings.pomodoro,
      shortBreak: settings.shortBreak,
      longBreak: settings.longBreak,
    });
  }, [settings.pomodoro, settings.shortBreak, settings.longBreak]);

  // Update unstarted timers or clamp started timers when settings change
  useEffect(() => {
    setSessions(prev => {
      const next = { ...prev };
      if (!prev[MODES.POMODORO].hasStarted) next[MODES.POMODORO] = { ...next[MODES.POMODORO], timeLeft: settings.pomodoro * 60 };
      else next[MODES.POMODORO] = { ...next[MODES.POMODORO], timeLeft: Math.min(prev[MODES.POMODORO].timeLeft, settings.pomodoro * 60) };

      if (!prev[MODES.SHORT_BREAK].hasStarted) next[MODES.SHORT_BREAK] = { ...next[MODES.SHORT_BREAK], timeLeft: settings.shortBreak * 60 };
      else next[MODES.SHORT_BREAK] = { ...next[MODES.SHORT_BREAK], timeLeft: Math.min(prev[MODES.SHORT_BREAK].timeLeft, settings.shortBreak * 60) };

      if (!prev[MODES.LONG_BREAK].hasStarted) next[MODES.LONG_BREAK] = { ...next[MODES.LONG_BREAK], timeLeft: settings.longBreak * 60 };
      else next[MODES.LONG_BREAK] = { ...next[MODES.LONG_BREAK], timeLeft: Math.min(prev[MODES.LONG_BREAK].timeLeft, settings.longBreak * 60) };
      return next;
    });
  }, [settings.pomodoro, settings.shortBreak, settings.longBreak]);

  const currentSession = sessions[mode];
  const timeLeft = currentSession.timeLeft;
  const isActive = currentSession.isActive;
  const hasStarted = currentSession.hasStarted;

  useEffect(() => {
    // Find the actively running session (if any), regardless of current view
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
      // A timer is running — show its countdown
      document.title = `▶ ${rMin}:${rSec} - ${titleMode}`;
    } else {
      // Nothing running — show current view's time
      const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const sec = String(timeLeft % 60).padStart(2, '0');
      let curTitleMode = 'Focus';
      if (mode === MODES.SHORT_BREAK) curTitleMode = 'Short Break';
      if (mode === MODES.LONG_BREAK) curTitleMode = 'Long Break';
      document.title = `${min}:${sec} - ${curTitleMode}`;
    }
    return () => { document.title = 'Pomoxl'; };
  }, [sessions, mode, settings.zenMode, timeLeft]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === MODES.POMODORO) root.style.setProperty('--accent-color', 'var(--pomodoro-color)');
    if (mode === MODES.SHORT_BREAK) root.style.setProperty('--accent-color', 'var(--shortBreak-color)');
    if (mode === MODES.LONG_BREAK) root.style.setProperty('--accent-color', 'var(--longBreak-color)');
  }, [mode]);

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
            if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Pomoxl', { body: `Time is up! Your ${completedMode} session has finished.` });
            }
            const duration = completedMode === MODES.POMODORO ? settings.pomodoro * 60 : 
                            (completedMode === MODES.SHORT_BREAK ? settings.shortBreak * 60 : settings.longBreak * 60);
            onSessionComplete(duration, completedMode);
            
            if (completedMode === mode) {
               setMode(completedMode === MODES.POMODORO ? MODES.SHORT_BREAK : MODES.POMODORO);
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
    setSessions(prev => {
      const next = { ...prev };
      // Pause all other active sessions
      Object.values(MODES).forEach(m => {
        if (m !== mode && next[m].isActive) {
          next[m] = { ...next[m], isActive: false };
        }
      });
      // Toggle current
      next[mode] = {
        ...next[mode],
        isActive: !next[mode].isActive,
        hasStarted: true
      };
      return next;
    });
  };

  // Reset ALL sessions to defaults
  const resetAll = () => {
    setSessions({
      [MODES.POMODORO]: { timeLeft: settings.pomodoro * 60, isActive: false, hasStarted: false },
      [MODES.SHORT_BREAK]: { timeLeft: settings.shortBreak * 60, isActive: false, hasStarted: false },
      [MODES.LONG_BREAK]: { timeLeft: settings.longBreak * 60, isActive: false, hasStarted: false },
    });
  };


  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleInlineChange = (key, value) => {
    if (!/^\d{0,3}$/.test(value)) return;
    setTempSettings((prev) => ({ ...prev, [key]: value }));
    const num = Number(value);
    if (num > 0) {
      onSettingsChange({
        ...settings,
        [key]: num
      });
    }
  };

  const handleRandomizeTemplate = () => {
    // Don't randomize if any session is actively running
    const anyActive = Object.values(MODES).some(m => sessions[m].isActive);
    if (anyActive) return;

    const PRESETS = [
      { pomodoro: 25, shortBreak: 5, longBreak: 15 },
      { pomodoro: 45, shortBreak: 10, longBreak: 20 },
      { pomodoro: 50, shortBreak: 10, longBreak: 25 },
      { pomodoro: 90, shortBreak: 15, longBreak: 30 },
    ];
    let preset;
    // Pick different than current if possible
    do {
      preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    } while (preset.pomodoro === settings.pomodoro && PRESETS.length > 1);

    setTempSettings({
      pomodoro: preset.pomodoro.toString(),
      shortBreak: preset.shortBreak.toString(),
      longBreak: preset.longBreak.toString()
    });

    onSettingsChange({
      ...settings,
      pomodoro: preset.pomodoro,
      shortBreak: preset.shortBreak,
      longBreak: preset.longBreak
    });
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

  const progressPercent = totalDuration > 0 ? (Math.min(timeLeft, totalDuration) / totalDuration) : 0;
  
  // Circle dimensions
  const radius = 166; 
  const circumference = 2 * Math.PI * radius; 
  const strokeDashoffset = circumference - progressPercent * circumference;

  return (
    <div className="panel animate-fade-in timer-container" style={{ position: 'relative' }}>
      {/* Top right reset button, explicitly 0 border, transparent, no outline */}
      <button 
        style={{ 
          position: 'absolute', 
          top: '24px', 
          right: '24px', 
          opacity: (settings.strictMode && isActive) ? 0 : 0.4, 
          pointerEvents: (settings.strictMode && isActive) ? 'none' : 'auto',
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
            style={{ position: 'relative' }}
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
            style={{ position: 'relative' }}
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
              title="Randomize Work &amp; Break Set"
            >
               <Dices size={24} />
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', width: '340px', height: '340px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
        <svg 
          width="340" 
          height="340" 
          style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', zIndex: 0 }}
        >
          {/* Background ring */}
          <circle 
            cx="170" cy="170" r={radius} 
            stroke="var(--panel-border)" 
            strokeWidth="6" 
            fill="transparent" 
          />
          {/* Active progress arc */}
          <circle 
            cx="170" cy="170" r={radius} 
            stroke="var(--accent-color)" 
            strokeWidth="6" 
            fill="transparent" 
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ 
               transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
            }}
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
            disabled={settings.strictMode && isActive}
            style={{ 
              marginTop: '32px', 
              borderRadius: '100px', 
              minWidth: '150px',
              backgroundColor: 'var(--accent-color)',
              boxShadow: '0 8px 24px var(--primary-transparent)',
              opacity: (settings.strictMode && isActive) ? 0.4 : 1,
              cursor: (settings.strictMode && isActive) ? 'not-allowed' : 'pointer'
            }}
          >
            {isActive ? <><Pause size={20} fill="currentColor" /> PAUSE</> : <><Play size={20} fill="currentColor" /> START</>}
          </button>
        </div>
      </div>

      {activeTaskName && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.7rem', 
            fontWeight: 800, 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            marginBottom: '8px' 
          }}>
            Working On
          </span>
          <div style={{ 
            opacity: 0.9, 
            display: 'flex', 
            alignItems: 'center', 
            fontSize: '1rem', 
            color: 'var(--text-strong)', 
            fontWeight: 800,
            background: 'var(--panel-border)',
            padding: '10px 24px',
            borderRadius: '100px'
          }}>
            {activeTaskName}
          </div>
        </div>
      )}

    </div>
  );
};

export default Timer;
