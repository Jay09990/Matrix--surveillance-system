import { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';

interface AuthenticatedVideoProps {
  recordingId: string;
  className?: string;
}

/**
 * Authenticated video player for recordings using the backend-suggested 
 * tokenized stream URL strategy.
 */
export function AuthenticatedVideo({ recordingId, className }: AuthenticatedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    
    async function fetchStreamUrl() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        
        // Step 1: Get the tokenized URL from backend
        const { data } = await apiService.recordings.getStreamToken(recordingId);
        
        if (isCancelled) return;

        // Step 2: Set the URL (backend returns relative URL, so we prepend base if needed)
        // If backend returns absolute URL or we handle it in apiService, use as is.
        // Based on suggestion: /api/recordings/stream/abc123?token=...
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
        
        // Ensure we don't double up on /api if the backend returns it
        const finalUrl = data.streamUrl.startsWith('http') 
          ? data.streamUrl 
          : `${baseUrl.replace(/\/api$/, '')}${data.streamUrl}`;

        setStreamUrl(finalUrl);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('[AuthenticatedVideo] Failed to fetch stream token:', err);
        const status = err?.response?.status;
        setErrorMsg(
          status === 401 ? 'Session expired. Please log in again.' :
          status === 404 ? 'Recording not found.' :
          'Failed to initialize stream.'
        );
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    fetchStreamUrl();

    return () => {
      isCancelled = true;
    };
  }, [recordingId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 text-[#2563eb]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Initializing stream...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e03e3e]">{errorMsg}</span>
        <button
          onClick={() => window.location.reload()}
          className="text-[10px] font-bold uppercase tracking-widest text-[#2563eb] hover:underline"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      key={recordingId}
      src={streamUrl || undefined}
      controls
      autoPlay
      className={className}
      onError={() => {
        setErrorMsg('Playback error. The stream may have expired or is unsupported.');
      }}
    />
  );
}
