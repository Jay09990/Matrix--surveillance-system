import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface PlaybackHlsPlayerProps {
  hlsUrl: string;

  /**
   * Absolute, IMMUTABLE start/end of the recording being played (ms epoch).
   * This is the anchor for the seekbar — it must NOT change when the
   * underlying HLS session is re-resolved after a seek. Only the visible
   * *session* window (what's actually being streamed right now) shrinks/shifts.
   */
  recordingStartMs: number;
  recordingEndMs: number;

  /**
   * Absolute start/end of the CURRENT streaming session (ms epoch).
   * This is whatever sub-range the backend just resolved (e.g. after a seek,
   * sessionStartMs moves forward but recordingStartMs never does).
   */
  sessionStartMs: number;
  sessionEndMs: number;

  /**
   * Called with an ABSOLUTE epoch ms timestamp the user wants to jump to.
   * The parent is responsible for deciding whether this is within the
   * current session's local buffer or requires a new backend resolve.
   */
  onSeekToAbsolute: (absoluteMs: number) => void;

  /**
   * True while the backend is resolving a new session (e.g. during a seek).
   * Used to freeze the current frame and show a loading spinner.
   */
  isResolving?: boolean;

  /** Emits the current absolute playback time (epoch ms) */
  onTimeUpdate?: (absoluteMs: number) => void;

  className?: string;
}

const SKIP_SECONDS = 10;

function formatClockTime(ms: number) {
  if (!Number.isFinite(ms)) return '--:--:--';
  const d = new Date(ms);
  return d.toLocaleTimeString('en-GB', { hour12: false });
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
  className,
}: PlaybackHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Persist playback states across seeks
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0); // seconds, relative to sessionStartMs
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  const recordingDurationSeconds = Math.max(0, (recordingEndMs - recordingStartMs) / 1000);
  const sessionDurationSeconds = Math.max(0, (sessionEndMs - sessionStartMs) / 1000);
  // Where this session sits within the overall recording timeline (seconds)
  const sessionOffsetIntoRecording = Math.max(0, (sessionStartMs - recordingStartMs) / 1000);

  // Freeze frame immediately when a seek starts
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
      setCurrentTime(video.currentTime);
      if (onTimeUpdate) {
        onTimeUpdate(sessionStartMs + video.currentTime * 1000);
      }
    };
    const onProgress = () => setBuffered(video.buffered);
    const onVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdateEvent);
    video.addEventListener('progress', onProgress);
    video.addEventListener('volumechange', onVolumeChange);

    // Sync current state to video initially
    video.muted = isMuted;

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
          console.error('[PlaybackHlsPlayer] Fatal HLS error:', data);
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
              break;
          }
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        if (isPlaying) {
          video.play().catch(err => {
            console.error('[PlaybackHlsPlayer] play() failed:', err);
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
        if (isPlaying) {
          video.play().catch(err => {
            console.error('[PlaybackHlsPlayer] Native HLS play() failed:', err);
            setErrorMsg('Playback failed: ' + err.message);
          });
        }
      });
      video.addEventListener('error', () => {
        const code = video.error?.code;
        console.error('[PlaybackHlsPlayer] Native HLS video error', code);
        setErrorMsg(`Failed to load recording (code ${code})`);
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

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Note: we do NOT clear video.src here so we don't flash a black frame
      // if the canvas didn't capture properly. hls.js will overwrite it anyway.
    };
    // Re-init only when the actual stream URL changes (i.e. a new session was resolved)
    // We intentionally omit `isPlaying` and `isMuted` so they don't retrigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlsUrl]);

  /**
   * Converts a target ABSOLUTE recording-relative offset (seconds since
   * recordingStartMs) into either a local video.currentTime seek (if it
   * falls within the currently buffered range of THIS session) or a
   * request to resolve a brand new session anchored at that absolute time.
   */
  function seekToRecordingOffset(targetRecordingOffsetSeconds: number) {
    const video = videoRef.current;
    if (!video) return;

    const clamped = Math.max(0, Math.min(targetRecordingOffsetSeconds, recordingDurationSeconds));

    // Translate into "seconds within the current session" to check local buffer.
    const targetSessionOffset = clamped - sessionOffsetIntoRecording;

    let isBuffered = false;
    if (buffered && targetSessionOffset >= 0 && targetSessionOffset <= sessionDurationSeconds) {
      for (let i = 0; i < buffered.length; i++) {
        if (targetSessionOffset >= buffered.start(i) && targetSessionOffset <= buffered.end(i)) {
          isBuffered = true;
          break;
        }
      }
    }

    if (isBuffered) {
      video.currentTime = targetSessionOffset;
    } else {
      // Out of this session's range entirely (forward OR backward) — ask
      // parent to resolve a fresh session anchored at the ABSOLUTE time.
      const absoluteMs = recordingStartMs + clamped * 1000;
      onSeekToAbsolute(absoluteMs);
    }
  }

  function skip(seconds: number) {
    // currentTime is relative to the session; convert to recording-absolute first.
    const currentRecordingOffset = sessionOffsetIntoRecording + currentTime;
    seekToRecordingOffset(currentRecordingOffset + seconds);
  }

  function handleSeekbarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (recordingDurationSeconds <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetRecordingOffset = ratio * recordingDurationSeconds;
    seekToRecordingOffset(targetRecordingOffset);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
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
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  // Buffered segments are rendered against the FULL recording timeline,
  // offset by where this session sits within it.
  const renderBufferedSegments = () => {
    if (!buffered || recordingDurationSeconds <= 0) return null;
    const segments = [];
    for (let i = 0; i < buffered.length; i++) {
      const startInRecording = sessionOffsetIntoRecording + buffered.start(i);
      const endInRecording = sessionOffsetIntoRecording + buffered.end(i);
      const left = (startInRecording / recordingDurationSeconds) * 100;
      const width = ((endInRecording - startInRecording) / recordingDurationSeconds) * 100;
      segments.push(
        <div
          key={i}
          className="absolute top-0 bottom-0 bg-white/30"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      );
    }
    return segments;
  };

  // Progress dot position is also relative to the FULL recording timeline.
  const absoluteCurrentOffset = sessionOffsetIntoRecording + currentTime;
  const currentProgress =
    recordingDurationSeconds > 0 ? (absoluteCurrentOffset / recordingDurationSeconds) * 100 : 0;

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
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center bg-black group/player overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        className={className ?? 'w-full flex-1 object-contain'}
        style={{ opacity: isBuffering ? 0 : 1 }}
      />

      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity ${isBuffering ? 'opacity-100' : 'opacity-0'}`}
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-[#2563eb]" />
        </div>
      )}

      {/* Skip overlay buttons — visible on hover */}
      <div className="absolute inset-x-0 top-0 bottom-16 flex items-center justify-between px-6 pointer-events-none opacity-0 group-hover/player:opacity-100 transition-opacity z-10">
        <button
          onClick={() => skip(-SKIP_SECONDS)}
          className="pointer-events-auto flex flex-col items-center gap-1 bg-black/60 hover:bg-black/80 border border-white/10 rounded-sm px-4 py-3 text-white transition-all"
        >
          <SkipBack className="w-5 h-5 text-[#2563eb]" />
          <span className="text-[9px] font-bold font-mono uppercase tracking-widest">-{SKIP_SECONDS}s</span>
        </button>

        <button
          onClick={() => skip(SKIP_SECONDS)}
          className="pointer-events-auto flex flex-col items-center gap-1 bg-black/60 hover:bg-black/80 border border-white/10 rounded-sm px-4 py-3 text-white transition-all"
        >
          <SkipForward className="w-5 h-5 text-[#2563eb]" />
          <span className="text-[9px] font-bold font-mono uppercase tracking-widest">+{SKIP_SECONDS}s</span>
        </button>
      </div>

      {/* Custom Controls Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-4 px-4 flex flex-col gap-2 opacity-0 group-hover/player:opacity-100 transition-opacity z-20">
        {/* Seekbar — scaled against the FULL recording, not the current session */}
        <div
          className="relative h-1.5 w-full bg-white/20 cursor-pointer rounded-full overflow-hidden group/seekbar"
          onClick={handleSeekbarClick}
        >
          {/* Buffered Segments */}
          {renderBufferedSegments()}

          {/* Current Progress */}
          <div
            className="absolute top-0 bottom-0 bg-[#2563eb] group-hover/seekbar:bg-[#3b82f6] transition-colors"
            style={{ width: `${Math.min(Math.max(currentProgress, 0), 100)}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-[#2563eb] transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-[#2563eb] transition-colors">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            {/* Show absolute wall-clock time, not relative offsets — much clearer for a recording */}
            <span className="text-xs font-mono text-white/80">
              {formatClockTime(recordingStartMs + absoluteCurrentOffset * 1000)} / {formatClockTime(recordingEndMs)}
            </span>
          </div>

          <button onClick={toggleFullscreen} className="text-white hover:text-[#2563eb] transition-colors">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}