import React, { useState } from 'react';
import { loadData, saveData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { Clock, Settings as SettingsIcon, Play, Grid, Bell, Flame, RefreshCcw, Shield, EyeOff, BellRing, Target, Pencil, Trash2, Upload, User as UserIcon } from 'lucide-react';


const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f1f3f5'/%3E%3Cpath d='M16 8C13.7909 8 12 9.79086 12 12C12 14.2091 13.7909 16 16 16C18.2091 16 20 14.2091 20 12C20 9.79086 18.2091 8 16 8ZM10 12C10 8.68629 12.6863 6 16 6C19.3137 6 22 8.68629 22 12C22 15.3137 19.3137 18 16 18C12.6863 18 10 15.3137 10 12ZM7 24C7 21.2386 9.23858 19 12 19H20C22.7614 19 25 21.2386 25 24V26H7V24Z' fill='%23adb5bd'/%3E%3C/svg%3E";

const Settings = ({ settings, user, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);
  const [autoStartPomo, setAutoStartPomo] = useState(false);
  const [soundNotifs, setSoundNotifs] = useState(true);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);

  const updateSetting = (key, value) => {
    const n = { ...localSettings, [key]: value };
    setLocalSettings(n);
    onSave({
      ...n,
      pomodoro: Number(n.pomodoro),
      shortBreak: Number(n.shortBreak),
      longBreak: Number(n.longBreak)
    });
  };

  const handleIntervalChange = (key, value) => {
    if (!/^\d{0,3}$/.test(value)) return;
    updateSetting(key, value);
  };

  const toggleSetting = (key) => {
    if (key === 'pushNotifications' && !localSettings[key] && 'Notification' in window) {
      Notification.requestPermission();
    }
    updateSetting(key, !localSettings[key]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Base64 storage
        alert('File is too large! Please choose an image smaller than 1MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSetting('avatarUrl', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFilePicker = () => {
    setShowPhotoMenu(false);
    document.getElementById('avatar-upload').click();
  };

  const handleRemoveAvatar = () => {
    setShowPhotoMenu(false);
    updateSetting('avatarUrl', DEFAULT_AVATAR);
  };

  return (
    <div>
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Personalize your focus environment</p>
      </div>

      <div className="settings-page">
        {/* Left Column - Profile */}
        <div>
          <div className="profile-card">
            <input 
              type="file" 
              id="avatar-upload" 
              accept="image/*" 
              onChange={handleFileChange} 
              onClick={(e) => (e.target.value = null)}
              style={{ display: 'none' }} 
            />
            <div className="profile-img-container" style={{ cursor: 'default', position: 'relative' }}>
              <img src={localSettings.avatarUrl || DEFAULT_AVATAR} alt="Profile" className="profile-img" />
              
              {/* Pencil Action Button */}
              <div 
                onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                title="Edit Photo"
                style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Pencil size={14} />
              </div>

              {/* Photo Options Menu */}
              {showPhotoMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: '-40px', marginTop: '8px',
                  background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
                  borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  padding: '8px', zIndex: 10, width: '160px', overflow: 'hidden'
                }} className="animate-fade-in">
                  <button 
                    onClick={triggerFilePicker}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'transparent', borderRadius: '10px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                    className="dropdown-item-hover"
                  >
                    <Upload size={14} /> Upload 
                  </button>
                  <button 
                    onClick={handleRemoveAvatar}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: 'none', background: 'transparent', borderRadius: '10px', color: '#F56565', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                    className="dropdown-item-hover"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              )}
            </div>

            <h2 className="profile-name">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User'}
            </h2>
            <p className="profile-bio">Deep Focus Enthusiast</p>

            <div className="profile-input-group">
              <label className="profile-input-label">Full Name</label>
              <input readOnly className="profile-input" value={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User'} />
            </div>

            <div className="profile-input-group">
              <label className="profile-input-label">Email Address</label>
              <input readOnly className="profile-input" value={user?.email || 'guest@focus.com'} />
            </div>
          </div>

        </div>

        {/* Right Column - Controls */}
        <div>
          <h3 className="settings-section-title"><Clock size={16} /> Timer Intervals</h3>
          <div className="intervals-grid">
            <div className="interval-box">
              <div className="interval-box-header">
                <Clock size={14} /> Pomodoro
              </div>
              <div className="interval-box-value">
                <input
                  type="text"
                  className="interval-box-input"
                  value={localSettings.pomodoro}
                  onChange={e => handleIntervalChange('pomodoro', e.target.value)}
                />
                <span className="interval-box-unit">MINS</span>
              </div>
            </div>

            <div className="interval-box">
              <div className="interval-box-header">
                <span>☕</span> Short Break
              </div>
              <div className="interval-box-value">
                <input
                  type="text"
                  className="interval-box-input"
                  value={localSettings.shortBreak}
                  onChange={e => handleIntervalChange('shortBreak', e.target.value)}
                />
                <span className="interval-box-unit">MINS</span>
              </div>
            </div>

            <div className="interval-box">
              <div className="interval-box-header">
                <span>🛌</span> Long Break
              </div>
              <div className="interval-box-value">
                <input
                  type="text"
                  className="interval-box-input"
                  value={localSettings.longBreak}
                  onChange={e => handleIntervalChange('longBreak', e.target.value)}
                />
                <span className="interval-box-unit">MINS</span>
              </div>
            </div>
          </div>

          <h3 className="settings-section-title"><SettingsIcon size={16} /> Smart Behaviors</h3>
          <div className="smart-behaviors">

            <div className="behavior-row">
              <div className="behavior-icon"><Play size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Auto-start Breaks</div>
                <div className="behavior-desc">Automatically begin the rest period</div>
              </div>
              <div className={`toggle-switch ${autoStartBreaks ? 'active' : ''}`} onClick={() => setAutoStartBreaks(!autoStartBreaks)}>
                <div className="toggle-switch-knob"></div>
              </div>
            </div>

            <div className="behavior-row">
              <div className="behavior-icon"><Grid size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Auto-start Pomodoros</div>
                <div className="behavior-desc">Start next block without manual input</div>
              </div>
              <div className={`toggle-switch ${autoStartPomo ? 'active' : ''}`} onClick={() => setAutoStartPomo(!autoStartPomo)}>
                <div className="toggle-switch-knob"></div>
              </div>
            </div>

            <div className="behavior-row">
              <div className="behavior-icon"><Bell size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Sound Notifications</div>
                <div className="behavior-desc">Play a chime when timer finishes</div>
              </div>
              <div className={`toggle-switch ${soundNotifs ? 'active' : ''}`} onClick={() => setSoundNotifs(!soundNotifs)}>
                <div className="toggle-switch-knob"></div>
              </div>
            </div>

          </div>

          <h3 className="settings-section-title" style={{ marginTop: '24px' }}><SettingsIcon size={16} /> Advanced Settings</h3>
          <div className="smart-behaviors">

            <div className="behavior-row">
              <div className="behavior-icon"><Shield size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Strict Mode</div>
                <div className="behavior-desc">Disables pause to enforce deep work</div>
              </div>
              <div className={`toggle-switch ${localSettings.strictMode ? 'active' : ''}`} onClick={() => toggleSetting('strictMode')}>
                <div className="toggle-switch-knob"></div>
              </div>
            </div>

            <div className="behavior-row">
              <div className="behavior-icon"><EyeOff size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Zen Mode</div>
                <div className="behavior-desc">Hides the countdown timer digits</div>
              </div>
              <div className={`toggle-switch ${localSettings.zenMode ? 'active' : ''}`} onClick={() => toggleSetting('zenMode')}>
                <div className="toggle-switch-knob"></div>
              </div>
            </div>

            <div className="behavior-row">
              <div className="behavior-icon"><BellRing size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Push Notifications</div>
                <div className="behavior-desc">Sends browser alerts in background</div>
              </div>
              <div className={`toggle-switch ${localSettings.pushNotifications ? 'active' : ''}`} onClick={() => toggleSetting('pushNotifications')}>
                <div className="toggle-switch-knob"></div>
              </div>
            </div>

            <div className="behavior-row" style={{ borderBottom: 'none' }}>
              <div className="behavior-icon"><Target size={20} /></div>
              <div className="behavior-content">
                <div className="behavior-title">Daily Goal (Hours)</div>
                <div className="behavior-desc">Your daily deep focus target</div>
              </div>
              <div>
                <input type="number"
                  className="interval-box-input"
                  title="Daily Target Hours"
                  style={{ width: '60px', fontSize: '1.2rem', padding: '4px', background: 'transparent', textAlign: 'center', borderBottom: '2px solid rgba(0,0,0,0.1)' }}
                  value={localSettings.dailyGoal ?? 4}
                  onChange={(e) => updateSetting('dailyGoal', Number(e.target.value))}
                />
              </div>
            </div>

          </div>


        </div>
      </div>
    </div>
  );
};

export default Settings;
