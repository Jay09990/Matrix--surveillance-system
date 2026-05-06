import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
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
import { api } from '../lib/axios';
import { USE_MOCKDATA } from '../config';

export default function LiveViewPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const [selectedNvrId, setSelectedNvrId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<Camera | null>(null);
  const { addChannel } = useGridStore();

  if (!stationId) return <Navigate to="/stations" replace />;

  const handleDragStart = (event: any) => {
    setActiveDragData(event.active.data.current as Camera);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);

    if (over && active.data.current) {
      const cellIndex = over.data.current?.index;
      if (cellIndex !== undefined) {
        const camera = active.data.current as Camera;
        
        // Temporarily add channel without stream to show LOADING state
        addChannel({ ...camera, streamUrl: undefined }, cellIndex);
        
        try {
          let streamUrl = '';
          if (USE_MOCKDATA) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Return a public HLS test stream for demonstration
            streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
          } else {
            // Resolve stream URL
            const res = await api.post(`/streams/resolve`, [
              { nvrId: camera.nvrId, channel: camera.channel }
            ]);
            streamUrl = res.data[0].whepUrl;
          }
          
          // Update channel with stream URL
          addChannel({ ...camera, streamUrl }, cellIndex);
        } catch (error) {
          console.error('Failed to resolve stream:', error);
          // Set to NO SIGNAL if failed
          addChannel({ ...camera, status: 'no-signal' }, cellIndex);
        }
      }
    }
  };

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden">
      <Topbar />
      
      <DndContext 
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-72 bg-[#131313] border-r border-[#2a2a2a] flex flex-col shrink-0">
            <div className="flex-1 flex flex-col overflow-hidden">
              <SectionLabel>NVR Devices</SectionLabel>
              <div className="h-1/3 overflow-y-auto no-scrollbar border-b border-[#2a2a2a]">
                <NVRList 
                  stationId={stationId!} 
                  selectedNvrId={selectedNvrId} 
                  onSelectNvr={setSelectedNvrId} 
                />
              </div>
              
              <SectionLabel>Channels (32)</SectionLabel>
              <ChannelList nvrId={selectedNvrId} />
            </div>
            <LayoutToggle />
          </div>

          {/* Main Grid */}
          <LiveGrid />
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
