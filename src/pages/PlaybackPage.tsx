import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Film,
  MapPin,
  Play,
  Search,
  Server,
  Video,
} from 'lucide-react';
import { Topbar } from '../components/Topbar';
import { SectionLabel } from '../components/SectionLabel';
import { Button } from '../components/ui/button';
import { PlaybackWhepPlayer } from '../features/recordings/AuthenticatedVideo';
import { usePlaybackCameras, usePlaybackRecordings } from '../features/recordings/useRecordings';
import { apiService } from '../services/api';
import type { PlaybackCamera, PlaybackRecording } from '../types/playback';

interface SelectedPlaybackCamera {
  nvrId: string;
  channel: number;
  name: string;
}

interface ActivePlaybackSession {
  whepUrl: string;
  pathName: string;
}

const DEFAULT_SEEK_WINDOW_MINUTES = 5;
const SECONDS_PER_DAY = 86400;

/**
 * NVR-backed playback page that resolves recordings into temporary WHEP sessions.
 */
export default function PlaybackPage() {
  const navigate = useNavigate();
  const activePathRef = useRef<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<SelectedPlaybackCamera | null>(null);
  const [selectedRecordingKey, setSelectedRecordingKey] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [seekTime, setSeekTime] = useState<string>('');
  const [seekError, setSeekError] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState<string>('12:00');
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [isResolving, setIsResolving] = useState(false);
  const [activeSession, setActiveSession] = useState<ActivePlaybackSession | null>(null);

  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});
  const [expandedNvrs, setExpandedNvrs] = useState<Record<string, boolean>>({});

  const { data: cameras, isLoading: isLoadingCameras } = usePlaybackCameras();
  const { data: recordings, isLoading: isLoadingRecordings } = usePlaybackRecordings(
    selectedCamera?.nvrId || null,
    selectedCamera?.channel ?? null,
    selectedDate
  );

  const groupedRecordings = useMemo(() => {
    if (!cameras) return {};

    return cameras.reduce<Record<string, any>>((stations, camera) => {
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

  useEffect(() => {
    return () => {
      void stopActivePlayback();
    };
  }, []);

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

  async function startPlayback(startTime: string, endTime: string, recordingKey: string) {
    if (!selectedCamera) return;

    setIsResolving(true);
    setSeekError(null);

    try {
      await stopActivePlayback();
      const { data } = await apiService.playback.resolve({
        nvrId: selectedCamera.nvrId,
        channel: selectedCamera.channel,
        startTime,
        endTime,
      });

      activePathRef.current = data.pathName;
      setActiveSession(data);
      setSelectedRecordingKey(recordingKey);
    } catch (error) {
      console.error('[PlaybackPage] Failed to resolve playback:', error);
      setSeekError('Failed to start playback for this range');
      setActiveSession(null);
      setSelectedRecordingKey(null);
    } finally {
      setIsResolving(false);
    }
  }

  async function handleCameraSelect(camera: PlaybackCamera) {
    await stopActivePlayback();
    setSelectedCamera({ nvrId: camera.nvrId, channel: camera.channel, name: camera.cameraName });
    setSelectedRecordingKey(null);
    setActiveSession(null);
    setSeekError(null);
  }

  async function handleDateChange(date: string) {
    await stopActivePlayback();
    setSelectedDate(date);
    setSelectedRecordingKey(null);
    setActiveSession(null);
    setSeekError(null);
  }

  async function handleSeek(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedCamera || !seekTime) return;

    const startTime = `${selectedDate}T${seekTime}:00Z`;
    const endTime = addMinutes(startTime, DEFAULT_SEEK_WINDOW_MINUTES);
    await startPlayback(startTime, endTime, `seek-${startTime}`);
  }

  async function handleRangePlayback() {
    if (!selectedCamera) return;

    const startTime = `${selectedDate}T${customTime}:00Z`;
    const endTime = addMinutes(startTime, customDuration);
    await startPlayback(startTime, endTime, `range-${startTime}-${customDuration}`);
  }

  const toggleStation = (id: string) => {
    setExpandedStations((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  const toggleNvr = (id: string) => {
    setExpandedNvrs((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden font-sans">
      <Topbar />

      <div className="flex-1 flex overflow-hidden">
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
              Object.entries(groupedRecordings).map(([stationId, station]: [string, any]) => (
                <div key={stationId} className="space-y-1">
                  <button
                    onClick={() => toggleStation(stationId)}
                    className="w-full flex items-center justify-between p-2.5 rounded-sm bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                      <div className="text-left">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">{station.name}</span>
                        <p className="text-[8px] text-[#8d90a0] font-mono uppercase">{station.city}</p>
                      </div>
                    </div>
                    {expandedStations[stationId] ? <ChevronDown className="w-3.5 h-3.5 text-[#8d90a0]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#8d90a0]" />}
                  </button>

                  {expandedStations[stationId] && (
                    <div className="ml-3 pl-3 border-l border-[#2a2a2a] space-y-1 py-1">
                      {Object.entries(station.nvrs).map(([nvrId, nvr]: [string, any]) => (
                        <div key={nvrId} className="space-y-1">
                          <button
                            onClick={() => toggleNvr(nvrId)}
                            className="w-full flex items-center justify-between p-2 rounded-sm bg-[#1a1a1a]/50 hover:bg-[#1a1a1a] transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <Server className="w-3.5 h-3.5 text-[#2563eb]" />
                              <span className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-wide">{nvr.name}</span>
                            </div>
                            {expandedNvrs[nvrId] ? <ChevronDown className="w-3 h-3 text-[#8d90a0]" /> : <ChevronRight className="w-3 h-3 text-[#8d90a0]" />}
                          </button>

                          {expandedNvrs[nvrId] && (
                            <div className="ml-2 space-y-1 py-1">
                              {nvr.cameras.map((camera: PlaybackCamera) => {
                                const isSelected = selectedCamera?.nvrId === camera.nvrId && selectedCamera?.channel === camera.channel;

                                return (
                                  <button
                                    key={`${camera.nvrId}-${camera.channel}`}
                                    onClick={() => void handleCameraSelect(camera)}
                                    className={`w-full flex items-center gap-3 p-2 rounded-sm transition-all group ${
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

        <div className="flex-1 flex flex-col bg-[#0d0d0d] relative">
          {!selectedCamera ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Film className="w-12 h-12 text-[#3a3a3a] mb-4" />
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight uppercase">Select camera to begin playback</h2>
              <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest opacity-50">Traverse stations and NVRs in the sidebar</p>
            </div>
          ) : (
            <>
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
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#8d90a0] hover:text-white hover:border-[#3a3a3a] transition-all group-hover:bg-[#1f1f1f]">
                      <Calendar className="w-4 h-4 text-[#2563eb]" />
                      <span className="text-sm font-bold uppercase tracking-wider">
                        {format(new Date(selectedDate), 'MMM dd, yyyy')}
                      </span>
                    </button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => void handleDateChange(event.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative group">
                {isResolving ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-[#2563eb]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">Resolving playback...</span>
                  </div>
                ) : activeSession ? (
                  <PlaybackWhepPlayer
                    key={activeSession.pathName}
                    whepUrl={activeSession.whepUrl}
                    className="max-h-full max-w-full bg-black"
                  />
                ) : (
                  <div className="text-center">
                    <Play className="w-12 h-12 text-[#2563eb] mb-4 mx-auto" />
                    <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest">Select footage or time to start playback</p>
                  </div>
                )}
              </div>

              <div className="bg-[#131313] border-t border-[#1e1e1e] p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <form onSubmit={handleSeek} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#8d90a0] uppercase">Jump to:</span>
                    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1">
                      <Calendar className="w-3 h-3 text-[#2563eb]" />
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => void handleDateChange(event.target.value)}
                        className="bg-transparent text-white text-[11px] font-mono outline-none [color-scheme:dark] w-28"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1">
                      <Clock className="w-3 h-3 text-[#2563eb]" />
                      <input
                        type="time"
                        value={seekTime}
                        onChange={(event) => setSeekTime(event.target.value)}
                        className="bg-transparent text-white text-xs font-mono outline-none [color-scheme:dark]"
                      />
                    </div>
                    <Button type="submit" disabled={isResolving} size="sm" className="bg-[#2563eb] h-7 text-[10px] uppercase font-bold">
                      <Search className="w-3 h-3 mr-1" /> Go
                    </Button>
                    {seekError && <span className="text-[10px] text-[#e03e3e] font-bold uppercase">{seekError}</span>}
                  </form>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#8d90a0] uppercase">Playback Range:</span>
                    <input type="time" value={customTime} onChange={(event) => setCustomTime(event.target.value)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1 text-white text-xs font-mono outline-none [color-scheme:dark]" />
                    <select value={customDuration} onChange={(event) => setCustomDuration(Number(event.target.value))} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1 text-white text-xs font-mono outline-none">
                      <option value={5}>5m</option>
                      <option value={15}>15m</option>
                      <option value={30}>30m</option>
                    </select>
                    <Button onClick={() => void handleRangePlayback()} disabled={isResolving} size="sm" className="bg-[#2563eb] h-7 text-[10px] uppercase font-bold">
                      Play
                    </Button>
                  </div>
                </div>

                <div className="relative h-8 bg-[#0d0d0d] rounded-sm border border-[#1e1e1e] overflow-hidden group/timeline">
                  <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <div key={index} className="h-full w-px bg-[#1e1e1e] relative">
                        {index % 4 === 0 && (
                          <span className="absolute top-1 left-1 text-[8px] font-mono text-[#3a3a3a]">
                            {index.toString().padStart(2, '0')}:00
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {recordings?.map((recording, index) => {
                    const endTime = getRecordingEndTime(recording);
                    if (!endTime) return null;

                    const start = new Date(recording.startTime);
                    const end = new Date(endTime);
                    const startSeconds = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
                    const endSeconds = end.getHours() * 3600 + end.getMinutes() * 60 + end.getSeconds();
                    const left = (startSeconds / SECONDS_PER_DAY) * 100;
                    const width = ((endSeconds - startSeconds) / SECONDS_PER_DAY) * 100;
                    const recordingKey = getRecordingKey(recording, index);

                    return (
                      <button
                        key={recordingKey}
                        onClick={() => void startPlayback(recording.startTime, endTime, recordingKey)}
                        className="absolute top-0 h-full bg-[#2563eb]/40 border-x border-[#2563eb]/20 hover:bg-[#2563eb] transition-colors z-10"
                        style={{ left: `${left}%`, width: `${Math.max(width, 0.2)}%` }}
                        title={`${format(start, 'HH:mm:ss')} - ${format(end, 'HH:mm:ss')}`}
                      />
                    );
                  })}
                </div>

                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {isLoadingRecordings ? (
                    <div className="animate-pulse flex gap-4">
                      {[1, 2, 3].map((index) => <div key={index} className="w-56 h-32 bg-[#1a1a1a] rounded-sm" />)}
                    </div>
                  ) : recordings?.length === 0 ? (
                    <div className="w-full text-center py-8">
                      <p className="text-xs font-bold text-[#3a3a3a] uppercase tracking-widest">No footage for this date</p>
                    </div>
                  ) : (
                    recordings?.map((recording, index) => {
                      const endTime = getRecordingEndTime(recording);
                      const recordingKey = getRecordingKey(recording, index);
                      const isSelected = selectedRecordingKey === recordingKey;

                      return (
                        <button
                          key={recordingKey}
                          disabled={!endTime || isResolving}
                          onClick={() => endTime && void startPlayback(recording.startTime, endTime, recordingKey)}
                          className={`w-56 shrink-0 flex flex-col rounded-sm border transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected
                              ? 'bg-[#2563eb]/10 border-[#2563eb]'
                              : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
                          }`}
                        >
                          <div className="aspect-video bg-black flex items-center justify-center relative">
                            <Film className="w-8 h-8 text-[#1a1a1a]" />
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded-[2px] text-[9px] font-mono text-white">
                              {formatDuration(recording)}
                            </div>
                          </div>
                          <div className="p-3 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-3 h-3 text-[#2563eb]" />
                              <span className="text-[11px] font-bold text-white font-mono">
                                {format(new Date(recording.startTime), 'HH:mm:ss')}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-[#8d90a0] uppercase">
                              {formatSize(recording.sizeBytes)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function addMinutes(timestamp: string, minutes: number) {
  return new Date(new Date(timestamp).getTime() + minutes * 60 * 1000).toISOString();
}

function getRecordingKey(recording: PlaybackRecording, index: number) {
  return recording.id || recording.pathName || `${recording.startTime}-${index}`;
}

function getRecordingEndTime(recording: PlaybackRecording) {
  if (recording.endTime) return recording.endTime;
  if (recording.durationSeconds) {
    return new Date(new Date(recording.startTime).getTime() + recording.durationSeconds * 1000).toISOString();
  }

  return null;
}

function formatDuration(recording: PlaybackRecording) {
  if (recording.durationSeconds) return `${recording.durationSeconds}s`;
  const endTime = getRecordingEndTime(recording);
  if (!endTime) return 'N/A';

  const seconds = Math.max(0, Math.round((new Date(endTime).getTime() - new Date(recording.startTime).getTime()) / 1000));
  return `${seconds}s`;
}

function formatSize(sizeBytes: PlaybackRecording['sizeBytes']) {
  if (sizeBytes === null || sizeBytes === undefined) return 'NVR storage';

  const bytes = Number(sizeBytes);
  if (!Number.isFinite(bytes)) return 'NVR storage';

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
