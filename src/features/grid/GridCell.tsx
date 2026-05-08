import { useState, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { Camera } from '../../types/camera';
import { useGridStore } from '../../store/useGridStore';
import { StreamPlayer } from '../streams/StreamPlayer';
import { Loader2, VideoOff, WifiOff, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GridCellProps {
  index: number;
  channel: Camera | null;
}

export const GridCell = ({ index, channel }: GridCellProps) => {
  const { removeChannel } = useGridStore();
  const { isOver, setNodeRef } = useDroppable({
    id: `cell-${index}`,
    data: { index },
  });

  const [isInView, setIsInView] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // Use IntersectionObserver to pause/destroy streams off-screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (cellRef.current) {
      observer.observe(cellRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Sync ref with droppable and cellRef
  const setRefs = (element: HTMLDivElement | null) => {
    setNodeRef(element);
    cellRef.current = element;
  };

  if (!channel) {
    return (
      <div
        ref={setRefs}
        className={`w-full h-full min-h-[150px] border ${
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
      className={`w-full h-full min-h-[150px] border relative group ${
        isOver ? 'border-[#2563eb]' : 'border-[#1e1e1e]'
      } bg-black overflow-hidden flex items-center justify-center`}
    >
      {/* Overlay top bar */}
      <div className="absolute top-0 left-0 right-0 p-2 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#2563eb] text-[10px] font-bold">CH{channel.channel.toString().padStart(2, '0')}</span>
          <span className="font-sans text-white text-xs font-semibold truncate max-w-[150px] drop-shadow-md">{channel.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-sm ${
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

      {isOffline ? (
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
      ) : isInView && channel.streamUrl ? (
        <StreamPlayer streamUrl={channel.streamUrl} channel={channel} cellIndex={index} />
      ) : isInView && !channel.streamUrl ? (
        <div className="flex flex-col items-center justify-center text-[#2563eb]">
          <Loader2 className="w-8 h-8 mb-2 animate-spin" />
          <span className="text-[10px] font-bold tracking-widest uppercase">CONNECTING...</span>
        </div>
      ) : null}
    </div>
  );
};
