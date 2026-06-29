import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface PlaybackHlsPlayerProps {
  hlsUrl: string;
  durationSeconds: number;
  onSeekRequest: (offsetSeconds: number) => void;
  className?: string;
}

const SKIP_SECONDS = 10;

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function PlaybackHlsPlayer({ hlsUrl, durationSeconds, onSeekRequest, className }: PlaybackHlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hlsUrl) return;

    setErrorMsg(null);
    setCurrentTime(0);
    setIsPlaying(false);

    // Destroy any previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onProgress = () => setBuffered(video.buffered);
    const onVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onProgress);
    video.addEventListener('volumechange', onVolumeChange);

    video.muted = true;

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
        video.play().catch(err => {
          console.error('[PlaybackHlsPlayer] play() failed:', err);
          setErrorMsg('Playback failed: ' + err.message);
        });
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => {
          console.error('[PlaybackHlsPlayer] Native HLS play() failed:', err);
          setErrorMsg('Playback failed: ' + err.message);
        });
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
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('volumechange', onVolumeChange);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.src = '';
      video.load();
    };
  }, [hlsUrl]);

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;

    const targetOffset = currentTime + seconds;

    // Check if target is already buffered locally
    let isBuffered = false;
    if (buffered) {
      for (let i = 0; i < buffered.length; i++) {
        if (targetOffset >= buffered.start(i) && targetOffset <= buffered.end(i)) {
          isBuffered = true;
          break;
        }
      }
    }

    if (isBuffered) {
      video.currentTime = Math.max(0, targetOffset);
    } else {
      // Out of buffer — request a new HLS session starting at the offset
      onSeekRequest(Math.max(0, Math.min(targetOffset, durationSeconds)));
    }
  }

  function handleSeekbarClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetOffset = ratio * durationSeconds;

    let isBuffered = false;
    if (buffered) {
      for (let i = 0; i < buffered.length; i++) {
        if (targetOffset >= buffered.start(i) && targetOffset <= buffered.end(i)) {
          isBuffered = true;
          break;
        }
      }
    }

    if (isBuffered) {
      if (videoRef.current) videoRef.current.currentTime = targetOffset;
    } else {
      onSeekRequest(targetOffset);
    }
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

  const renderBufferedSegments = () => {
    if (!buffered || durationSeconds <= 0) return null;
    const segments = [];
    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);
      const left = (start / durationSeconds) * 100;
      const width = ((end - start) / durationSeconds) * 100;
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

  const currentProgress = durationSeconds > 0 ? (currentTime / durationSeconds) * 100 : 0;

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
        muted
        className={className ?? 'w-full flex-1 object-contain'}
      />

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
        {/* Seekbar */}
        <div
          className="relative h-1.5 w-full bg-white/20 cursor-pointer rounded-full overflow-hidden group/seekbar"
          onClick={handleSeekbarClick}
        >
          {/* Buffered Segments */}
          {renderBufferedSegments()}

          {/* Current Progress */}
          <div
            className="absolute top-0 bottom-0 bg-[#2563eb] group-hover/seekbar:bg-[#3b82f6] transition-colors"
            style={{ width: `${Math.min(currentProgress, 100)}%` }}
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
            <span className="text-xs font-mono text-white/80">
              {formatTime(currentTime)} / {formatTime(durationSeconds)}
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
