import { useNVRs } from './useNVRs';
import { Loader2, AlertCircle, HardDrive } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';

interface NVRListProps {
  stationId: string;
  selectedNvrId: string | null;
  onSelectNvr: (nvrId: string) => void;
}

export const NVRList = ({ stationId, selectedNvrId, onSelectNvr }: NVRListProps) => {
  const { data: nvrs, isLoading, isError } = useNVRs(stationId);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-4 h-4 text-[#e03e3e] inline-block mb-2" />
        <p className="text-xs text-[#e03e3e]">Failed to load NVRs</p>
      </div>
    );
  }

  if (!nvrs || nvrs.length === 0) {
    return (
      <div className="p-4 text-center text-[#8d90a0]">
        <p className="text-xs uppercase tracking-widest font-bold">No NVRs found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[1px] bg-[#1e1e1e]">
      {nvrs.map((nvr) => (
        <button
          key={nvr.id}
          onClick={() => onSelectNvr(nvr.id)}
          className={`flex items-center justify-between p-3 text-left transition-colors ${
            selectedNvrId === nvr.id
              ? 'bg-[#2563eb]/10 border-l-2 border-[#2563eb]'
              : 'bg-[#131313] border-l-2 border-transparent hover:bg-[#1e1e1e]'
          }`}
        >
          <div className="flex items-center">
            <HardDrive className={`w-4 h-4 mr-3 ${selectedNvrId === nvr.id ? 'text-[#2563eb]' : 'text-[#8d90a0]'}`} />
            <div>
              <p className={`text-sm font-semibold ${selectedNvrId === nvr.id ? 'text-white' : 'text-[#e5e2e1]'}`}>
                {nvr.name}
              </p>
              <p className="text-[10px] text-[#8d90a0] font-mono mt-0.5">{nvr.ipAddress}</p>
            </div>
          </div>
          <StatusBadge status={nvr.status} />
        </button>
      ))}
    </div>
  );
};
