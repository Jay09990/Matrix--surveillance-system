import { useEffect, useMemo, useRef, useState } from 'react';
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
import { PlaybackHlsPlayer } from '../features/recordings/PlaybackHlsPlayer';
import { PlaybackTimeline } from '../features/recordings/PlaybackTimeline';
import { usePlaybackCameras, usePlaybackRecordings } from '../features/recordings/useRecordings';
import { apiService } from '../services/api';
import type { PlaybackCamera } from '../types/playback';

interface SelectedPlaybackCamera {
  nvrId: string;
  channel: number;
  name: string;
}

interface ActivePlaybackSession {
  whepUrl: string;
  hlsUrl: string;
  pathName: string;
  durationSeconds: number;

  /**
   * IMMUTABLE — the absolute window of the recording the user picked.
   * This never changes for the lifetime of "watching this recording",
   * even as the underlying HLS session gets re-resolved on seeks.
   * This is what the seekbar is scaled against.
   */
  recordingStartTime: string; // ISO 8601 UTC
  recordingEndTime: string;   // ISO 8601 UTC

  /**
   * MUTABLE — the absolute window of the CURRENT streaming session.
   * Shrinks/shifts every time a seek triggers a backend re-resolve.
   */
  sessionStartTime: string; // ISO 8601 UTC
  sessionEndTime: string;   // ISO 8601 UTC

  nvrId: string;
  channel: number;
  /** HiFocus timezone offset in ms; 0 for Hikvision */
  tzOffsetMs: number;
}

interface GroupedNvr {
  name: string;
  cameras: PlaybackCamera[];
}

interface GroupedStation {
  name: string;
  city: string;
  nvrs: Record<string, GroupedNvr>;
}

/**
 * NVR-backed playback page that resolves recordings into temporary WHEP/HLS sessions.
 *
 * IMPORTANT: the seekbar must always be scaled against the original, fixed
 * recording window (recordingStartTime -> recordingEndTime), never against
 * the current streaming session's window — that window shrinks and shifts
 * every time a seek causes a backend re-resolve.
 */
export default function PlaybackPage() {
  const navigate = useNavigate();
  const activePathRef = useRef<string | null>(null);

  const [selectedCamera, setSelectedCamera] = useState<SelectedPlaybackCamera | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isResolving, setIsResolving] = useState(false);
  const [activeSession, setActiveSession] = useState<ActivePlaybackSession | null>(null);
  const [currentAbsoluteMs, setCurrentAbsoluteMs] = useState<number | null>(null);

  /**
   * Playback speed — lives in the PAGE, not the player.
   * This is critical: when a seek causes a new HLS session to be resolved,
   * the player component remounts (new hlsUrl). If speed lived inside the
   * player it would reset to 1× on every seek. Keeping it here means the
   * player receives it as a controlled prop and reapplies it after each
   * MANIFEST_PARSED event.
   */
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});
  const [expandedNvrs, setExpandedNvrs] = useState<Record<string, boolean>>({});

  const { data: cameras, isLoading: isLoadingCameras } = usePlaybackCameras();
  const { data: recordings } = usePlaybackRecordings(
    selectedCamera?.nvrId || null,
    selectedCamera?.channel ?? null,
    selectedDate
  );

  const groupedRecordings = useMemo(() => {
    if (!cameras) return {};

    return cameras.reduce<Record<string, GroupedStation>>((stations, camera) => {
      const stationId = camera.nvr?.station?.id || 'unknown-station';
      const nvrId = camera.nvr?.id || 'unknown-nvr';

      if (!stations[stationId]) {
        stations[stationId] = {
          name: camera.nvr?.station?.name || 'Unknown Station',
          city: camera.nvr?.station?.city || 'Unknown Location',
          nvrs: {},
        };
      }

      if (!stations[stationId].nvrs[nvrId]) {
        stations[stationId].nvrs[nvrId] = {
          name: camera.nvr?.name || 'Unknown NVR',
          cameras: [],
        };
      }

      stations[stationId].nvrs[nvrId].cameras.push(camera);

      return stations;
    }, {});
  }, [cameras]);

  async function stopActivePlayback() {
    const pathName = activePathRef.current;
    if (!pathName) return;

    activePathRef.current = null;
    try {
      await apiService.playback.stop(pathName);
    } catch (error) {
      console.error('[PlaybackPage] Failed to stop playback path:', error);
    }
  }

  useEffect(() => {
    return () => {
      void stopActivePlayback();
    };
  }, []);

  async function handleCameraSelect(camera: PlaybackCamera) {
    await stopActivePlayback();
    setSelectedCamera({ nvrId: camera.nvrId, channel: camera.channel, name: camera.cameraName });
    setActiveSession(null);
    // Reset speed when switching cameras so user gets a clean state
    setPlaybackSpeed(1);
  }

  async function handleDateChange(date: string) {
    await stopActivePlayback();
    setSelectedDate(date);
    setActiveSession(null);
  }

  /**
   * Called by the player when the user seeks to a position outside the
   * current session's buffered range. Receives an ABSOLUTE epoch ms
   * timestamp computed against the fixed recordingStartTime anchor.
   */
  async function handlePlayerSeekToAbsolute(absoluteMs: number) {
    if (!recordings || !selectedCamera) return;

    // Find which recording this timestamp belongs to
    const targetRecording = recordings.find(r => {
      const start = new Date(r.startTime).getTime();
      let endMs = start + 5 * 60 * 1000;
      if (r.endTime) endMs = new Date(r.endTime).getTime();
      else if (r.durationSeconds) endMs = start + r.durationSeconds * 1000;
      return absoluteMs >= start && absoluteMs <= endMs;
    });

    if (!targetRecording) return;

    let targetEndTimeStr = targetRecording.endTime;
    if (!targetEndTimeStr) {
      if (targetRecording.durationSeconds) {
        targetEndTimeStr = new Date(
          new Date(targetRecording.startTime).getTime() + targetRecording.durationSeconds * 1000
        ).toISOString();
      } else {
        targetEndTimeStr = new Date(
          new Date(targetRecording.startTime).getTime() + 5 * 60 * 1000
        ).toISOString();
      }
    }

    // If no active session OR jumping to a different recording entirely — do a full resolve
    if (!activeSession || activeSession.recordingStartTime !== targetRecording.startTime) {
      const startTime = new Date(absoluteMs).toISOString();

      setIsResolving(true);
      try {
        await stopActivePlayback();
        const { data } = await apiService.playback.resolve({
          nvrId: selectedCamera.nvrId,
          channel: selectedCamera.channel,
          startTime,
          endTime: targetEndTimeStr,
        });

        activePathRef.current = data.pathName;
        setActiveSession({
          ...data,
          recordingStartTime: targetRecording.startTime,
          recordingEndTime: targetEndTimeStr,
          sessionStartTime: startTime,
          sessionEndTime: targetEndTimeStr,
          nvrId: selectedCamera.nvrId,
          channel: selectedCamera.channel,
          tzOffsetMs: data.tzOffsetMs ?? 0,
        });
        setCurrentAbsoluteMs(absoluteMs);
      } catch (error) {
        console.error('[PlaybackPage] Failed to resolve playback for timeline click:', error);
        setActiveSession(null);
      } finally {
        setIsResolving(false);
      }
      return;
    }

    // Same recording — use the cheaper seek endpoint (tears down old path, creates new one)
    const recordingStartMs = new Date(activeSession.recordingStartTime).getTime();
    const recordingEndMs = new Date(activeSession.recordingEndTime).getTime();
    const clampedMs = Math.max(recordingStartMs, Math.min(absoluteMs, recordingEndMs));
    const newStartTime = new Date(clampedMs).toISOString();
    const newEndTime = activeSession.recordingEndTime;

    setIsResolving(true);

    try {
      const { data } = await apiService.playback.seek({
        nvrId: activeSession.nvrId,
        channel: activeSession.channel,
        startTime: newStartTime,
        endTime: newEndTime,
        oldPathName: activeSession.pathName,
        tzOffsetMs: activeSession.tzOffsetMs,
      });

      activePathRef.current = data.pathName;

      setActiveSession(previous => {
        if (!previous) return previous;
        return {
          ...previous,
          ...data,
          // recordingStartTime / recordingEndTime intentionally NOT updated
          sessionStartTime: newStartTime,
          sessionEndTime: newEndTime,
          tzOffsetMs: data.tzOffsetMs ?? previous.tzOffsetMs,
        };
      });
    } catch (error) {
      console.error('[PlaybackPage] Seek API failed:', error);
    } finally {
      setIsResolving(false);
    }
  }

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
              Object.entries(groupedRecordings).map(([stationId, station]: [string, GroupedStation]) => (
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
                      {Object.entries(station.nvrs).map(([nvrId, nvr]: [string, GroupedNvr]) => (
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
                                    onClick={() => void handleCameraSelect(camera)}
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

        {/* ── Main content area ────────────────────────────────────────────── */}
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
              {/* Header bar */}
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
                  <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-3 py-1.5 focus-within:border-[#2563eb] transition-colors relative">
                    <Calendar className="w-4 h-4 text-[#2563eb]" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={event => void handleDateChange(event.target.value)}
                      className="bg-transparent text-white text-sm font-bold uppercase tracking-wider outline-none [color-scheme:dark] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Player area */}
              <div className="flex-1 min-h-0 h-0 bg-black flex items-center justify-center relative">
                {!activeSession && isResolving ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Resolving playback...</span>
                  </div>
                ) : activeSession ? (
                  <div className="w-full h-full flex items-center justify-center relative">
                    <PlaybackHlsPlayer
                      // Key on camera + recording start — remounts only when truly
                      // switching to a different recording/camera, NOT on every seek
                      key={`${activeSession.nvrId}-${activeSession.channel}-${activeSession.recordingStartTime}`}
                      isResolving={isResolving}
                      hlsUrl={activeSession.hlsUrl}
                      recordingStartMs={new Date(activeSession.recordingStartTime).getTime()}
                      recordingEndMs={new Date(activeSession.recordingEndTime).getTime()}
                      sessionStartMs={new Date(activeSession.sessionStartTime).getTime()}
                      sessionEndMs={new Date(activeSession.sessionEndTime).getTime()}
                      onSeekToAbsolute={absoluteMs => void handlePlayerSeekToAbsolute(absoluteMs)}
                      onTimeUpdate={setCurrentAbsoluteMs}
                      // Speed is controlled here so it survives seek-triggered remounts
                      playbackSpeed={playbackSpeed}
                      onPlaybackSpeedChange={setPlaybackSpeed}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <Play className="w-12 h-12 text-[#2563eb] mb-4 mx-auto" />
                    <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest">
                      Select footage or time to start playback
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline scrubber */}
              <PlaybackTimeline
                dateStr={selectedDate}
                recordings={recordings || []}
                currentAbsoluteMs={currentAbsoluteMs}
                onSeek={absoluteMs => void handlePlayerSeekToAbsolute(absoluteMs)}
                className="h-32 shrink-0"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}