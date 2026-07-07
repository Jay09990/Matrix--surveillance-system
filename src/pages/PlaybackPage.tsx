import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Film,
  MapPin,
  Play,
  Server,
  Video,
} from 'lucide-react';
import { Topbar } from '../components/Topbar';
import { SectionLabel } from '../components/SectionLabel';
import { PlaybackVideoPlayer } from '../features/recordings/PlaybackVideoPlayer';
import { PlaybackTimeline } from '../features/recordings/PlaybackTimeline';
import { usePlaybackCameras, usePlaybackRecordings } from '../features/recordings/useRecordings';
import { useSessionStore } from '../store/useSessionStore';
import type { PlaybackCamera, PlaybackRecording } from '../types/playback';

interface SelectedCamera {
  nvrId: string;
  channel: number;
  name: string;
}

interface ActiveStream {
  // The URL of the backend /api/playback/stream endpoint.
  // Changing this URL causes the <video> to reload from the new position.
  streamUrl: string;

  // Where the CURRENTLY LOADED stream actually starts playing from — this is
  // whatever startTime was last passed to buildStreamUrl. Changes on every
  // seek. This is the origin for all "absolute position = this + video.currentTime"
  // math — using the segment start here instead (the old bug) makes the
  // displayed clock/playhead snap back to the segment's start on every seek,
  // even though the underlying ffmpeg stream is playing the correct footage.
  streamStartMs: number;

  // IMMUTABLE for as long as we're within the same recording segment — the
  // full window of the underlying recording. Used ONLY to clamp seek targets
  // and to scale the seekbar/timeline, never as a position origin.
  recordingStartMs: number;
  recordingEndMs: number;
  durationSeconds: number;

  // Kept for building new seek URLs
  nvrId: string;
  channel: number;
  recordingEndTime: string; // ISO
}

interface GroupedNvr { name: string; cameras: PlaybackCamera[] }
interface GroupedStation { name: string; city: string; nvrs: Record<string, GroupedNvr> }

// Build the stream URL — no API call, just query params
function buildStreamUrl(
  nvrId: string,
  channel: number,
  startTime: string,  // ISO — where to start streaming from
  endTime: string,    // ISO — end of the recording window
): string {
  const params = new URLSearchParams({
    nvrId,
    channel: String(channel),
    startTime,
    endTime,
  });
  
  // Natively playing a video stream doesn't attach Axios interceptor headers,
  // so we must send the auth token via a query parameter.
  const { token } = useSessionStore.getState();
  if (token) {
    params.set('token', token);
  }

  return `/api/playback/stream?${params.toString()}`;
}

export default function PlaybackPage() {
  const navigate = useNavigate();

  const [selectedCamera, setSelectedCamera]   = useState<SelectedCamera | null>(null);
  const [selectedDate, setSelectedDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activeStream, setActiveStream]       = useState<ActiveStream | null>(null);
  const [currentAbsoluteMs, setCurrentAbsoluteMs] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed]     = useState(1);
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});
  const [expandedNvrs, setExpandedNvrs]       = useState<Record<string, boolean>>({});

  const { data: cameras, isLoading: isLoadingCameras } = usePlaybackCameras();
  const { data: recordings } = usePlaybackRecordings(
    selectedCamera?.nvrId ?? null,
    selectedCamera?.channel ?? null,
    selectedDate,
  );

  const groupedRecordings = useMemo(() => {
    if (!cameras) return {};
    return cameras.reduce<Record<string, GroupedStation>>((acc, camera) => {
      const stationId = camera.nvr?.station?.id || 'unknown-station';
      const nvrId     = camera.nvr?.id || 'unknown-nvr';
      if (!acc[stationId]) {
        acc[stationId] = {
          name: camera.nvr?.station?.name || 'Unknown Station',
          city: camera.nvr?.station?.city || 'Unknown Location',
          nvrs: {},
        };
      }
      if (!acc[stationId].nvrs[nvrId]) {
        acc[stationId].nvrs[nvrId] = { name: camera.nvr?.name || 'Unknown NVR', cameras: [] };
      }
      acc[stationId].nvrs[nvrId].cameras.push(camera);
      return acc;
    }, {});
  }, [cameras]);

  // Unmount: nothing to clean up — the browser closes the HTTP connection
  // when the <video> unmounts, which kills ffmpeg on the backend automatically.

  function handleCameraSelect(camera: PlaybackCamera) {
    setSelectedCamera({ nvrId: camera.nvrId, channel: camera.channel, name: camera.cameraName });
    setActiveStream(null);
    setCurrentAbsoluteMs(null);
    setPlaybackSpeed(1);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setActiveStream(null);
    setCurrentAbsoluteMs(null);
  }

  // Called by the player's custom seekbar when user drags to a new position
  const handleSeekbarJump = useCallback((absoluteMs: number) => {
    if (!activeStream || !selectedCamera) return;

    const clamped = Math.max(
      activeStream.recordingStartMs,
      Math.min(absoluteMs, activeStream.recordingEndMs),
    );

    // Build a new URL starting from the seek position — changing streamUrl
    // causes the <video key={streamUrl}> to remount and start from there.
    const newStreamUrl = buildStreamUrl(
      activeStream.nvrId,
      activeStream.channel,
      new Date(clamped).toISOString(),
      activeStream.recordingEndTime,
    );

    setActiveStream(prev => prev ? { ...prev, streamUrl: newStreamUrl, streamStartMs: clamped } : prev);
    setCurrentAbsoluteMs(clamped);
  }, [activeStream, selectedCamera]);

  // Called by the bottom timeline when user clicks on a recording segment
  const handleTimelineJump = useCallback((absoluteMs: number) => {
    if (!recordings || !selectedCamera) return;

    // Find which recording segment contains this timestamp
    const targetRecording = recordings.find((r: PlaybackRecording) => {
      const start = new Date(r.startTime).getTime();
      let end = start + 5 * 60 * 1000;
      if (r.endTime) end = new Date(r.endTime).getTime();
      else if (r.durationSeconds) end = start + r.durationSeconds * 1000;
      return absoluteMs >= start && absoluteMs <= end;
    });

    if (!targetRecording) return;

    // Resolve the end time of this recording segment
    let endTimeStr = targetRecording.endTime;
    if (!endTimeStr) {
      if (targetRecording.durationSeconds) {
        endTimeStr = new Date(
          new Date(targetRecording.startTime).getTime() + targetRecording.durationSeconds * 1000
        ).toISOString();
      } else {
        endTimeStr = new Date(
          new Date(targetRecording.startTime).getTime() + 5 * 60 * 1000
        ).toISOString();
      }
    }

    const recordingStartMs = new Date(targetRecording.startTime).getTime();
    const recordingEndMs   = new Date(endTimeStr).getTime();
    const durationSeconds  = Math.round((recordingEndMs - recordingStartMs) / 1000);

    const streamUrl = buildStreamUrl(
      selectedCamera.nvrId,
      selectedCamera.channel,
      new Date(absoluteMs).toISOString(),  // start from where user clicked
      endTimeStr,
    );

    setActiveStream({
      streamUrl,
      streamStartMs: absoluteMs, // ← the actual click point; this is where the stream begins
      recordingStartMs,          // segment bounds — for clamping/scaling only, not a position origin
      recordingEndMs,
      durationSeconds,
      nvrId: selectedCamera.nvrId,
      channel: selectedCamera.channel,
      recordingEndTime: endTimeStr,
    });
    setCurrentAbsoluteMs(absoluteMs);
  }, [recordings, selectedCamera]);

  const toggleStation = (id: string) =>
    setExpandedStations(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleNvr = (id: string) =>
    setExpandedNvrs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden font-sans">
      <Topbar />

      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="w-80 bg-[#131313] border-r border-[#1e1e1e] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#1e1e1e]">
            <button
              onClick={() => navigate('/stations')}
              className="flex items-center gap-2 text-[#8d90a0] hover:text-white transition-colors group w-full"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#2563eb]" />
              <span className="text-xs font-bold uppercase tracking-widest">Back</span>
            </button>
          </div>

          <SectionLabel>Playback Cameras</SectionLabel>

          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {isLoadingCameras ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2563eb]" />
              </div>
            ) : Object.keys(groupedRecordings).length === 0 ? (
              <div className="text-center p-8">
                <AlertCircle className="w-8 h-8 text-[#3a3a3a] mx-auto mb-2" />
                <p className="text-[10px] text-[#8d90a0] uppercase font-bold tracking-widest">No cameras available</p>
              </div>
            ) : (
              Object.entries(groupedRecordings).map(([stationId, station]) => (
                <div key={stationId} className="space-y-1">
                  <button
                    onClick={() => toggleStation(stationId)}
                    className="w-full flex items-center justify-between p-2.5 rounded-sm bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                      <div className="text-left">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">{station.name}</span>
                        <p className="text-[8px] text-[#8d90a0] font-mono uppercase">{station.city}</p>
                      </div>
                    </div>
                    {expandedStations[stationId]
                      ? <ChevronDown className="w-3.5 h-3.5 text-[#8d90a0]" />
                      : <ChevronRight className="w-3.5 h-3.5 text-[#8d90a0]" />}
                  </button>

                  {expandedStations[stationId] && (
                    <div className="ml-3 pl-3 border-l border-[#2a2a2a] space-y-1 py-1">
                      {Object.entries(station.nvrs).map(([nvrId, nvr]) => (
                        <div key={nvrId} className="space-y-1">
                          <button
                            onClick={() => toggleNvr(nvrId)}
                            className="w-full flex items-center justify-between p-2 rounded-sm bg-[#1a1a1a]/50 hover:bg-[#1a1a1a] transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Server className="w-3.5 h-3.5 text-[#2563eb]" />
                              <span className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-wide">{nvr.name}</span>
                            </div>
                            {expandedNvrs[nvrId]
                              ? <ChevronDown className="w-3 h-3 text-[#8d90a0]" />
                              : <ChevronRight className="w-3 h-3 text-[#8d90a0]" />}
                          </button>

                          {expandedNvrs[nvrId] && (
                            <div className="ml-2 space-y-1 py-1">
                              {nvr.cameras.map((camera: PlaybackCamera) => {
                                const isSelected =
                                  selectedCamera?.nvrId === camera.nvrId &&
                                  selectedCamera?.channel === camera.channel;
                                return (
                                  <button
                                    key={`${camera.nvrId}-${camera.channel}`}
                                    onClick={() => handleCameraSelect(camera)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-sm transition-all ${
                                      isSelected
                                        ? 'bg-[#2563eb]/20 border border-[#2563eb]/40'
                                        : 'hover:bg-[#1e1e1e] border border-transparent'
                                    }`}
                                  >
                                    <Video className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2563eb]' : 'text-[#8d90a0]'}`} />
                                    <div className="flex flex-col items-start overflow-hidden text-left">
                                      <span className={`text-[11px] font-semibold truncate w-full ${isSelected ? 'text-white' : 'text-[#8d90a0]'}`}>
                                        {camera.cameraName}
                                      </span>
                                      <span className="text-[8px] font-mono text-[#5a5a5a] uppercase">CH{camera.channel}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#0d0d0d] relative">
          {!selectedCamera ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Film className="w-12 h-12 text-[#3a3a3a] mb-4" />
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight uppercase">
                Select camera to begin playback
              </h2>
              <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest opacity-50">
                Traverse stations and NVRs in the sidebar
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="h-16 border-b border-[#1e1e1e] bg-[#131313] flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#2563eb]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white uppercase tracking-tight">{selectedCamera.name}</h1>
                    <p className="text-[10px] font-mono text-[#8d90a0] uppercase tracking-widest">
                      CH{selectedCamera.channel.toString().padStart(2, '0')} - PLAYBACK MODE
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-[#8d90a0] uppercase tracking-widest">Select Date:</span>
                  <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 focus-within:border-[#2563eb] transition-colors">
                    <Calendar className="w-4 h-4 text-[#2563eb]" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => handleDateChange(e.target.value)}
                      className="bg-transparent text-white text-sm font-bold uppercase tracking-wider outline-none [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Player */}
              <div className="flex-1 min-h-0 h-0 bg-black flex items-center justify-center relative">
                {activeStream ? (
                  <PlaybackVideoPlayer
                    key={activeStream.streamUrl}
                    streamUrl={activeStream.streamUrl}
                    streamStartMs={activeStream.streamStartMs}
                    segmentStartMs={activeStream.recordingStartMs}
                    segmentEndMs={activeStream.recordingEndMs}
                    durationSeconds={activeStream.durationSeconds}
                    playbackSpeed={playbackSpeed}
                    onPlaybackSpeedChange={setPlaybackSpeed}
                    onSeekToAbsolute={handleSeekbarJump}
                    onTimeUpdate={setCurrentAbsoluteMs}
                  />
                ) : (
                  <div className="text-center">
                    <Play className="w-12 h-12 text-[#2563eb] mb-4 mx-auto" />
                    <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest">
                      Select footage or time to start playback
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <PlaybackTimeline
                dateStr={selectedDate}
                recordings={recordings || []}
                currentAbsoluteMs={currentAbsoluteMs}
                onSeek={handleTimelineJump}
                className="h-32 shrink-0"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}