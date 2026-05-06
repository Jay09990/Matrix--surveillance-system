import { useState, useMemo } from 'react';
import { Topbar } from '../components/Topbar';
import { useStations } from '../features/stations/useStations';
import { StationGrid } from '../features/stations/StationGrid';
import { Search, Loader2, AlertCircle } from 'lucide-react';

export default function StationSelectorPage() {
  const { data: stations, isLoading, isError, error } = useStations();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStations = useMemo(() => {
    if (!stations) return [];
    if (!searchQuery.trim()) return stations;
    
    const query = searchQuery.toLowerCase();
    return stations.filter(
      (station) => 
        station.name.toLowerCase().includes(query) || 
        station.location.toLowerCase().includes(query)
    );
  }, [stations, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] flex flex-col">
      <Topbar />
      
      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Stations</h1>
              <p className="text-[#8d90a0] text-sm">Select a station to access live surveillance feeds.</p>
            </div>
            
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#8d90a0]" />
              </div>
              <input
                type="text"
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131313] border border-[#2a2a2a] pl-10 pr-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[0px]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="w-full h-64 flex flex-col items-center justify-center text-[#8d90a0]">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2563eb]" />
              <p className="text-xs uppercase tracking-widest font-bold">Loading Stations</p>
            </div>
          ) : isError ? (
            <div className="w-full p-6 border border-[#93000a] bg-[#93000a]/10 text-[#ffb4ab] flex items-start gap-3 rounded-[0px]">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Failed to load stations</h3>
                <p className="text-sm">{(error as any)?.message || 'An unexpected error occurred. Please try again later.'}</p>
              </div>
            </div>
          ) : (
            <StationGrid stations={filteredStations} />
          )}
        </div>
      </main>
    </div>
  );
}
