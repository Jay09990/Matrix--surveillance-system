import type { Station } from '../../types/station';
import { StationCard } from './StationCard';
import { useNavigate } from 'react-router-dom';

interface StationGridProps {
  stations: Station[];
}

export const StationGrid = ({ stations }: StationGridProps) => {
  const navigate = useNavigate();

  const handleStationClick = (stationId: string) => {
    navigate(`/live/${stationId}`);
  };

  if (stations.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-[#8d90a0]">
        <div className="w-16 h-16 border border-[#2a2a2a] rounded-[0px] flex items-center justify-center mb-4">
          <span className="font-mono text-xl text-[#383838]">00</span>
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest text-[#8d90a0]">No stations found</p>
        <p className="text-xs mt-1">Try adjusting your search filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {stations.map((station) => (
        <StationCard key={station.id} station={station} onClick={handleStationClick} />
      ))}
    </div>
  );
};
