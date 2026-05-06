import { Topbar } from '../components/Topbar';
import { AddNVRForm } from '../features/nvrs/AddNVRForm';
import { HardDrive, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AddNVRPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] flex flex-col">
      <Topbar />
      
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-[#8d90a0] hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold uppercase tracking-wider">Back to Admin</span>
          </button>
          <div className="flex items-center mb-8 pb-4 border-b border-[#2a2a2a]">
            <div className="p-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[2px] mr-4">
              <HardDrive className="w-6 h-6 text-[#2563eb]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Add NVR Device</h1>
              <p className="text-[#8d90a0] text-sm">Register a new Network Video Recorder to a station.</p>
            </div>
          </div>
          
          <div className="bg-[#131313] border border-[#2a2a2a] p-6 lg:p-8 rounded-[0px]">
            <AddNVRForm />
          </div>
        </div>
      </main>
    </div>
  );
}
