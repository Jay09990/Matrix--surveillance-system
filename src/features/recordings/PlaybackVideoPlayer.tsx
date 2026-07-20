import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Maximize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PlaybackVideoPlayerProps {
  streamUrl: string;

  // Where the CURRENTLY LOADED stream begins — origin for all
  // "absolute position = this + video.currentTime" math. Changes on every seek.
  streamStartMs: number;

  // Fixed bounds of the underlying recording segment — used only to scale
  // the visual seekbar/progress bar and to compute clamped seek targets.
  // Never used as a position origin (that was the bug — see PlaybackPage.tsx).
  segmentStartMs: number;
  segmentEndMs: number;

  durationSeconds: number;
  playbackSpeed: number;

  // Play/pause is now controlled by the parent (via timeline button)
  isPlaying: boolean;
  isHiFocus?: boolean;
  onPlayPause: () => void;

  onSeekToAbsolute: (absoluteMs: number) => void;
  onTimeUpdate?: (absoluteMs: number) => void;

  /** Called once when the stream is ready (canPlay) — used to clear the pending overlay */
  onStreamReady?: () => void;

  /** Called when the video segment ends naturally */
  onEnded?: () => void;
}

function formatClockTime(ms: number, isHiFocus = false) {
  if (!Number.isFinite(ms)) return '--:--:--';
  if (isHiFocus) {
    return dayjs(ms).local().format('HH:mm:ss');
  }
  return new Date(ms).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' });
}

function formatSpeed(speed: number) {
  if (speed === 0.25) return '0.25x';
  if (speed === 0.5) return '0.5x';
  return `${speed}x`;
}

export function PlaybackVideoPlayer({
  streamUrl,
  streamStartMs,
  segmentStartMs: _segmentStartMs,
  segmentEndMs,
  durationSeconds: _durationSeconds,
  playbackSpeed,
  isPlaying,
  isHiFocus = false,
  onPlayPause: _onPlayPause,
  onSeekToAbsolute: _onSeekToAbsolute,
  onTimeUpdate,
  onStreamReady,
  onEnded,
}: PlaybackVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSec, setCurrentSec] = useState(0); // seconds from stream start

  // Sync playback rate whenever prop changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Sync mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Sync play/pause from parent
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setCurrentSec(video.currentTime);
    onTimeUpdate?.(streamStartMs + video.currentTime * 1000);
  }

  function handleCanPlay() {
    setIsBuffering(false);
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
    onStreamReady?.();
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center gap-4 px-6 text-center bg-black">
        <div className="flex items-center gap-3 bg-[#e03e3e]/10 border border-[#e03e3e]/30 rounded-sm px-5 py-3">
          <AlertCircle className="w-5 h-5 text-[#e03e3e]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#e03e3e]">
            {errorMsg}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setIsBuffering(true);
            _onSeekToAbsolute(streamStartMs);
          }}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#2563eb]/10 border border-[#2a2a2a] hover:border-[#2563eb]/50 rounded-sm px-4 py-2 transition-all group"
        >
          <RefreshCw className="w-4 h-4 text-[#8d90a0] group-hover:text-[#2563eb]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] group-hover:text-white">
            Retry Stream
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-black group/player overflow-hidden"
    >
      {/* Video — key={streamUrl} on parent means this remounts on every seek */}
      <video
        ref={videoRef}
        src={streamUrl}
        autoPlay
        playsInline
        className="w-full flex-1 object-contain"
        style={{ opacity: isBuffering ? 0 : 1 }}
        onPlay={() => { /* isPlaying managed by parent */ }}
        onPause={() => { /* isPlaying managed by parent */ }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onEnded}
        onError={e => {
          const err = (e.target as HTMLVideoElement).error;
          setErrorMsg('Playback failed: ' + (err?.message ?? 'Unknown error'));
          // Clear the stream-pending overlay even on error so it doesn't block the screen
          onStreamReady?.();
        }}
      />

      {/* Speed badge */}
      {playbackSpeed !== 1 && (
        <div className="pointer-events-none absolute right-4 top-4 z-20">
          <span className="rounded-sm border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]">
            {formatSpeed(playbackSpeed)} {playbackSpeed > 1 ? 'FF' : 'SLO'}
          </span>
        </div>
      )}

      {/* Controls bar — timestamp, mute, fullscreen only */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-2
                      bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent
                      px-4 pb-3 pt-6
                      opacity-0 transition-opacity group-hover/player:opacity-100 focus-within:opacity-100">

        {/* Transport row */}
        <div className="flex items-center justify-between">
          {/* Timestamp */}
          <span className="whitespace-nowrap font-mono text-[10px] text-white/60">
            {formatClockTime(streamStartMs + currentSec * 1000, isHiFocus)}
            {' / '}
            {formatClockTime(segmentEndMs, isHiFocus)}
          </span>

          <div className="flex items-center gap-3">
            {/* Mute */}
            <button type="button" onClick={() => setIsMuted(m => !m)}
              className="flex h-7 w-7 items-center justify-center text-white transition-colors hover:text-[#2563eb]">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button type="button" onClick={toggleFullscreen}
              className="flex h-7 w-7 items-center justify-center text-white transition-colors hover:text-[#2563eb]">
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Centre play/pause overlay on click (optional UX) */}
      <button
        type="button"
        onClick={_onPlayPause}
        className="absolute inset-0 z-10 flex items-center justify-center bg-transparent"
        style={{ pointerEvents: isBuffering ? 'none' : 'auto' }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {/* Show icon briefly on click via CSS trick — always transparent unless hovered */}
        <div className="opacity-0 group-hover/player:opacity-100 transition-opacity
                        w-16 h-16 rounded-full bg-black/50 flex items-center justify-center border border-white/20">
          {isPlaying
            ? <Pause className="w-7 h-7 text-white" fill="currentColor" />
            : <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />}
        </div>
      </button>
    </div>
  );
}