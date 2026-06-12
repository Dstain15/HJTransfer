import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { List, PlusCircle, Truck, ArrowLeftRight, History, LogOut, ClipboardCheck, FileText, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const navItems = [
  { label: 'Transfer Log', path: '/', icon: List },
  { label: 'Submit Request', path: '/submit', icon: PlusCircle },
  { label: 'Receive Truck', path: '/receive', icon: Truck },
  { label: 'Receiving History', path: '/receiving-history', icon: ClipboardCheck },
  { label: 'Packlist', path: '/packlist', icon: FileText },
  { label: 'History', path: '/history', icon: History },
];

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F0F5FF' }}>
      <header className="no-print flex items-center flex-shrink-0 border-b" style={{ background: '#1E3A8A', borderColor: '#1D4ED8', height: 46 }}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 border-r" style={{ borderColor: 'rgba(255,255,255,0.15)', height: '100%' }}>
          <div className="flex items-center justify-center w-6 h-6 rounded" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <ArrowLeftRight size={12} className="text-white" />
          </div>
          <span className="text-xs font-bold text-white">Transfer<span style={{ color: '#93C5FD' }}>App</span></span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center h-full flex-1">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path}
                className="flex items-center gap-2 px-4 h-full text-xs font-medium transition-colors border-b-2"
                style={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  borderBottomColor: active ? '#93C5FD' : 'transparent',
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}>
                <Icon size={13} style={{ color: active ? '#93C5FD' : 'rgba(255,255,255,0.5)' }} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        {user && (
          <div className="flex items-center gap-3 px-4 border-l" style={{ borderColor: 'rgba(255,255,255,0.15)', height: '100%' }}>
            <button
              onClick={() => setDark(d => !d)}
              className="flex items-center justify-center w-6 h-6 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {dark ? <Sun size={12} /> : <Moon size={12} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: '#3B82F6', color: '#fff' }}>
                {(user.full_name || user.email || '?')[0].toUpperCase()}
              </div>
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {user.full_name || user.email}
              </span>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
              title="Sign out">
              <LogOut size={12} />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}