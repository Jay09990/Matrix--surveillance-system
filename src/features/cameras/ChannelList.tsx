import { useChannels } from './useChannels';
import { Loader2, AlertCircle, Video, GripVertical, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Camera } from '../../types/camera';
import { useDraggable } from '@dnd-kit/core';
import { useGridStore } from '../../store/useGridStore';

interface ChannelListProps {
  nvrId: string | null;
}

export const ChannelList = ({ nvrId }: ChannelListProps) => {
  const { data: channels, isLoading, isError } = useChannels(nvrId);

  if (!nvrId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-[#8d90a0]">
        <p className="text-xs uppercase tracking-widest font-bold text-center">Select an NVR<br/>to view channels</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 p-4 text-center">
        <AlertCircle className="w-4 h-4 text-[#e03e3e] inline-block mb-2" />
        <p className="text-xs text-[#e03e3e]">Failed to load channels</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-[1px] bg-[#1e1e1e]">
      {channels?.map((cam, index) => (
        <DraggableChannelRow key={cam?.id || `empty-${index}`} channel={cam} index={index + 1} />
      ))}
    </div>
  );
};

interface DraggableChannelRowProps {
  channel: Camera | null;
  index: number;
}

const DraggableChannelRow = ({ channel, index }: DraggableChannelRowProps) => {
  const { activeChannels } = useGridStore();
  const isInUse = channel && channel.id ? activeChannels.some(c => c?.id === channel.id) : false;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: channel && channel.id ? `channel-${channel.id}` : `empty-${index}`,
    data: channel ?? {},
    disabled: !channel || !channel.id || channel.status === 'offline' || isInUse,
  });

  const isEmpty = !channel || !channel.id;
  const isOffline = channel?.status === 'offline';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between px-3 py-2 bg-[#131313] transition-colors
        ${isEmpty || isInUse ? 'opacity-50' : ''}
        ${isDragging ? 'opacity-30 border border-[#2563eb] z-10 relative' : ''}
        ${!isEmpty && !isOffline && !isInUse ? 'hover:bg-[#1e1e1e] cursor-grab active:cursor-grabbing' : ''}
        ${isOffline || isInUse ? 'cursor-not-allowed' : ''}
        ${isOffline ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center">
        {!isEmpty && !isOffline ? (
          <GripVertical className="w-3.5 h-3.5 mr-2 text-[#383838]" />
        ) : (
          <div className="w-5.5" /> // spacer
        )}
        <span className="font-mono text-[10px] text-[#8d90a0] w-6 mr-1">
          {index.toString().padStart(2, '0')}
        </span>
        
        {isEmpty ? (
          <span className="text-xs text-[#383838] font-bold uppercase tracking-wider ml-1">NO CAM</span>
        ) : (
          <div className="flex flex-col ml-1">
            <span className="text-sm text-[#e5e2e1] truncate max-w-[120px]">{channel.name}</span>
            <div className="flex items-center mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-sm mr-1.5 ${
                channel.status === 'online' ? 'bg-[#16a34a]' :
                channel.status === 'warning' ? 'bg-[#f59e0b]' :
                channel.status === 'offline' ? 'bg-[#e03e3e]' :
                'bg-[#383838]'
              }`} />
              <span className="text-[9px] font-mono text-[#8d90a0] uppercase">{channel.status || 'unknown'}</span>
              {isOffline && channel.lastSeenAt && (
                <span className="text-[8px] font-mono text-[#8d90a0]/60 ml-2">
                  ({formatDistanceToNow(new Date(channel.lastSeenAt))} ago)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {!isEmpty && (
        <div className="flex items-center gap-2">
          {isInUse && (
            <span className="text-[8px] font-bold bg-[#2563eb]/20 text-[#2563eb] px-1 py-0.5 rounded-[1px] border border-[#2563eb]/30">
              IN USE
            </span>
          )}
          <Video className={`w-3.5 h-3.5 ${channel.status === 'online' ? 'text-[#16a34a]/70' : 'text-[#8d90a0]/50'}`} />
        </div>
      )}
    </div>
  );
};
