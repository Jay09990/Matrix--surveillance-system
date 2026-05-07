import { useSessionStore } from '../store/useSessionStore';
import { Monitor, Settings, PlusCircle, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Topbar = () => {
  const { user, clearSession } = useSessionStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const isAdmin = user?.role?.toLowerCase() === 'admin';

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

      <div className="flex items-center gap-3">
        {isAdmin && (
          <Button
            variant="default"
            size="sm"
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[2px] h-8 px-3 text-xs font-semibold flex items-center gap-1.5"
            onClick={() => navigate('/admin/nvrs/add')}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add NVR
          </Button>
        )}

        {isAdmin && (
          <Link
            to="/admin"
            className="p-2 text-[#8d90a0] hover:text-white hover:bg-[#1e1e1e] rounded-[2px] transition-colors"
            title="System Administration"
          >
            <Settings className="w-4 h-4" />
          </Link>
        )}

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 rounded-[2px] hover:bg-[#1e1e1e] transition-colors group">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-white leading-tight">{user?.name}</span>
                <span className="text-[10px] font-mono text-[#8d90a0] uppercase tracking-wider">{user?.role}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#8d90a0] group-hover:text-white transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-[#131313] border border-[#2a2a2a] text-[#e5e2e1] shadow-xl rounded-[2px] p-1"
          >
            {/* Email — non-clickable */}
            <div className="px-3 py-2">
              <p className="text-xs text-[#8d90a0] truncate">{user?.email}</p>
              <div className="mt-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/30 px-2 py-0.5 rounded-[2px]"
                >
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-[#2a2a2a] my-1" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#e03e3e] hover:bg-[#e03e3e]/10 cursor-pointer rounded-[2px] focus:bg-[#e03e3e]/10 focus:text-[#e03e3e]"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
