import React, { useRef, useState, useEffect, type MouseEvent as ReactMouseEvent, useMemo } from 'react';
import { Play } from 'lucide-react';
import type { PlaybackRecording } from '../../types/playback';

function getRecordingEndTime(recording: PlaybackRecording) {
  if (recording.endTime) return recording.endTime;
  if (recording.durationSeconds) {
    return new Date(new Date(recording.startTime).getTime() + recording.durationSeconds * 1000).toISOString();
  }
  return null;
}

interface PlaybackTimelineProps {
  dateStr: string; // YYYY-MM-DD
  recordings: PlaybackRecording[];
  currentAbsoluteMs?: number | null;
  onSeek: (absoluteMs: number) => void;
  className?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 1000;
const SECONDS_PER_DAY = 86400;

export function PlaybackTimeline({ dateStr, recordings, currentAbsoluteMs, onSeek, className }: PlaybackTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);
  const [hoverAbsoluteMs, setHoverAbsoluteMs] = useState<number | null>(null);

  // Handle zoom with mouse wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = container.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      
      const scrollOffsetBefore = container.scrollLeft;
      const timeAtPointerBefore = (scrollOffsetBefore + pointerX) / zoom;
      
      const zoomDelta = e.deltaY > 0 ? 0.8 : 1.25;
      const newZoom = Math.min(Math.max(zoom * zoomDelta, MIN_ZOOM), MAX_ZOOM);
      
      setZoom(newZoom);
      
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = (timeAtPointerBefore * newZoom) - pointerX;
        }
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom]);

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    setIsDragging(false);
    if (!dragged && containerRef.current && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / contentRef.current.clientWidth;
      
      const dayStart = new Date(dateStr);
      dayStart.setHours(0, 0, 0, 0);
      const absoluteMs = dayStart.getTime() + percentage * SECONDS_PER_DAY * 1000;
      onSeek(absoluteMs);
    }
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const hoverX = e.clientX - rect.left;
      const percentage = hoverX / contentRef.current.clientWidth;
      const dayStart = new Date(dateStr);
      dayStart.setHours(0, 0, 0, 0);
      setHoverAbsoluteMs(dayStart.getTime() + percentage * SECONDS_PER_DAY * 1000);
    }

    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    setDragged(true);
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; 
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverAbsoluteMs(null);
  };

  const ticks = useMemo(() => {
    const t = [];
    const numHours = 24;
    for (let i = 0; i <= numHours; i++) {
      t.push({ type: 'hour', percent: (i / 24) * 100, label: `${i.toString().padStart(2, '0')}:00` });
      if (zoom > 5 && i < 24) {
        t.push({ type: 'half', percent: ((i + 0.5) / 24) * 100, label: zoom > 15 ? `${i.toString().padStart(2, '0')}:30` : '' });
      }
      if (zoom > 15 && i < 24) {
        t.push({ type: 'quarter', percent: ((i + 0.25) / 24) * 100, label: '' });
        t.push({ type: 'quarter', percent: ((i + 0.75) / 24) * 100, label: '' });
      }
      if (zoom > 40 && i < 24) {
        for(let m = 1; m < 60; m++) {
          if (m !== 15 && m !== 30 && m !== 45) {
            t.push({ type: 'minute', percent: ((i + m/60) / 24) * 100, label: zoom > 100 && m % 5 === 0 ? `${m}m` : '' });
          }
        }
      }
    }
    return t;
  }, [zoom]);

  let currentPipePercent = null;
  if (currentAbsoluteMs) {
    const d = new Date(currentAbsoluteMs);
    const msSinceStartOfDay = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();
    currentPipePercent = (msSinceStartOfDay / (SECONDS_PER_DAY * 1000)) * 100;
  }

  let hoverPipePercent = null;
  if (hoverAbsoluteMs) {
    const d = new Date(hoverAbsoluteMs);
    const msSinceStartOfDay = d.getHours() * 3600000 + d.getMinutes() * 60000 + d.getSeconds() * 1000 + d.getMilliseconds();
    hoverPipePercent = (msSinceStartOfDay / (SECONDS_PER_DAY * 1000)) * 100;
  }

  const formatTime = (ms: number) => {
    const d = new Date(ms);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className={`w-full overflow-hidden bg-[#0a0a0a] border-t border-[#1e1e1e] select-none flex flex-col ${className}`}>
      <div className="px-4 py-1.5 flex items-center justify-between border-b border-[#1e1e1e] bg-[#131313]">
        <span className="text-[10px] font-bold text-[#8d90a0] uppercase tracking-widest">Playback Timeline</span>
        <span className="text-[9px] font-mono text-[#4a4a4a] uppercase">Scroll to zoom • Drag to pan</span>
      </div>
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Start Button */}
        <div className="flex items-center justify-center px-4 border-r border-[#1e1e1e] bg-[#0d0d0d]">
          <button 
            onClick={() => {
              if (recordings && recordings.length > 0) {
                // Find the absolute earliest recording of the day
                const firstRec = recordings.reduce((earliest, current) => {
                   return new Date(current.startTime) < new Date(earliest.startTime) ? current : earliest;
                });
                onSeek(new Date(firstRec.startTime).getTime());
              } else {
                 // Fallback: beginning of the selected day
                 const dayStart = new Date(dateStr);
                 dayStart.setHours(0, 0, 0, 0);
                 onSeek(dayStart.getTime());
              }
            }}
            className="w-10 h-10 rounded-full bg-[#2563eb] flex items-center justify-center hover:bg-[#1d4ed8] transition-colors shadow-[0_0_10px_rgba(37,99,235,0.4)]"
            title="Start from beginning"
          >
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </button>
        </div>

        <div 
          ref={containerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
        <div 
          ref={contentRef}
          className="h-full relative transition-none"
          style={{ width: `${zoom * 100}%` }}
        >
          {/* Ticks Container */}
          <div className="absolute inset-x-0 top-0 h-6 border-b border-[#1e1e1e] pointer-events-none">
            {ticks.map((tick, i) => (
              <div 
                key={i} 
                className="absolute top-0 h-full"
                style={{ left: `${tick.percent}%` }}
              >
                <div className={`absolute top-0 left-0 w-px bg-[#3a3a3a] -translate-x-1/2 ${tick.type === 'hour' ? 'h-3' : tick.type === 'half' ? 'h-2' : 'h-1'}`} />
                {tick.label && (
                  <span 
                    className="absolute top-3 text-[9px] font-mono text-[#8d90a0] mt-0.5 leading-none bg-[#0a0a0a] px-0.5 z-10 whitespace-nowrap"
                    style={{
                      transform: tick.percent === 0 ? 'translateX(0)' : tick.percent >= 99.9 ? 'translateX(-100%)' : 'translateX(-50%)'
                    }}
                  >
                    {tick.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Timeline Track */}
          <div className="absolute inset-x-0 top-8 bottom-3 bg-[#131313] rounded-sm pointer-events-none mx-0.5 border border-[#1e1e1e]">
            {recordings?.map((recording, index) => {
              const endTime = getRecordingEndTime(recording);
              if (!endTime) return null;

              const start = new Date(recording.startTime);
              const end = new Date(endTime);
              const startSeconds = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
              const endSeconds = end.getHours() * 3600 + end.getMinutes() * 60 + end.getSeconds();
              
              const left = (startSeconds / SECONDS_PER_DAY) * 100;
              const width = ((endSeconds - startSeconds) / SECONDS_PER_DAY) * 100;

              return (
                <div
                  key={`${recording.nvrId}-${recording.channel}-${recording.startTime}-${index}`}
                  className="absolute top-0 h-full bg-[#2563eb]/60 border-x border-[#2563eb]/80 shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                  style={{ left: `${left}%`, width: `${Math.max(width, 0.05)}%` }}
                />
              );
            })}
          </div>

          {/* Active Playhead */}
          {currentPipePercent !== null && (
            <div
              className="absolute top-8 bottom-3 w-0.5 bg-red-500 z-30 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none mx-0.5"
              style={{ left: `${currentPipePercent}%` }}
            />
          )}

          {/* Hover Playhead */}
          {hoverPipePercent !== null && (
            <div
              className="absolute top-0 bottom-3 w-px bg-white/50 z-20 pointer-events-none flex flex-col items-center mx-0.5"
              style={{ left: `${hoverPipePercent}%`, transform: 'translateX(-50%)' }}
            >
              <div className="px-1.5 py-0.5 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[2px] text-white text-[9px] font-mono whitespace-nowrap shadow-md">
                {formatTime(hoverAbsoluteMs!)}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
