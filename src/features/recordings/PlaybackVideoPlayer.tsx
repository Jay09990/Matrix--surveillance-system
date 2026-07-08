import { useEffect, useRef, useState } from 'react';
import {
  FastForward,
  Maximize,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
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
  onPlaybackSpeedChange: (speed: number) => void;
  onSeekToAbsolute: (absoluteMs: number) => void;
  onTimeUpdate?: (absoluteMs: number) => void;
}

const MIN_SPEED = 0.25;
const MAX_SPEED = 8;

function formatClockTime(ms: number) {
  if (!Number.isFinite(ms)) return '--:--:--';
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
  segmentStartMs,
  segmentEndMs,
  durationSeconds,
  playbackSpeed,
  onPlaybackSpeedChange,
  onSeekToAbsolute,
  onTimeUpdate,
}: PlaybackVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSec, setCurrentSec] = useState(0);   // seconds from recording start
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);

  // Full duration of the underlying recording segment — this is what the
  // visual seekbar is scaled against, so its proportions stay stable across
  // seeks within the same segment (only streamStartMs moves).
  const segmentDuration = Math.max(durationSeconds, (segmentEndMs - segmentStartMs) / 1000);

  // How far into the segment the CURRENTLY LOADED stream begins. E.g. if the
  // segment starts at 13:03:00 and the user clicked 14:15:06, this is ~4326s.
  const streamOffsetSec = (streamStartMs - segmentStartMs) / 1000;

  // Sync playback rate whenever prop changes
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Sync mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Sync play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => { });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setCurrentSec(video.currentTime);
    setBuffered(video.buffered);
    // streamStartMs (not segmentStartMs) is the correct origin — this is
    // where the currently-loaded ffmpeg stream actually begins playing from.
    onTimeUpdate?.(streamStartMs + video.currentTime * 1000);
  }

  // Seekbar click — if target is in buffer, seek locally; otherwise ask parent
  // to build a new stream URL from that position (which remounts this component)
  function handleSeekbarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (segmentDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Where in the segment the user clicked, in absolute time.
    const targetAbsoluteMs = segmentStartMs + ratio * segmentDuration * 1000;
    // The same point, but relative to the currently loaded stream's own
    // timeline — this is what video.buffered / video.currentTime use.
    const targetSecInStream = (targetAbsoluteMs - streamStartMs) / 1000;

    const video = videoRef.current;
    if (video) {
      // Check if target is already buffered
      for (let i = 0; i < (video.buffered?.length ?? 0); i++) {
        if (targetSecInStream >= video.buffered.start(i) - 0.5 &&
          targetSecInStream <= video.buffered.end(i) + 0.5) {
          video.currentTime = targetSecInStream;
          return;
        }
      }
    }
    // Not buffered — build new stream from this position
    onSeekToAbsolute(targetAbsoluteMs);
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;

    const currentAbsoluteMs = streamStartMs + video.currentTime * 1000;
    const targetAbsoluteMs = Math.max(
      segmentStartMs,
      Math.min(currentAbsoluteMs + seconds * 1000, segmentEndMs),
    );
    const targetSecInStream = (targetAbsoluteMs - streamStartMs) / 1000;

    // Check buffer (buffered ranges are relative to this stream's own timeline)
    for (let i = 0; i < (video.buffered?.length ?? 0); i++) {
      if (targetSecInStream >= video.buffered.start(i) - 0.5 &&
        targetSecInStream <= video.buffered.end(i) + 0.5) {
        video.currentTime = targetSecInStream;
        return;
      }
    }
    onSeekToAbsolute(targetAbsoluteMs);
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }

  function renderBuffered() {
    if (!buffered || segmentDuration <= 0) return null;
    const segments = [];
    for (let i = 0; i < buffered.length; i++) {
      // buffered.start/end are relative to this stream's own timeline (0 at
      // streamStartMs) — offset by streamOffsetSec to place them correctly
      // on a seekbar scaled to the full segment.
      const left = ((streamOffsetSec + buffered.start(i)) / segmentDuration) * 100;
      const width = ((buffered.end(i) - buffered.start(i)) / segmentDuration) * 100;
      segments.push(
        <div key={i} className="absolute top-0 bottom-0 bg-white/30"
          style={{ left: `${left}%`, width: `${Math.max(width, 0.1)}%` }} />
      );
    }
    return segments;
  }

  const progress = segmentDuration > 0
    ? Math.min(100, Math.max(0, ((streamOffsetSec + currentSec) / segmentDuration) * 100))
    : 0;

  const canSpeedUp = playbackSpeed < MAX_SPEED;
  const canSpeedDown = playbackSpeed > MIN_SPEED;

  if (errorMsg) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e03e3e]">{errorMsg}</span>
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
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => { setIsBuffering(false); if (videoRef.current) videoRef.current.playbackRate = playbackSpeed; }}
        onTimeUpdate={handleTimeUpdate}
        onError={e => {
          const err = (e.target as HTMLVideoElement).error;
          setErrorMsg('Playback failed: ' + (err?.message ?? 'Unknown error'));
        }}
      />

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#2563eb]" />
        </div>
      )}

      {/* Speed badge */}
      {playbackSpeed !== 1 && (
        <div className="pointer-events-none absolute right-4 top-4 z-20">
          <span className="rounded-sm border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]">
            {formatSpeed(playbackSpeed)} {playbackSpeed > 1 ? 'FF' : 'SLO'}
          </span>
        </div>
      )}

      {/* Skip overlays */}
      <button type="button" onClick={() => skip(-10)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1
                   opacity-0 group-hover/player:opacity-100 transition-opacity
                   bg-black/50 hover:bg-black/75 border border-white/10 rounded-sm px-3 py-2 text-white">
        <SkipBack className="w-5 h-5 text-[#2563eb]" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">-10s</span>
      </button>

      <button type="button" onClick={() => skip(10)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1
                   opacity-0 group-hover/player:opacity-100 transition-opacity
                   bg-black/50 hover:bg-black/75 border border-white/10 rounded-sm px-3 py-2 text-white">
        <SkipForward className="w-5 h-5 text-[#2563eb]" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">+10s</span>
      </button>

      {/* Controls bar */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-2
                      bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent
                      px-4 pb-3 pt-10
                      opacity-0 transition-opacity group-hover/player:opacity-100 focus-within:opacity-100">

        {/* Seekbar */}
        <div className="group/seekbar relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/20"
          onClick={handleSeekbarClick}>
          {renderBuffered()}
          <div className="absolute inset-y-0 bg-[#2563eb] transition-colors group-hover/seekbar:bg-[#3b82f6]"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Transport row */}
        <div className="flex items-center">

          {/* Speed down */}
          <button type="button" onClick={() => onPlaybackSpeedChange(Math.max(MIN_SPEED, playbackSpeed / 2))}
            disabled={!canSpeedDown}
            className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-white/10 bg-[#1a1a1a]
                       font-mono text-[10px] font-bold text-white uppercase tracking-wider
                       transition-colors hover:border-[#2563eb] hover:text-[#2563eb]
                       disabled:opacity-30 disabled:cursor-not-allowed">
            <Rewind className="w-3.5 h-3.5" />
            {formatSpeed(Math.max(MIN_SPEED, playbackSpeed / 2))}
          </button>

          {/* Play/Pause */}
          <button type="button" onClick={() => setIsPlaying(p => !p)}
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-sm bg-[#2563eb] text-white
                       transition-colors hover:bg-[#3b82f6]">
            {isPlaying
              ? <Pause className="w-4 h-4" fill="currentColor" />
              : <Play className="w-4 h-4" fill="currentColor" />}
          </button>

          <div className="flex items-center gap-3">
            {/* Speed up */}
            <button type="button" onClick={() => onPlaybackSpeedChange(Math.min(MAX_SPEED, playbackSpeed * 2))}
              disabled={!canSpeedUp}
              className="flex items-center gap-1.5 h-8 px-3 rounded-sm border border-white/10 bg-[#1a1a1a]
                         font-mono text-[10px] font-bold text-white uppercase tracking-wider
                         transition-colors hover:border-[#2563eb] hover:text-[#2563eb]
                         disabled:opacity-30 disabled:cursor-not-allowed">
              <FastForward className="w-3.5 h-3.5" />
              {formatSpeed(Math.min(MAX_SPEED, playbackSpeed * 2))}
            </button>

            {/* Current speed */}
            <span className="w-10 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">
              {formatSpeed(playbackSpeed)}
            </span>

            {/* Timestamp */}
            <span className="hidden sm:block whitespace-nowrap font-mono text-[10px] text-white/60">
              {formatClockTime(streamStartMs + currentSec * 1000)}
              {' / '}
              {formatClockTime(segmentEndMs)}
            </span>

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
    </div>
  );
}