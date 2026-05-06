import { useSessionStore } from '../store/useSessionStore';
import { LogOut, Monitor, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const Topbar = () => {
  const { user, clearSession } = useSessionStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="h-14 border-b border-[#2a2a2a] bg-[#131313] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-6">
        <Link to="/stations" className="flex items-center gap-2 text-white hover:text-[#b4c5ff] transition-colors">
          <Monitor className="w-5 h-5 text-[#2563eb]" />
          <span className="font-bold tracking-tighter text-lg">MATRIX</span>
        </Link>
        <div className="h-4 w-px bg-[#2a2a2a]" />
        <span className="text-[#8d90a0] font-mono text-xs tracking-widest uppercase">
          VMS Portal
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-4">
          <span className="text-sm font-semibold text-white">{user?.name}</span>
          <span className="text-[10px] font-mono text-[#8d90a0] uppercase tracking-wider">{user?.role}</span>
        </div>
        
        {user?.role === 'admin' && (
          <Link 
            to="/admin"
            className="p-2 text-[#8d90a0] hover:text-white hover:bg-[#1e1e1e] rounded-[2px] transition-colors"
            title="System Administration"
          >
            <Settings className="w-4 h-4" />
          </Link>
        )}
        
        <button
          onClick={handleLogout}
          className="p-2 text-[#8d90a0] hover:text-[#e03e3e] hover:bg-[#e03e3e]/10 rounded-[2px] transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
