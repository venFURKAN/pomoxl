import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Mail, Lock, LogIn, UserPlus, X, Loader, User } from 'lucide-react';

const AuthModal = ({ onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess(data.user);
        onClose();
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        if (error) throw error;

        // If identities is empty, the email already exists and enumeration protection is on
        if (data?.user && data.user.identities?.length === 0) {
          throw new Error('This email is already registered. Please sign in instead.');
        }

        setSuccess('Account created! You can now log in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="panel animate-fade-in" style={{
        width: '100%', maxWidth: '420px',
        padding: '40px', position: 'relative'
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px var(--primary-transparent)'
          }}>
            <span style={{ fontSize: '28px' }}>🍅</span>
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-strong)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {mode === 'login'
              ? 'Sign in to sync your progress across devices'
              : 'Save your stats to the cloud — free forever'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '14px 14px 14px 40px',
                background: 'var(--bg-color)', border: '1.5px solid var(--panel-border)',
                borderRadius: '12px', color: 'var(--text-strong)', fontSize: '0.95rem',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--panel-border)'}
            />
          </div>

          {mode === 'signup' && (
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={{
                  width: '100%', padding: '14px 14px 14px 40px',
                  background: 'var(--bg-color)', border: '1.5px solid var(--panel-border)',
                  borderRadius: '12px', color: 'var(--text-strong)', fontSize: '0.95rem',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--panel-border)'}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '14px 14px 14px 40px',
                background: 'var(--bg-color)', border: '1.5px solid var(--panel-border)',
                borderRadius: '12px', color: 'var(--text-strong)', fontSize: '0.95rem',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--panel-border)'}
            />
          </div>

          {mode === 'signup' && (
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%', padding: '14px 14px 14px 40px',
                  background: 'var(--bg-color)', border: '1.5px solid var(--panel-border)',
                  borderRadius: '12px', color: 'var(--text-strong)', fontSize: '0.95rem',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--panel-border)'}
              />
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(245,101,101,0.1)', border: '1px solid #F56565', borderRadius: '10px', padding: '10px 14px', color: '#F56565', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(72,187,120,0.1)', border: '1px solid #48BB78', borderRadius: '10px', padding: '10px 14px', color: '#48BB78', fontSize: '0.85rem' }}>
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ padding: '16px', fontSize: '1rem', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Please wait...</>
              : mode === 'login'
                ? <><LogIn size={18} /> Sign In</>
                : <><UserPlus size={18} /> Create Account</>
            }
          </button>
        </form>

        {/* Toggle mode */}
        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>

        {/* Privacy note */}
        <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.7 }}>
          🔒 Your data is encrypted and only accessible by you.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthModal;
