/** HLS recording playback with full-window seeking and frontend transport controls. */
import Hls from 'hls.js';
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

interface PlaybackHlsPlayerProps {
  hlsUrl: string;

  /**
   * Absolute, IMMUTABLE start/end of the recording being played (ms epoch).
   * This is the anchor for the seekbar — it must NOT change when the
   * underlying HLS session is re-resolved after a seek.
   */
  recordingStartMs: number;
  recordingEndMs: number;

  /**
   * Absolute start/end of the CURRENT streaming session (ms epoch).
   * Shifts on every seek-triggered backend re-resolve.
   */
  sessionStartMs: number;
  sessionEndMs: number;

  /** Called with an ABSOLUTE epoch ms timestamp the user wants to jump to. */
  onSeekToAbsolute: (absoluteMs: number) => void;

  /** True while the backend is resolving a seek — shows freeze frame + spinner. */
  isResolving?: boolean;

  /** Emits the current absolute playback time (epoch ms) on every timeupdate. */
  onTimeUpdate?: (absoluteMs: number) => void;

  /**
   * Controlled playback speed from the parent.
   * Parent holds this in state so it survives seeks (which remount HLS).
   */
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;

  className?: string;
}

// Speed is always multiplied/divided by 2, clamped to [0.25, 8]
const MIN_SPEED = 0.25;
const MAX_SPEED = 8;

function formatClockTime(ms: number) {
  if (!Number.isFinite(ms)) return '--:--:--';
  return new Date(ms).toLocaleTimeString('en-GB', { hour12: false });
}

function formatSpeed(speed: number): string {
  // Show clean fractions for sub-1x, integers for 1x and above
  if (speed === 0.25) return '0.25×';
  if (speed === 0.5) return '0.5×';
  return `${speed}×`;
}

export function PlaybackHlsPlayer({
  hlsUrl,
  recordingStartMs,
  recordingEndMs,
  sessionStartMs,
  sessionEndMs,
  onSeekToAbsolute,
  isResolving,
  onTimeUpdate,
  playbackSpeed,
  onPlaybackSpeedChange,
  className,
}: PlaybackHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Ref keeps speed accessible inside async HLS callbacks without stale closure issues
  const playbackSpeedRef = useRef(playbackSpeed);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0); // seconds, relative to sessionStartMs
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  const recordingDurationSeconds = Math.max(0, (recordingEndMs - recordingStartMs) / 1000);
  const sessionDurationSeconds = Math.max(0, (sessionEndMs - sessionStartMs) / 1000);
  const sessionOffsetIntoRecording = Math.max(0, (sessionStartMs - recordingStartMs) / 1000);

  // ── Freeze frame on seek start ────────────────────────────────────────────
  useEffect(() => {
    if (isResolving) {
      setIsBuffering(true);
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    }
  }, [isResolving]);

  // ── Sync controlled speed to video immediately whenever prop changes ──────
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // ── HLS initialisation — reruns only when hlsUrl changes (new session) ────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    setErrorMsg(null);
    setCurrentTime(0);
    setIsBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdateEvent = () => {
      const absoluteMs = sessionStartMs + video.currentTime * 1000;
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(absoluteMs);
    };
    const onProgress = () => setBuffered(video.buffered);
    const onVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdateEvent);
    video.addEventListener('progress', onProgress);
    video.addEventListener('volumechange', onVolumeChange);

    // Restore preferences before the new stream starts
    video.muted = isMuted;
    video.playbackRate = playbackSpeedRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg('Network error loading recording stream');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg('Media decode error');
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg(`HLS error: ${data.details}`);
              hls.destroy();
          }
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        // Re-apply speed after manifest load — hls.js resets playbackRate on attach
        video.playbackRate = playbackSpeedRef.current;
        if (isPlaying) {
          video.play().catch(err => {
            setErrorMsg('Playback failed: ' + err.message);
          });
        }
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        video.playbackRate = playbackSpeedRef.current;
        if (isPlaying) {
          video.play().catch(err => setErrorMsg('Playback failed: ' + err.message));
        }
      });
      video.addEventListener('error', () => {
        setErrorMsg(`Failed to load recording (code ${video.error?.code})`);
      });
    } else {
      setErrorMsg('HLS playback is not supported in this browser.');
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdateEvent);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('volumechange', onVolumeChange);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      // Don't clear video.src — avoids black flash before canvas captures
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsUrl]);

  // ── Seek logic (unchanged from before) ───────────────────────────────────
  function seekToRecordingOffset(targetRecordingOffsetSeconds: number) {
    const video = videoRef.current;
    if (!video) return;

    const clamped = Math.max(0, Math.min(targetRecordingOffsetSeconds, recordingDurationSeconds));
    const targetSessionOffset = clamped - sessionOffsetIntoRecording;

    let isInBuffer = false;
    if (buffered && targetSessionOffset >= 0 && targetSessionOffset <= sessionDurationSeconds) {
      for (let i = 0; i < buffered.length; i++) {
        if (targetSessionOffset >= buffered.start(i) && targetSessionOffset <= buffered.end(i)) {
          isInBuffer = true;
          break;
        }
      }
    }

    if (isInBuffer) {
      video.currentTime = targetSessionOffset;
    } else {
      onSeekToAbsolute(recordingStartMs + clamped * 1000);
    }
  }

  function skip(seconds: number) {
    const currentRecordingOffset = sessionOffsetIntoRecording + currentTime;
    seekToRecordingOffset(currentRecordingOffset + seconds);
  }

  function handleSeekbarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (recordingDurationSeconds <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToRecordingOffset(ratio * recordingDurationSeconds);
  }

  // ── Transport controls ────────────────────────────────────────────────────
  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else void video.play();
  }

  /**
   * Speed Down: divide current speed by 2, clamp at MIN_SPEED (0.25×).
   * Always operates on the CURRENT speed, never resets to 1×.
   */
  function speedDown() {
    const next = Math.max(MIN_SPEED, playbackSpeed / 2);
    if (next === playbackSpeed) return;
    if (videoRef.current) videoRef.current.playbackRate = next;
    onPlaybackSpeedChange(next);
  }

  /**
   * Speed Up: multiply current speed by 2, clamp at MAX_SPEED (8×).
   * Always operates on the CURRENT speed, never resets to 1×.
   */
  function speedUp() {
    const next = Math.min(MAX_SPEED, playbackSpeed * 2);
    if (next === playbackSpeed) return;
    if (videoRef.current) videoRef.current.playbackRate = next;
    onPlaybackSpeedChange(next);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err.message);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // ── Buffered segment rendering ────────────────────────────────────────────
  function renderBufferedSegments() {
    if (!buffered || recordingDurationSeconds <= 0) return null;
    const segments = [];
    for (let i = 0; i < buffered.length; i++) {
      const startInRec = sessionOffsetIntoRecording + buffered.start(i);
      const endInRec = sessionOffsetIntoRecording + buffered.end(i);
      const left = (startInRec / recordingDurationSeconds) * 100;
      const width = ((endInRec - startInRec) / recordingDurationSeconds) * 100;
      segments.push(
        <div
          key={i}
          className="absolute top-0 bottom-0 bg-white/30"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      );
    }
    return segments;
  }

  const absoluteCurrentOffset = sessionOffsetIntoRecording + currentTime;
  const currentProgress =
    recordingDurationSeconds > 0
      ? Math.min(100, Math.max(0, (absoluteCurrentOffset / recordingDurationSeconds) * 100))
      : 0;

  // ── What speed will change TO on next click (shown as button label) ───────
  const nextSpeedUp = Math.min(MAX_SPEED, playbackSpeed * 2);
  const nextSpeedDown = Math.max(MIN_SPEED, playbackSpeed / 2);
  const canSpeedUp = playbackSpeed < MAX_SPEED;
  const canSpeedDown = playbackSpeed > MIN_SPEED;

  if (errorMsg || !hlsUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e03e3e]">
          {errorMsg || 'Recording URL not found.'}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center bg-black group/player overflow-hidden"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        playsInline
        className={className ?? 'w-full flex-1 object-contain'}
        style={{ opacity: isBuffering ? 0 : 1 }}
      />

      {/* Freeze-frame canvas — shown while backend resolves a seek */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity ${
          isBuffering ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Buffering spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#2563eb]" />
        </div>
      )}

      {/* Speed badge — top-right corner, visible only when not at 1× */}
      {playbackSpeed !== 1 && (
        <div className="pointer-events-none absolute right-4 top-4 z-20">
          <span className="rounded-sm border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]">
            {formatSpeed(playbackSpeed)} {playbackSpeed > 1 ? 'FF' : 'SLO'}
          </span>
        </div>
      )}

      {/* ── Skip 10s overlays — centered vertically on the frame ─────────── */}
      <button
        type="button"
        onClick={() => skip(-10)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20
                   flex flex-col items-center gap-1
                   opacity-0 group-hover/player:opacity-100 transition-opacity
                   bg-black/50 hover:bg-black/75 border border-white/10
                   rounded-sm px-3 py-2 text-white"
        aria-label="Skip back 10 seconds"
      >
        <SkipBack className="w-5 h-5 text-[#2563eb]" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">-10s</span>
      </button>

      <button
        type="button"
        onClick={() => skip(10)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20
                   flex flex-col items-center gap-1
                   opacity-0 group-hover/player:opacity-100 transition-opacity
                   bg-black/50 hover:bg-black/75 border border-white/10
                   rounded-sm px-3 py-2 text-white"
        aria-label="Skip forward 10 seconds"
      >
        <SkipForward className="w-5 h-5 text-[#2563eb]" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">+10s</span>
      </button>

      {/* ── Bottom controls bar — appears on hover ───────────────────────── */}
      <div
        className="absolute inset-x-0 bottom-0 z-40
                   flex flex-col gap-2
                   bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent
                   px-4 pb-3 pt-10
                   opacity-0 transition-opacity
                   group-hover/player:opacity-100 focus-within:opacity-100"
      >
        {/* Row 1: Seekbar — always scaled against full recording window */}
        <div
          className="group/seekbar relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/20"
          onClick={handleSeekbarClick}
        >
          {renderBufferedSegments()}
          <div
            className="absolute inset-y-0 bg-[#2563eb] transition-colors group-hover/seekbar:bg-[#3b82f6]"
            style={{ width: `${currentProgress}%` }}
          />
        </div>

        {/* Row 2: Transport controls */}
        <div className="flex items-center">

          {/* LEFT: Speed Down button — divides current speed by 2 */}
          <button
            type="button"
            onClick={speedDown}
            disabled={!canSpeedDown}
            title={canSpeedDown ? `Slow to ${formatSpeed(nextSpeedDown)}` : 'Minimum speed reached'}
            className="flex items-center gap-1.5 h-8 px-3
                       rounded-sm border border-white/10 bg-[#1a1a1a]
                       font-mono text-[10px] font-bold text-white uppercase tracking-wider
                       transition-colors hover:border-[#2563eb] hover:text-[#2563eb]
                       disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Decrease playback speed"
          >
            <Rewind className="w-3.5 h-3.5" />
            {/* Show what speed it will become — not current */}
            {canSpeedDown ? formatSpeed(nextSpeedDown) : formatSpeed(MIN_SPEED)}
          </button>

          {/* CENTER: Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="mx-auto flex h-9 w-9 items-center justify-center
                       rounded-sm bg-[#2563eb] text-white
                       transition-colors hover:bg-[#3b82f6]"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause className="w-4 h-4" fill="currentColor" />
              : <Play className="w-4 h-4" fill="currentColor" />
            }
          </button>

          {/* RIGHT: Speed Up + current speed indicator + Mute + Fullscreen */}
          <div className="flex items-center gap-3">

            {/* Speed Up button — multiplies current speed by 2 */}
            <button
              type="button"
              onClick={speedUp}
              disabled={!canSpeedUp}
              title={canSpeedUp ? `Fast forward to ${formatSpeed(nextSpeedUp)}` : 'Maximum speed reached'}
              className="flex items-center gap-1.5 h-8 px-3
                         rounded-sm border border-white/10 bg-[#1a1a1a]
                         font-mono text-[10px] font-bold text-white uppercase tracking-wider
                         transition-colors hover:border-[#2563eb] hover:text-[#2563eb]
                         disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Increase playback speed"
            >
              <FastForward className="w-3.5 h-3.5" />
              {/* Show what speed it will become — not current */}
              {canSpeedUp ? formatSpeed(nextSpeedUp) : formatSpeed(MAX_SPEED)}
            </button>

            {/* Current speed indicator — always visible so user knows where they are */}
            <span className="w-10 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">
              {formatSpeed(playbackSpeed)}
            </span>

            {/* Timestamp */}
            <span className="hidden sm:block whitespace-nowrap font-mono text-[10px] text-white/60">
              {formatClockTime(recordingStartMs + absoluteCurrentOffset * 1000)}
              {' / '}
              {formatClockTime(recordingEndMs)}
            </span>

            {/* Mute / Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-7 w-7 items-center justify-center text-white transition-colors hover:text-[#2563eb]"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-7 w-7 items-center justify-center text-white transition-colors hover:text-[#2563eb]"
              aria-label="Toggle fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}