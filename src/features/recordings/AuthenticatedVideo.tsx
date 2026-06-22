import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

interface PlaybackWhepPlayerProps {
  whepUrl: string;
  className?: string;
}

const ICE_GATHERING_TIMEOUT_MS = 5000;

/**
 * WebRTC player for MediaMTX WHEP playback sessions returned by the backend.
 */
export function PlaybackWhepPlayer({ whepUrl, className }: PlaybackWhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function startPlayback() {
      const video = videoRef.current;
      if (!video) return;

      setErrorMsg(null);

      try {
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionRef.current = peerConnection;

        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });

        peerConnection.ontrack = (event) => {
          if (event.streams?.[0] && videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // MediaMTX expects the SDP offer after ICE candidates are gathered.
        await new Promise<void>((resolve) => {
          if (peerConnection.iceGatheringState === 'complete') {
            resolve();
            return;
          }

          peerConnection.onicegatheringstatechange = () => {
            if (peerConnection.iceGatheringState === 'complete') resolve();
          };
          window.setTimeout(resolve, ICE_GATHERING_TIMEOUT_MS);
        });

        const { data } = await axios.post(whepUrl, peerConnection.localDescription?.sdp, {
          headers: { 'Content-Type': 'application/sdp' },
          responseType: 'text',
          timeout: 30000,
        });

        if (isCancelled) {
          peerConnection.close();
          return;
        }

        await peerConnection.setRemoteDescription({ type: 'answer', sdp: data });
      } catch (error) {
        if (!isCancelled) {
          console.error('[PlaybackWhepPlayer] Failed to start WHEP playback:', error);
          setErrorMsg('Failed to start playback stream.');
        }
      }
    }

    startPlayback();

    return () => {
      isCancelled = true;
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [whepUrl]);

  if (errorMsg) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e03e3e]">{errorMsg}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      controls
      playsInline
      className={className}
    />
  );
}
