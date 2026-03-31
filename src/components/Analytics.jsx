import React, { useState, useEffect } from 'react';
import { loadData, MODES } from '../utils/storage';
import { Clock, CheckCircle } from 'lucide-react';

const Analytics = () => {
  const [stats, setStats] = useState({
    todayHours: '0.0h',
    doneSessions: 0,
    totalSessionsTarget: 0
  });

  const loadStats = () => {
    const data = loadData();
    const now = new Date();
    
    let todaySessions = 0;
    let todaySeconds = 0;

    data.sessions.forEach(session => {
      const sessionDate = new Date(session.timestamp);
      const isToday = sessionDate.toDateString() === now.toDateString();
      const isPomodoro = session.mode === MODES.POMODORO;

      if (isToday) {
        todaySeconds += (session.duration || 0);
        if (isPomodoro) todaySessions += 1;
      }
    });

    const hours = (todaySeconds / 3600).toFixed(1);

    // Track completed tasks
    const tasks = data.tasks || [];
    const completedTasks = tasks.filter(t => t.completed).length;

    setStats({
      todayHours: `${hours}h`,
      doneSessions: completedTasks,
      totalSessionsTarget: tasks.length
    });
  };

  useEffect(() => {
    loadStats();
    window.addEventListener('tasks_updated', loadStats);
    // Optional: add listener for session complete to update focus hours in real time if needed
    window.addEventListener('session_completed', loadStats);

    return () => {
       window.removeEventListener('tasks_updated', loadStats);
       window.removeEventListener('session_completed', loadStats);
    };
  }, []);

  return (
    <div className="animate-fade-in">

      <div className="stat-card">
        <div className="stat-icon">
          <Clock size={20} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.todayHours}</div>
          <div className="stat-label">Focus</div>
        </div>
      </div>

      <div className="stat-card" title="Task Completion Rate">
        <div className="stat-icon" style={{ color: '#A0AEC0', backgroundColor: 'rgba(160,174,192,0.1)' }}>
          <CheckCircle size={20} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.doneSessions}/{stats.totalSessionsTarget}</div>
          <div className="stat-label">Done Tasks</div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
