import type { Station } from '../../types/station';
import { StatusBadge } from '../../components/StatusBadge';
import { MapPin, HardDrive, Video } from 'lucide-react';

interface StationCardProps {
  station: Station;
  onClick: (stationId: string) => void;
}

export const StationCard = ({ station, onClick }: StationCardProps) => {
  return (
    <button
      onClick={() => onClick(station.id)}
      className="w-full text-left bg-[#131313] border border-[#2a2a2a] p-5 rounded-[0px] hover:border-[#2563eb] transition-all group focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg group-hover:text-[#b4c5ff] transition-colors">
            {station.name}
          </h3>
          <div className="flex items-center text-[#8d90a0] text-xs mt-1 font-mono">
            <MapPin className="w-3 h-3 mr-1" />
            {station.location}
          </div>
        </div>
        <StatusBadge status={station.status} />
      </div>
      
      <div className="flex gap-4 pt-4 border-t border-[#1e1e1e]">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#8d90a0] uppercase tracking-wider font-bold mb-1">NVRs</span>
          <div className="flex items-center text-white text-sm font-mono">
            <HardDrive className="w-3.5 h-3.5 mr-1.5 text-[#2563eb]" />
            {station.nvrCount ?? 0}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-[#8d90a0] uppercase tracking-wider font-bold mb-1">Cameras</span>
          <div className="flex items-center text-white text-sm font-mono">
            <Video className="w-3.5 h-3.5 mr-1.5 text-[#2563eb]" />
            {station.cameraCount ?? 0}
          </div>
        </div>
      </div>
    </button>
  );
};
