import { useEffect, useRef } from "react";
import axios from "axios";
import Hls from "hls.js";
import { type Camera } from "../../types/camera";
import { useGridStore } from "../../store/useGridStore";

interface StreamPlayerProps {
  streamUrl: string;
  channel: Camera;
  cellIndex: number;
}

export const StreamPlayer = ({ streamUrl, channel, cellIndex }: StreamPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { addChannel } = useGridStore();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let retryCount = 0;
    const maxRetries = 1;
    
    const handleFailure = () => {
      console.warn('Stream failure detected, marking as no-signal');
      addChannel({ ...channel, status: 'no-signal', streamUrl: undefined }, cellIndex);
    };

    const startWebRTC = async () => {
      try {
        let whepUrl = streamUrl.endsWith('/whep') ? streamUrl : streamUrl.replace(/\/?$/, "/whep");
        let authHeader: string | null = null;
        
        try {
          const normalized = whepUrl.replace(/^rtsp:\/\//i, "http://");
          const urlObj = new URL(normalized);

          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
          try {
            const apiHost = new URL(apiBaseUrl).hostname;
            if (urlObj.hostname !== apiHost) {
              urlObj.hostname = apiHost;
            }
          } catch (e) {
            console.error("Invalid API Base URL for hostname sync:", e);
          }

          if (urlObj.username || urlObj.password) {
            authHeader = `Basic ${btoa(`${urlObj.username}:${urlObj.password}`)}`;
            urlObj.username = "";
            urlObj.password = "";
          }

          if (urlObj.port === "554") {
            urlObj.port = "8889";
          }

          whepUrl = urlObj.toString();
        } catch (e) {
          console.error("URL Parsing failed:", e);
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        pc.ontrack = (event) => {
          if (event.streams?.[0]) {
            video.srcObject = event.streams[0];
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            handleFailure();
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") resolve();
          };
          setTimeout(resolve, 3000);
        });

        const res = await axios.post(whepUrl, pc.localDescription!.sdp, {
          headers: { 
            "Content-Type": "application/sdp",
            ...(authHeader && { "Authorization": authHeader })
          },
          responseType: 'text'
        });

        await pc.setRemoteDescription({
          type: "answer",
          sdp: res.data,
        });
        
        retryCount = 0;

      } catch (err) {
        console.error(`WebRTC failed (attempt ${retryCount + 1}):`, err);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(startWebRTC, 2000);
        } else {
          handleFailure();
        }
      }
    };

    const startHls = () => {
      if (Hls.isSupported()) {
        const hls = new Hls({ 
          enableWorker: true,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 2
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.error("Auto-play failed:", e));
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            handleFailure();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(e => console.error("Auto-play failed:", e));
        });
      }
    };

    if (streamUrl.includes('index.m3u8')) {
      startHls();
    } else {
      startWebRTC();
    }

    // Monitor video element for stalls
    const onStalled = () => {
      // If stalled for more than 5 seconds, it's a failure
      const timer = setTimeout(handleFailure, 5000);
      video.onplaying = () => clearTimeout(timer);
    };

    video.addEventListener('stalled', onStalled);

    return () => {
      video.removeEventListener('stalled', onStalled);
      pcRef.current?.close();
      pcRef.current = null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) video.srcObject = null;
    };

  }, [streamUrl]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover bg-black"
    />
  );
};
