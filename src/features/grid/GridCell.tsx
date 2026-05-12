import { useState, useEffect, useRef } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';

import type { Camera } from '../../types/camera';
import { useGridStore } from '../../store/useGridStore';
import { StreamPlayer } from '../streams/StreamPlayer';
import { Loader2, VideoOff, WifiOff, X, GripHorizontal } from 'lucide-react';
import { apiService } from '../../services/api';
import { USE_MOCKDATA } from '../../config';

import { formatDistanceToNow } from 'date-fns';

interface GridCellProps {
  index: number;
  channel: Camera | null;
}

export const GridCell = ({ index, channel }: GridCellProps) => {
  const { removeChannel, addChannel } = useGridStore();
  
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `cell-${index}`,
    data: { index },
  });

  // Auto-resolve stream if missing URL
  useEffect(() => {
    if (channel && !channel.streamUrl) {
      const resolve = async () => {
        try {
          if (USE_MOCKDATA) {
            await new Promise(r => setTimeout(r, 1000));
            addChannel({ ...channel, streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }, index);
          } else {
            const res = await apiService.streams.resolve([{ nvrId: channel.nvrId, channel: channel.channel }]);
            if (res.data?.[0]?.whepUrl) {
              addChannel({ ...channel, streamUrl: res.data[0].whepUrl }, index);
            } else {
              // If we can't resolve, mark as no-signal to stop infinite retries
              // but only if it's not currently offline
              if (channel.status !== 'offline') {
                addChannel({ ...channel, status: 'no-signal' }, index);
              }
            }
          }
        } catch (e) {
          console.error('Auto-resolve failed:', e);
        }
      };
      resolve();
    }
  }, [channel?.id, channel?.streamUrl, index, addChannel]);


  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `draggable-cell-${index}`,
    data: { ...channel, fromIndex: index },
    disabled: !channel,
  });

  const cellRef = useRef<HTMLDivElement>(null);

  // Combined ref setter
  const setRefs = (element: HTMLDivElement | null) => {
    setDropRef(element);
    setDragRef(element);
    cellRef.current = element;
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;


  useEffect(() => {
    if (channel?.streamUrl) {
      console.log(`[GridCell] Cell ${index} has streamUrl: ${channel.streamUrl}`);
    } else if (channel) {
      console.log(`[GridCell] Cell ${index} waiting for streamUrl (status: ${channel.status})`);
    }
  }, [channel?.streamUrl, channel?.status, index]);

  if (!channel) {
    return (
      <div
        ref={setRefs}
        className={`w-full h-full border ${
          isOver ? 'border-[#2563eb] bg-[#2563eb]/5' : 'border-[#1e1e1e] bg-[#131313]'
        } flex items-center justify-center transition-colors relative group`}
      >
        <div className="text-center">
          <span className="font-mono text-[#383838] text-xl block mb-2">{index + 1}</span>
          <span className="text-[10px] font-bold tracking-widest text-[#383838] uppercase">EMPTY</span>
        </div>


      </div>
    );
  }

  const isOffline = channel.status === 'offline';
  const isNoSignal = channel.status === 'no-signal';

  return (
    <div
      ref={setRefs}
      style={style}
      className={`w-full h-full border relative group ${
        isOver ? 'border-[#2563eb]' : 'border-[#1e1e1e]'
      } bg-black overflow-hidden flex items-center justify-center`}
    >
      {/* Overlay top bar */}
      <div className="absolute top-0 left-0 right-0 p-2 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {/* Drag Handle */}
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-white/10 rounded-sm text-[#383838] group-hover:text-[#8d90a0] transition-colors"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-[#2563eb] text-[10px] font-bold">CH{channel.channel.toString().padStart(2, '0')}</span>
          <span className="font-sans text-white text-xs font-semibold truncate max-w-[120px] drop-shadow-md">{channel.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-sm ${
            // If we have a stream URL, we consider it "online" for the indicator
            channel.streamUrl ? 'bg-[#16a34a]' :
            isOffline || isNoSignal ? 'bg-[#e03e3e]' :
            channel.status === 'warning' ? 'bg-[#f59e0b]' :
            'bg-[#16a34a]'
          } shadow-[0_0_8px_currentColor]`} />
          
          <button 
            onClick={() => removeChannel(index)}
            className="p-1 hover:bg-white/10 rounded-sm text-[#8d90a0] hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="Clear channel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {channel.streamUrl ? (
        <StreamPlayer streamUrl={channel.streamUrl} channel={channel} cellIndex={index} />
      ) : isOffline ? (
        <div className="flex flex-col items-center justify-center text-[#e03e3e]">
          <WifiOff className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-[10px] font-bold tracking-widest uppercase">OFFLINE</span>
          {channel.lastSeenAt && (
            <span className="text-[9px] font-mono mt-1 opacity-70">
              Last seen: {formatDistanceToNow(new Date(channel.lastSeenAt))} ago
            </span>
          )}
        </div>
      ) : isNoSignal ? (
        <div className="flex flex-col items-center justify-center text-[#e03e3e]">
          <VideoOff className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-[10px] font-bold tracking-widest uppercase">NO SIGNAL</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-[#2563eb]">
          <Loader2 className="w-8 h-8 mb-2 animate-spin" />
          <span className="text-[10px] font-bold tracking-widest uppercase">CONNECTING...</span>
        </div>
      )}
    </div>
  );
};
