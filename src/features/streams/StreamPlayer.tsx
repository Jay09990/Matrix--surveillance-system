import { useEffect, useRef } from "react";
import axios from "axios";
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
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);
  const { addChannel } = useGridStore();

  const MAX_RETRIES = 5
  const RETRY_DELAY_MS = 3000

  const lastUrlRef = useRef<string>(streamUrl)

  useEffect(() => {
    console.log(`[StreamPlayer] Mount/Update for ${streamUrl}`)
    isMountedRef.current = true
    
    // Only start if we don't have a connection or the URL changed
    if (!pcRef.current || lastUrlRef.current !== streamUrl) {
      console.log(`[StreamPlayer] Starting WebRTC (URL changed: ${lastUrlRef.current !== streamUrl})`)
      lastUrlRef.current = streamUrl
      retryCountRef.current = 0
      startWebRTC()
    }

    return () => {
      // We only want to cleanup if we are actually unmounting, 
      // not just because a prop (other than streamUrl) changed.
      // But since this effect depends on [streamUrl], it will run on mount and URL change.
    }
  }, [streamUrl])

  // Separate unmount effect
  useEffect(() => {
    return () => {
      console.log(`[StreamPlayer] Unmounting for ${streamUrl}`)
      isMountedRef.current = false
      cleanup()
    }
  }, [])

  const cleanup = () => {
    console.log(`[StreamPlayer] Cleanup called for ${streamUrl}`)
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (pcRef.current) {
      const pc = pcRef.current
      pc.oniceconnectionstatechange = null
      pc.onconnectionstatechange = null
      pc.ontrack = null
      pc.onsignalingstatechange = null
      pc.close()
      pcRef.current = null
      console.log(`[StreamPlayer] PeerConnection closed`)
    }
    const video = videoRef.current
    if (video) video.srcObject = null
  }

  const handlePermanentFailure = () => {
    if (!isMountedRef.current) return
    console.warn(`[StreamPlayer] Stream permanently failed after ${MAX_RETRIES} retries`)
    addChannel({ ...channel, status: 'no-signal', streamUrl: undefined }, cellIndex)
  }

  const scheduleRetry = () => {
    if (!isMountedRef.current) return
    if (retryTimerRef.current) {
      console.log(`[StreamPlayer] Retry already scheduled, skipping`)
      return
    }

    if (retryCountRef.current >= MAX_RETRIES) {
      handlePermanentFailure()
      return
    }

    retryCountRef.current += 1
    const delay = RETRY_DELAY_MS * retryCountRef.current
    console.log(`[StreamPlayer] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`)

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      if (isMountedRef.current) {
        console.log(`[StreamPlayer] Executing retry for ${streamUrl}`)
        startWebRTC()
      }
    }, delay)
  }

  const buildWhepUrl = (url: string): string => {
    try {
      const normalized = url.replace(/^rtsp:\/\//i, 'http://')
      const urlObj = new URL(normalized)

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
      try {
        const apiHost = new URL(apiBaseUrl).hostname
        if (urlObj.hostname !== apiHost) urlObj.hostname = apiHost
      } catch { }

      urlObj.username = ''
      urlObj.password = ''

      if (urlObj.port === '554') urlObj.port = '8889'

      const base = urlObj.toString().replace(/\/?$/, '')
      return base.endsWith('/whep') ? base : `${base}/whep`
    } catch {
      return url.endsWith('/whep') ? url : `${url}/whep`
    }
  }

  const startWebRTC = async () => {
    const video = videoRef.current
    if (!video || !isMountedRef.current) return

    // Clean up previous connection if it exists
    if (pcRef.current) {
      console.log(`[StreamPlayer] Closing existing connection before restart`)
      cleanup()
    }

    try {
      const whepUrl = buildWhepUrl(streamUrl)
      console.log(`[WHEP] Connecting to ${whepUrl}`)

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      pcRef.current = pc

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      pc.ontrack = (event) => {
        if (event.streams?.[0] && videoRef.current) {
          console.log(`[WHEP] Received track for ${streamUrl}`)
          videoRef.current.srcObject = event.streams[0]
        }
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        console.log(`[ICE] state for ${streamUrl}: ${state}`)

        if (state === 'failed') {
          console.warn(`[ICE] Connection failed for ${streamUrl}`)
          scheduleRetry()
        }

        // Removed aggressive disconnected retry — let it go to failed or recover naturally
        
        if (state === 'connected' || state === 'completed') {
          console.log(`[ICE] Successfully connected for ${streamUrl}`)
          retryCountRef.current = 0
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current)
            retryTimerRef.current = null
          }
          // Update status to online in store if it's not already
          if (channel.status !== 'online') {
            addChannel({ ...channel, status: 'online' }, cellIndex)
          }
        }
      }

      pc.onconnectionstatechange = () => {
        console.log(`[PC] state for ${streamUrl}: ${pc.connectionState}`)
        if (pc.connectionState === 'failed') {
          console.warn(`[PC] Connection failed for ${streamUrl}`)
          scheduleRetry()
        }
      }

      pc.onsignalingstatechange = () => {
        console.log(`[Signaling] state for ${streamUrl}: ${pc.signalingState}`)
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering with timeout
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve()
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') resolve()
        }
        setTimeout(resolve, 5000)
      })

      const res = await axios.post(whepUrl, pc.localDescription!.sdp, {
        headers: { 'Content-Type': 'application/sdp' },
        responseType: 'text',
        timeout: 30000,
      })

      if (!isMountedRef.current || pcRef.current !== pc) {
        pc.close()
        return
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: res.data })
      console.log(`[WHEP] Remote description set for ${streamUrl}`)

    } catch (err) {
      console.error(`[WHEP] Connection error for ${streamUrl}:`, err)
      if (isMountedRef.current) scheduleRetry()
    }
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      
      className="w-full h-full object-contain bg-black"
      onPlaying={() => console.log(`[Video] playing: ${streamUrl}`)}
      onPause={() => console.log(`[Video] paused: ${streamUrl}`)}
      onEnded={() => console.log(`[Video] ended: ${streamUrl}`)}
      onStalled={() => console.log(`[Video] stalled: ${streamUrl}`)}
      onWaiting={() => console.log(`[Video] waiting: ${streamUrl}`)}
      onError={(e) => console.error(`[Video] error: ${streamUrl}`, e)}
    />
  )
}