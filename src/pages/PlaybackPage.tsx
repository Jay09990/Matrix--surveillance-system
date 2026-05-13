import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { SectionLabel } from '../components/SectionLabel';
import { 
  useRecordingCameras, 
  useRecordings, 
  useRecordingTimeline, 
  useRecordingDays 
} from '../features/recordings/useRecordings';
import { AuthenticatedVideo } from '../features/recordings/AuthenticatedVideo';
import { apiService } from '../services/api';
import { api } from '../lib/axios';
import { 
  ArrowLeft, 
  Video, 
  Calendar, 
  Clock, 
  HardDrive, 
  Download, 
  Play,
  Film,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
  MapPin,
  Server
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import type { RecordingCamera } from '../types/recording';

export default function PlaybackPage() {
  const navigate = useNavigate();
  const [selectedCamera, setSelectedCamera] = useState<{ nvrId: string; channel: number; name: string } | null>(null);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [seekTime, setSeekTime] = useState<string>('');
  const [offsetSeconds, setOffsetSeconds] = useState<number>(0);
  const [seekError, setSeekError] = useState<string | null>(null);

  // Sidebar expansion state
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({});
  const [expandedNvrs, setExpandedNvrs] = useState<Record<string, boolean>>({});
  
  const { data: cameras, isLoading: isLoadingCameras } = useRecordingCameras();
  const { data: availableDays } = useRecordingDays(selectedCamera?.nvrId || null, selectedCamera?.channel || null);
  
  // Group cameras by Station -> NVR
  const groupedRecordings = useMemo(() => {
    if (!cameras) return {};
    
    const stations: any = {};
    
    cameras.forEach((cam: RecordingCamera) => {
      const stationId = cam.nvr?.station?.id || 'unknown-station';
      const nvrId = cam.nvr?.id || 'unknown-nvr';
      
      if (!stations[stationId]) {
        stations[stationId] = {
          name: cam.nvr?.station?.name || 'Unknown Station',
          city: cam.nvr?.station?.city || 'Unknown Location',
          nvrs: {}
        };
      }
      
      if (!stations[stationId].nvrs[nvrId]) {
        stations[stationId].nvrs[nvrId] = {
          name: cam.nvr?.name || 'Unknown NVR',
          cameras: []
        };
      }
      
      stations[stationId].nvrs[nvrId].cameras.push(cam);
    });
    
    return stations;
  }, [cameras]);

  const toggleStation = (id: string) => {
    setExpandedStations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleNvr = (id: string) => {
    setExpandedNvrs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate the date range for the selected day
  const dateRange = {
    from: `${selectedDate}T00:00:00.000Z`,
    to: `${selectedDate}T23:59:59.999Z`
  };

  const { data: recordings, isLoading: isLoadingRecordings } = useRecordings(
    selectedCamera?.nvrId || null, 
    selectedCamera?.channel ?? null,
    dateRange
  );

  const { data: timeline } = useRecordingTimeline(
    selectedCamera?.nvrId || null,
    selectedCamera?.channel ?? null,
    selectedDate
  );
  
  const [customTime, setCustomTime] = useState<string>('12:00');
  const [customDuration, setCustomDuration] = useState<number>(30); // minutes
  const [isExporting, setIsExporting] = useState(false);
  const [customRecordingUrl, setCustomRecordingUrl] = useState<string | null>(null);

  const selectedRecording = recordings?.find(r => r.id === selectedRecordingId);

  const handleDownload = async (rec: any) => {
    try {
      const res = await api.get(`/recordings/stream/${rec.id}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', rec.filename || 'recording.mp4');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleCustomExport = async () => {
    if (!selectedCamera) return;
    setIsExporting(true);
    try {
      const startIso = `${selectedDate}T${customTime}:00.000Z`;
      const durationSeconds = customDuration * 60;
      
      const res = await apiService.recordings.export(
        selectedCamera.nvrId,
        selectedCamera.channel,
        startIso,
        durationSeconds
      );
      
      const url = URL.createObjectURL(res.data);
      if (customRecordingUrl) URL.revokeObjectURL(customRecordingUrl);
      setCustomRecordingUrl(url);
      setSelectedRecordingId('custom');
    } catch (err) {
      console.error('Custom export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera || !seekTime) return;
    
    setSeekError(null);
    try {
      const timestamp = `${selectedDate}T${seekTime}:00Z`;
      const { data } = await apiService.recordings.seek(
        selectedCamera.nvrId,
        selectedCamera.channel,
        timestamp
      );
      
      if (data && data.id) {
        setSelectedRecordingId(data.id);
        setOffsetSeconds(data.offsetSeconds);
      } else {
        setSeekError('No recording found at this time');
      }
    } catch (err) {
      setSeekError('Failed to seek recording');
      console.error('Seek failed:', err);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden font-sans">
      <Topbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
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

          <SectionLabel>Recording History</SectionLabel>
          
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {isLoadingCameras ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2563eb]"></div>
              </div>
            ) : Object.keys(groupedRecordings).length === 0 ? (
              <div className="text-center p-8">
                <AlertCircle className="w-8 h-8 text-[#3a3a3a] mx-auto mb-2" />
                <p className="text-[10px] text-[#8d90a0] uppercase font-bold tracking-widest">No cameras with records</p>
              </div>
            ) : (
              Object.entries(groupedRecordings).map(([stationId, station]: [string, any]) => (
                <div key={stationId} className="space-y-1">
                  {/* Station Level */}
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

                  {/* NVRs Level */}
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

                          {/* Cameras Level */}
                          {expandedNvrs[nvrId] && (
                            <div className="ml-2 space-y-1 py-1">
                              {nvr.cameras.map((cam: RecordingCamera) => {
                                const isSelected = selectedCamera?.nvrId === cam.nvrId && selectedCamera?.channel === cam.channel;
                                return (
                                  <button
                                    key={`${cam.nvrId}-${cam.channel}`}
                                    onClick={() => {
                                      setSelectedCamera({ nvrId: cam.nvrId, channel: cam.channel, name: cam.cameraName });
                                      setSelectedRecordingId(null);
                                      setOffsetSeconds(0);
                                    }}
                                    className={`w-full flex items-center gap-3 p-2 rounded-sm transition-all group ${
                                      isSelected
                                        ? 'bg-[#2563eb]/20 border border-[#2563eb]/40'
                                        : 'hover:bg-[#1e1e1e] border border-transparent'
                                    }`}
                                  >
                                    <Video className={`w-3.5 h-3.5 ${isSelected ? 'text-[#2563eb]' : 'text-[#8d90a0]'}`} />
                                    <div className="flex flex-col items-start overflow-hidden text-left">
                                      <span className={`text-[11px] font-semibold truncate w-full ${isSelected ? 'text-white' : 'text-[#8d90a0]'}`}>
                                        {cam.cameraName}
                                      </span>
                                      <span className="text-[8px] font-mono text-[#5a5a5a] uppercase">CH{cam.channel}</span>
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#0d0d0d] relative">
          {!selectedCamera ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Film className="w-12 h-12 text-[#3a3a3a] mb-4" />
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight uppercase">Select camera to begin playback</h2>
              <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest opacity-50">Traverse stations and NVRs in the sidebar</p>
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
                      CH{selectedCamera.channel.toString().padStart(2, '0')} • PLAYBACK MODE
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
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
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setSelectedRecordingId(null);
                          setOffsetSeconds(0);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        min={availableDays?.days?.[0]}
                        max={availableDays?.days?.[availableDays.days.length - 1]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Player Area */}
              <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative group">
                {selectedRecordingId ? (
                  <>
                    {selectedRecordingId === 'custom' ? (
                      <video src={customRecordingUrl!} controls autoPlay crossOrigin="anonymous" className="max-h-full max-w-full" />
                    ) : (
                      <AuthenticatedVideo
                        key={`${selectedRecordingId}-${offsetSeconds}`}
                        recordingId={selectedRecordingId}
                        offsetSeconds={offsetSeconds}
                        className="max-h-full max-w-full"
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <Play className="w-12 h-12 text-[#2563eb] mb-4 mx-auto" />
                    <p className="text-[#8d90a0] text-xs font-bold uppercase tracking-widest">Select a clip or time to start playback</p>
                  </div>
                )}
              </div>

              {/* Timeline & Controls */}
              <div className="bg-[#131313] border-t border-[#1e1e1e] p-4 space-y-4">
                {/* Seek Bar */}
                <div className="flex items-center justify-between gap-4">
                  <form onSubmit={handleSeek} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#8d90a0] uppercase">Jump to:</span>
                    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1">
                      <Calendar className="w-3 h-3 text-[#2563eb]" />
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent text-white text-[11px] font-mono outline-none [color-scheme:dark] w-28"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1">
                      <Clock className="w-3 h-3 text-[#2563eb]" />
                      <input 
                        type="time" 
                        value={seekTime}
                        onChange={(e) => setSeekTime(e.target.value)}
                        className="bg-transparent text-white text-xs font-mono outline-none [color-scheme:dark]"
                      />
                    </div>
                    <Button type="submit" size="sm" className="bg-[#2563eb] h-7 text-[10px] uppercase font-bold">
                      <Search className="w-3 h-3 mr-1" /> Go
                    </Button>
                    {seekError && <span className="text-[10px] text-[#e03e3e] font-bold uppercase">{seekError}</span>}
                  </form>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#8d90a0] uppercase">Export Range:</span>
                    <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1 text-white text-xs font-mono outline-none [color-scheme:dark]" />
                    <select value={customDuration} onChange={(e) => setCustomDuration(Number(e.target.value))} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-2 py-1 text-white text-xs font-mono outline-none">
                      <option value={5}>5m</option>
                      <option value={15}>15m</option>
                      <option value={30}>30m</option>
                    </select>
                    <Button onClick={handleCustomExport} disabled={isExporting} size="sm" className="bg-[#2563eb] h-7 text-[10px] uppercase font-bold">
                      {isExporting ? '...' : 'Export'}
                    </Button>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="relative h-8 bg-[#0d0d0d] rounded-sm border border-[#1e1e1e] overflow-hidden group/timeline">
                  {/* Hour markers */}
                  <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className="h-full w-px bg-[#1e1e1e] relative">
                        {i % 4 === 0 && (
                          <span className="absolute top-1 left-1 text-[8px] font-mono text-[#3a3a3a]">
                            {i.toString().padStart(2, '0')}:00
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Coverage Segments */}
                  {timeline?.map((seg: any) => {
                    const start = new Date(seg.startTime);
                    const end = seg.endTime ? new Date(seg.endTime) : new Date();
                    
                    const startSeconds = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
                    const endSeconds = end.getHours() * 3600 + end.getMinutes() * 60 + end.getSeconds();
                    
                    const left = (startSeconds / 86400) * 100;
                    const width = ((endSeconds - startSeconds) / 86400) * 100;

                    return (
                      <button
                        key={seg.id}
                        onClick={() => {
                          setSelectedRecordingId(seg.id);
                          setOffsetSeconds(0);
                        }}
                        className="absolute top-0 h-full bg-[#2563eb]/40 border-x border-[#2563eb]/20 hover:bg-[#2563eb] transition-colors z-10"
                        style={{ left: `${left}%`, width: `${Math.max(width, 0.2)}%` }}
                        title={`${format(start, 'HH:mm:ss')} - ${format(end, 'HH:mm:ss')}`}
                      />
                    );
                  })}
                </div>

                {/* Clips List */}
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {isLoadingRecordings ? (
                    <div className="animate-pulse flex gap-4">
                      {[1, 2, 3].map(i => <div key={i} className="w-56 h-32 bg-[#1a1a1a] rounded-sm" />)}
                    </div>
                  ) : recordings?.length === 0 ? (
                    <div className="w-full text-center py-8">
                      <p className="text-xs font-bold text-[#3a3a3a] uppercase tracking-widest">No footage for this date</p>
                    </div>
                  ) : (
                    recordings?.map((rec: any) => (
                      <button
                        key={rec.id}
                        onClick={() => {
                          setSelectedRecordingId(rec.id);
                          setOffsetSeconds(0);
                        }}
                        className={`w-56 shrink-0 flex flex-col rounded-sm border transition-all overflow-hidden ${
                          selectedRecordingId === rec.id
                            ? 'bg-[#2563eb]/10 border-[#2563eb]'
                            : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]'
                        }`}
                      >
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                          <Film className="w-8 h-8 text-[#1a1a1a]" />
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded-[2px] text-[9px] font-mono text-white">
                            {rec.durationSeconds}s
                          </div>
                        </div>
                        <div className="p-3 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3 h-3 text-[#2563eb]" />
                            <span className="text-[11px] font-bold text-white font-mono">
                              {format(new Date(rec.startTime), 'HH:mm:ss')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] font-mono text-[#8d90a0] uppercase">
                              {(Number(rec.sizeBytes) / 1024 / 1024).toFixed(1)} MB
                            </span>
                            <Download 
                              className="w-3 h-3 text-[#8d90a0] hover:text-white" 
                              onClick={(e) => { e.stopPropagation(); handleDownload(rec); }}
                            />
                          </div>
                        </div>
                      </button>
                    ))
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
