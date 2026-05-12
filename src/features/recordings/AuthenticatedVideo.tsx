import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/axios';
import { useSessionStore } from '../../store/useSessionStore';

interface AuthenticatedVideoProps {
  recordingId: string;
  className?: string;
}

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Authenticated video player for recordings.
 *
 * Strategy:
 * 1. Build a URL with the token as a query param → lets the browser stream
 *    natively with HTTP range requests (enables seeking, scrubbing, resume).
 * 2. If the server doesn't support ?token= (returns 401), fall back to
 *    fetching the entire file as a blob via axios and creating an object URL.
 */
export function AuthenticatedVideo({ recordingId, className }: AuthenticatedVideoProps) {
  const token = useSessionStore(s => s.token);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mode, setMode] = useState<'stream' | 'blob' | 'error'>('stream');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const prevBlobRef = useRef<string | null>(null);

  // The primary streaming URL — token as query param for native range support
  const streamUrl = `${BASE}/recordings/stream/${recordingId}?token=${token}`;

  // Fallback: load entire file as blob via axios (auth header included)
  useEffect(() => {
    if (mode !== 'blob') return;

    let isCancelled = false;
    setIsLoadingBlob(true);

    if (prevBlobRef.current) {
      URL.revokeObjectURL(prevBlobRef.current);
      prevBlobRef.current = null;
    }

    api.get(`/recordings/stream/${recordingId}`, { responseType: 'blob' })
      .then(res => {
        if (isCancelled) return;
        const url = URL.createObjectURL(res.data);
        prevBlobRef.current = url;
        setBlobUrl(url);
      })
      .catch(err => {
        if (isCancelled) return;
        const status = err?.response?.status;
        setErrorMsg(
          status === 401 ? 'Session expired. Please log in again.' :
          status === 404 ? 'Recording not found on server.' :
          'Failed to load recording.'
        );
        setMode('error');
      })
      .finally(() => { if (!isCancelled) setIsLoadingBlob(false); });

    return () => {
      isCancelled = true;
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    };
  }, [recordingId, mode]);

  // Reset state when recording changes
  useEffect(() => {
    setMode('stream');
    setBlobUrl(null);
    setErrorMsg(null);
  }, [recordingId]);

  if (mode === 'error') {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e03e3e]">{errorMsg}</span>
        <button
          onClick={() => setMode('blob')}
          className="text-[10px] font-bold uppercase tracking-widest text-[#2563eb] hover:underline"
        >
          Try loading anyway
        </button>
      </div>
    );
  }

  if (mode === 'blob' && isLoadingBlob) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-[#2563eb]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Buffering recording...</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      key={recordingId}
      src={mode === 'blob' ? blobUrl! : streamUrl}
      controls
      autoPlay
      className={className}
      onError={() => {
        // Primary stream URL failed (server doesn't support ?token=) → fall back to blob
        if (mode === 'stream') {
          console.warn('[AuthenticatedVideo] Stream URL failed, falling back to blob fetch');
          setMode('blob');
        } else {
          setMode('error');
          setErrorMsg('Playback error. The file may be corrupted or unsupported.');
        }
      }}
    />
  );
}
