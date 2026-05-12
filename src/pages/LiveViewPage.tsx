import { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';

import { Topbar } from '../components/Topbar';
import { NVRList } from '../features/nvrs/NVRList';
import { ChannelList } from '../features/cameras/ChannelList';
import { SectionLabel } from '../components/SectionLabel';
import { LayoutToggle } from '../features/grid/LayoutToggle';
import { LiveGrid } from '../features/grid/LiveGrid';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { useGridStore } from '../store/useGridStore';
import type { Camera } from '../types/camera';
import { apiService } from '../services/api';
import { USE_MOCKDATA } from '../config';

import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

import { useDetection } from '../features/nvrs/useDetection';
import { useEffect } from 'react';
// import { toast } from 'sonner';

export default function LiveViewPage() {
  const navigate = useNavigate();
  const { stationId } = useParams<{ stationId: string }>();

  const [selectedNvrId, setSelectedNvrId] = useState<string | null>(null);
  const { startDetection, stopDetection } = useDetection(selectedNvrId);

  useEffect(() => {
    if (selectedNvrId) {
      startDetection(selectedNvrId).catch((err) => {
        console.error('Failed to start detection:', err);
      });
    }

    return () => {
      if (selectedNvrId) {
        stopDetection(selectedNvrId).catch((err) => {
          console.error('Failed to stop detection:', err);
        });
      }
    };
  }, [selectedNvrId, startDetection, stopDetection]);
  const [activeDragData, setActiveDragData] = useState<Camera | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { addChannel } = useGridStore();

  if (!stationId) return <Navigate to="/stations" replace />;

  const handleDragStart = (event: any) => {
    setActiveDragData(event.active.data.current as Camera);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragData(null)

    if (!over || !active.data.current) return

    const cellIndex = over.data.current?.index
    if (cellIndex === undefined) return

    const camera = active.data.current as Camera & { fromIndex?: number }

    // If camera already has a stream — just move it, don't re-resolve
    if (camera.streamUrl) {
      addChannel(camera, cellIndex)
      return
    }

    // New camera placement — add without streamUrl first (shows loading)
    addChannel({ ...camera, streamUrl: undefined }, cellIndex)

    try {
      let streamUrl = ''

      if (USE_MOCKDATA) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      } else {
        const res = await apiService.streams.resolve([
          { nvrId: camera.nvrId, channel: camera.channel }
        ])
        streamUrl = res.data[0]?.whepUrl
      }

      if (!streamUrl) {
        addChannel({ ...camera, status: 'no-signal' }, cellIndex)
        return
      }

      addChannel({ ...camera, streamUrl }, cellIndex)
    } catch (error) {
      console.error('Failed to resolve stream:', error)
      addChannel({ ...camera, status: 'no-signal' }, cellIndex)
    }
  }

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden">
      <Topbar />

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar */}
          <div
            className={`bg-[#131313] border-r border-[#2a2a2a] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative ${isSidebarCollapsed ? 'w-0 border-none' : 'w-72'
              }`}
          >
            <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}>
              {/* Back Button */}
              <div className="p-4 border-b border-[#2a2a2a]">
                <button
                  onClick={() => navigate('/stations')}
                  className="flex items-center gap-2 text-[#8d90a0] hover:text-white transition-colors group w-full"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#2563eb]" />
                  <span className="text-xs font-bold uppercase tracking-widest">Back to Dashboard</span>
                </button>
              </div>

              <SectionLabel>NVR Devices</SectionLabel>

              <div className="h-1/3 overflow-y-auto no-scrollbar border-b border-[#2a2a2a]">
                <NVRList
                  stationId={stationId!}
                  selectedNvrId={selectedNvrId}
                  onSelectNvr={setSelectedNvrId}
                />
              </div>

              <div className="flex items-center justify-between pr-4">
                <SectionLabel>Channels</SectionLabel>
                {selectedNvrId && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#2563eb]/10 border border-[#2563eb]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
                    <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-tighter">Scanning</span>
                  </div>
                )}
              </div>
              <ChannelList nvrId={selectedNvrId} />
            </div>
            {!isSidebarCollapsed && <LayoutToggle />}

            {/* Floating Collapse/Expand Button (when open) */}
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] rounded-r-md flex items-center justify-center text-[#8d90a0] hover:text-white transition-colors z-20 shadow-lg group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Expand Button (when collapsed) */}
          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] border-l-0 rounded-r-md flex items-center justify-center text-[#8d90a0] hover:text-white transition-colors z-20 shadow-lg group"
            >
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Main Grid */}
          <div className="flex-1 min-w-0">
            <LiveGrid />
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeDragData ? (
            <div className="flex items-center px-3 py-2 bg-[#2563eb]/20 border border-[#2563eb] rounded-[2px] backdrop-blur-sm opacity-80 shadow-lg">
              <span className="font-mono text-[10px] text-white w-6 mr-1">
                {activeDragData.channel.toString().padStart(2, '0')}
              </span>
              <span className="text-sm text-white font-semibold truncate max-w-[120px]">
                {activeDragData.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

