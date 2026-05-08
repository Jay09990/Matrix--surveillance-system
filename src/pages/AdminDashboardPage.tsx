import { Topbar } from '../components/Topbar';
import { Link, useNavigate } from 'react-router-dom';
import { HardDrive, ChevronRight, ArrowLeft } from 'lucide-react';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] flex flex-col">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/stations')}
            className="flex items-center gap-2 text-[#8d90a0] hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold uppercase tracking-wider">Back to Dashboard</span>
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Administration</h1>
            <p className="text-[#8d90a0] text-sm">Manage system resources and hardware.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              to="/admin/nvrs/add"
              className="bg-[#131313] border border-[#2a2a2a] p-6 flex flex-col items-start transition-all hover:border-[#2563eb] hover:bg-[#1a1a1a] group"
            >
              <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[2px] mb-4 group-hover:border-[#2563eb]/30 group-hover:bg-[#2563eb]/10">
                <HardDrive className="w-6 h-6 text-[#2563eb]" />
              </div>
              <h2 className="text-lg font-bold text-[#e5e2e1] mb-2 flex items-center justify-between w-full">
                Add NVR
                <ChevronRight className="w-5 h-5 text-[#8d90a0] group-hover:text-[#2563eb] transition-colors" />
              </h2>
              <p className="text-sm text-[#8d90a0]">Register a new Network Video Recorder and create its station in one step.</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
