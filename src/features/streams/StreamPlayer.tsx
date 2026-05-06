import { useEffect, useRef } from "react";
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

    const startWebRTC = async () => {
      try {
        let whepUrl = streamUrl.replace(/\/?$/, "/whep");
        let authHeader: string | null = null;
        
        try {
          const normalized = whepUrl.replace(/^rtsp:\/\//i, "http://");
          const urlObj = new URL(normalized);

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

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") return resolve();
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === "complete") resolve();
          };
          setTimeout(resolve, 3000);
        });

        const res = await fetch(whepUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/sdp",
            ...(authHeader && { "Authorization": authHeader })
          },
          body: pc.localDescription!.sdp,
        });

        if (!res.ok) {
          throw new Error(`WHEP failed with status: ${res.status}`);
        }

        await pc.setRemoteDescription({
          type: "answer",
          sdp: await res.text(),
        });
        
        // Reset retry on success
        retryCount = 0;

      } catch (err) {
        console.error(`WebRTC failed (attempt ${retryCount + 1}):`, err);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(startWebRTC, 2000);
        } else {
          // Update store to NO SIGNAL
          addChannel({ ...channel, status: 'no-signal' }, cellIndex);
        }
      }
    };

    const startHls = () => {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.error("Auto-play failed:", e));
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error("HLS fatal error:", data);
            addChannel({ ...channel, status: 'no-signal' }, cellIndex);
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

    return () => {
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
