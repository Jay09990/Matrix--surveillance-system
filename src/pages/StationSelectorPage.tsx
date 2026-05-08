import { Topbar } from '../components/Topbar';
import { StationTable } from '../features/stations/StationTable';

export default function StationSelectorPage() {
  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] flex flex-col">
      <Topbar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Stations & NVRs</h1>
            <p className="text-[#8d90a0] text-sm">Monitor and manage all NVR devices across your surveillance network.</p>
          </div>

          <StationTable />
        </div>
      </main>
    </div>
  );
}
