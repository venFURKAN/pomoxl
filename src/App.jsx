import React, { useState, useEffect } from 'react';
import Timer from './components/Timer';
import Analytics from './components/Analytics';
import Tasks from './components/Tasks';
import Settings from './components/Settings';
import StatsView from './components/StatsView';
import AuthModal from './components/AuthModal';
import { loadData, addSession, saveData } from './utils/storage';
import { supabase } from './utils/supabase';
import { pullFromCloud, scheduleSync } from './utils/sync';
import { Moon, Sun, Bell, Settings as SettingsIcon, Clock, BarChart2, CloudOff, Cloud, LogOut, LogIn } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('timer'); 
  const [settings, setSettings] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleTabSwitch = (newTab) => {
    setActiveTab(newTab);
  };

  useEffect(() => {
    const data = loadData();
    setSettings(data.settings);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        syncOnLogin(session.user);
      }
    });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) syncOnLogin(u);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncOnLogin = async (u) => {
    setSyncing(true);
    try {
      const cloudData = await pullFromCloud();
      if (cloudData) {
        setSettings(cloudData.settings);
        window.dispatchEvent(new Event('tasks_updated'));
        window.dispatchEvent(new Event('session_completed'));
      }
    } finally {
      setSyncing(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleSessionComplete = (duration, mode) => {
    addSession(duration, mode);
    window.dispatchEvent(new Event('session_completed'));
    if (user) scheduleSync();
  };

  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    const data = loadData();
    data.settings = newSettings;
    saveData(data);
    if (user) scheduleSync();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!settings) return null;

  return (
    <>
      <header className="header">
        <div className="logo cursor-pointer" onClick={() => handleTabSwitch('timer')} style={{ cursor: 'pointer' }}>
          PomoFocus
        </div>

        <div className="header-nav">
          <button 
            className={`header-nav-btn ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('timer')}
          >
            <Clock size={18} /> TIMER
          </button>
          <button 
            className={`header-nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('stats')}
          >
            <BarChart2 size={18} /> STATS
          </button>
        </div>

        <div className="header-actions">
           <button className="header-actions-btn" onClick={toggleTheme} title="Toggle Theme">
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
           </button>
           <button className="header-actions-btn">
             <Bell size={18} />
           </button>

           <button 
             className={`header-actions-btn ${activeTab === 'settings_page' ? 'active-settings' : ''}`}
             onClick={() => handleTabSwitch('settings_page')}
           >
             <SettingsIcon size={18} color={activeTab === 'settings_page' ? 'white' : 'currentColor'} />
           </button>

           {/* Cloud sync indicator */}
           {user ? (
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
               <div
                 title={syncing ? 'Syncing…' : `Synced · ${user.email}`}
                 style={{
                   display: 'flex', alignItems: 'center', gap: '6px',
                   padding: '6px 12px', borderRadius: '20px',
                   background: 'var(--primary-transparent)',
                   color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700,
                   cursor: 'default'
                 }}
               >
                 <Cloud size={14} style={{ animation: syncing ? 'pulse 1s infinite' : 'none' }} />
                 {syncing ? 'Syncing…' : 'Synced'}
               </div>
               <button
                 className="header-actions-btn"
                 onClick={handleSignOut}
                 title="Sign out"
               >
                 <LogOut size={18} />
               </button>
             </div>
           ) : (
             <button
               className="header-actions-btn"
               onClick={() => setShowAuthModal(true)}
               title="Sign in to sync"
               style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: 'var(--primary-transparent)', color: 'var(--primary)' }}
             >
               <LogIn size={14} /> Sign In
             </button>
           )}

           <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
             <img 
               src={settings.avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f1f3f5'/%3E%3Cpath d='M16 8C13.7909 8 12 9.79086 12 12C12 14.2091 13.7909 16 16 16C18.2091 16 20 14.2091 20 12C20 9.79086 18.2091 8 16 8ZM10 12C10 8.68629 12.6863 6 16 6C19.3137 6 22 8.68629 22 12C22 15.3137 19.3137 18 16 18C12.6863 18 10 15.3137 10 12ZM7 24C7 21.2386 9.23858 19 12 19H20C22.7614 19 25 21.2386 25 24V26H7V24Z' fill='%23adb5bd'/%3E%3C/svg%3E"} 
               alt="Profile"
               className="profile-avatar-trigger"
               onClick={() => setShowProfileMenu(!showProfileMenu)}
               style={{ 
                 width: '32px', height: '32px', borderRadius: '50%', 
                 objectFit: 'cover',
                 cursor: 'pointer', border: showProfileMenu ? '2px solid var(--primary)' : '2px solid transparent',
                 transition: 'all 0.2s',
                 flexShrink: 0
               }} 
             />
             
             {showProfileMenu && (
               <div className="profile-dropdown animate-fade-in" style={{ cursor: 'pointer' }} onClick={() => { handleTabSwitch('settings_page'); setShowProfileMenu(false); }}>
                 <div className="dropdown-header">
                   <div className="dropdown-user-info">
                     <span className="dropdown-name">{user?.user_metadata?.full_name || 'Pomo User'}</span>
                     <span className="dropdown-email">{user ? user.email : 'Guest Mode'}</span>
                   </div>
                 </div>
                 
                 <div className="dropdown-divider" />
                 
                 <button className="dropdown-item" onClick={() => { handleTabSwitch('settings_page'); setShowProfileMenu(false); }}>
                   <SettingsIcon size={16} /> Settings
                 </button>
                 
                 {user ? (
                   <button className="dropdown-item logout" onClick={() => { handleSignOut(); setShowProfileMenu(false); }}>
                     <LogOut size={16} /> Sign Out
                   </button>
                 ) : (
                   <button className="dropdown-item login" onClick={() => { setShowAuthModal(true); setShowProfileMenu(false); }}>
                     <LogIn size={16} /> Sign In
                   </button>
                 )}
               </div>
             )}
           </div>
        </div>
      </header>
      
      <div style={{ display: activeTab === 'settings_page' ? 'block' : 'none' }}>
        <Settings 
          settings={settings} 
          user={user}
          onSave={handleSettingsChange}
        />
      </div>

      <div className="main-layout" style={{ display: activeTab !== 'settings_page' ? undefined : 'none' }}>
        <div style={{ width: '100%', maxWidth: '250px', marginTop: '24px' }}>
           <Analytics />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', width: '100%' }}>
            <div style={{ display: activeTab === 'timer' ? 'flex' : 'none', justifyContent: 'center', width: '100%' }}>
              <Timer 
                settings={settings} 
                onSessionComplete={handleSessionComplete} 
                onSettingsChange={handleSettingsChange}
                style={{ marginTop: '24px' }}
              />
            </div>
            <div style={{ display: activeTab === 'stats' ? 'block' : 'none', width: '100%' }}>
              <StatsView />
            </div>
        </div>

        <div style={{ width: '100%', maxWidth: '380px' }}>
           <Tasks onTaskChange={() => { if (user) scheduleSync(); }} />
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(u) => {
            setUser(u);
            setShowAuthModal(false);
          }}
        />
      )}
    </>
  );
}

export default App;
