import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { SectionLabel } from '../components/SectionLabel';
import { useRecordingCameras, useRecordings, getRecordingStreamUrl } from '../features/recordings/useRecordings';
import { AuthenticatedVideo } from '../features/recordings/AuthenticatedVideo';
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
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';

export default function PlaybackPage() {
  const navigate = useNavigate();
  const [selectedCamera, setSelectedCamera] = useState<{ nvrId: string; channel: number; name: string } | null>(null);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  
  const { data: cameras, isLoading: isLoadingCameras } = useRecordingCameras();
  const { data: recordings, isLoading: isLoadingRecordings } = useRecordings(
    selectedCamera?.nvrId || null, 
    selectedCamera?.channel ?? null
  );

  const selectedRecording = recordings?.find(r => r.id === selectedRecordingId);

  /**
   * Builds a descriptive filename: CameraName_YYYY-MM-DD_HH-MM_to_HH-MM.mp4
   */
  const buildFileName = (rec: any): string => {
    const camName = (selectedCamera?.name || 'Camera').replace(/\s+/g, '_');
    const start = new Date(rec.startTime);
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
    return `${camName}_${date}.mp4`;
  };

  const handleDownload = async (rec: any) => {
    const fileName = buildFileName(rec);
    try {
      const res = await api.get(`/recordings/stream/${rec.id}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden">
      <Topbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Cameras with recordings */}
        <div className="w-72 bg-[#131313] border-r border-[#2a2a2a] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#2a2a2a]">
            <button
              onClick={() => navigate('/stations')}
              className="flex items-center gap-2 text-[#8d90a0] hover:text-white transition-colors group w-full"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#2563eb]" />
              <span className="text-xs font-bold uppercase tracking-widest">Back</span>
            </button>
          </div>

          <SectionLabel>Cameras with Records</SectionLabel>
          
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
            {isLoadingCameras ? (
              <div className="flex items-center justify-center p-8 text-[#383838]">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2563eb]"></div>
              </div>
            ) : cameras?.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-[#383838] uppercase font-bold tracking-widest">No recordings found</p>
              </div>
            ) : (
              cameras?.map((cam: any) => {
                const isSelected = selectedCamera?.nvrId === cam.nvrId && selectedCamera?.channel === cam.channel;
                
                return (
                  <button
                    key={`${cam.nvrId}-${cam.channel}`}
                    onClick={() => {
                      setSelectedCamera({ nvrId: cam.nvrId, channel: cam.channel, name: cam.cameraName });
                      setSelectedRecordingId(null);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-[2px] transition-all group ${
                      isSelected
                        ? 'bg-[#2563eb]/10 border border-[#2563eb]/30 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                        : 'border border-transparent hover:bg-[#1e1e1e]'
                    }`}
                  >
                    <div className={`p-2 rounded-sm ${
                      isSelected
                        ? 'bg-[#2563eb] text-white'
                        : 'bg-[#1a1a1a] text-[#8d90a0]'
                    }`}>
                      <Video className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-start overflow-hidden text-left">
                      <span className={`text-sm font-semibold truncate w-full ${
                        isSelected ? 'text-white' : 'text-[#e5e2e1]'
                      }`}>
                        {cam.cameraName}
                      </span>
                      <span className="text-[10px] font-mono text-[#8d90a0] uppercase">
                        {cam.nvr?.name || 'Unknown NVR'} • CH{cam.channel}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Storage Stats Footer */}
          <div className="p-4 border-t border-[#2a2a2a] bg-[#0d0d0d]/50">
             <div className="flex items-center gap-2 mb-2">
               <HardDrive className="w-3.5 h-3.5 text-[#2563eb]" />
               <span className="text-[10px] font-bold text-white uppercase tracking-wider">Storage System</span>
             </div>
             <div className="h-1.5 w-full bg-[#1e1e1e] rounded-full overflow-hidden mb-1">
               <div className="h-full bg-[#2563eb] w-[45%]" />
             </div>
             <div className="flex justify-between text-[9px] font-mono text-[#8d90a0]">
               <span>450GB USED</span>
               <span>1TB TOTAL</span>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-[#0d0d0d] relative">
          {!selectedCamera ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="p-6 rounded-full bg-[#131313] border border-[#1e1e1e] mb-4">
                <Film className="w-12 h-12 text-[#383838]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Select a camera to view recordings</h2>
              <p className="text-[#8d90a0] text-sm max-w-md text-center px-6">
                Choose a camera from the sidebar to browse through its history and playback saved footage clips.
              </p>
            </div>
          ) : (
            <>
              {/* Header with Camera Info */}
              <div className="h-16 border-b border-[#1e1e1e] bg-[#131313]/50 flex items-center justify-between px-6 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#2563eb]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white leading-none">{selectedCamera.name}</h1>
                    <p className="text-[10px] font-mono text-[#8d90a0] uppercase tracking-widest mt-1">
                      CH{selectedCamera.channel.toString().padStart(2, '0')} • PLAYBACK MODE
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#1a1a1a] border border-[#2a2a2a] text-[#8d90a0]">
                     <Calendar className="w-3.5 h-3.5" />
                     <span className="text-xs font-semibold">{format(new Date(), 'MMM dd, yyyy')}</span>
                   </div>
                </div>
              </div>

              {/* Player and Timeline Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Player Area */}
                <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative group">
                  {selectedRecordingId ? (
                    <>
                      <AuthenticatedVideo
                        key={selectedRecordingId}
                        recordingId={selectedRecordingId}
                        className="max-h-full max-w-full"
                      />
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                          size="sm"
                          className="bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur-md"
                          onClick={() => handleDownload(selectedRecording)}
                         >
                           <Download className="w-4 h-4 mr-2" />
                           Download
                         </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="p-4 rounded-full bg-[#131313] border border-[#1e1e1e] mb-4 mx-auto w-fit">
                        <Play className="w-8 h-8 text-[#2563eb]" />
                      </div>
                      <p className="text-[#8d90a0] text-sm font-semibold">Select a clip from below to start playback</p>
                    </div>
                  )}
                </div>

                {/* Clips Timeline/List Area */}
                <div className="h-[300px] bg-[#131313] border-t border-[#1e1e1e] flex flex-col shrink-0">
                  <div className="px-6 py-3 border-b border-[#1e1e1e] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-[#2563eb]" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Footage Clips</h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#8d90a0] uppercase">{recordings?.length || 0} Recorded Sessions Found</span>
                  </div>

                  <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                    <div className="flex gap-4 min-w-max h-full items-start">
                      {isLoadingRecordings ? (
                        <div className="w-full flex items-center justify-center p-12">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
                        </div>
                      ) : recordings?.length === 0 ? (
                        <div className="w-full flex flex-col items-center justify-center p-12 text-[#383838]">
                          <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-xs uppercase font-bold tracking-widest">No recordings for this period</p>
                        </div>
                      ) : (
                        recordings?.map((rec: any) => (
                          <button
                            key={rec.id}
                            onClick={() => setSelectedRecordingId(rec.id)}
                            className={`w-56 group/card h-full flex flex-col rounded-sm border transition-all overflow-hidden relative shrink-0 ${
                              selectedRecordingId === rec.id
                                ? 'bg-[#2563eb]/10 border-[#2563eb] shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#383838]'
                            }`}
                          >
                            {/* Fake Thumbnail */}
                            <div className="aspect-video bg-black/50 overflow-hidden relative">
                              <div className="absolute inset-0 flex items-center justify-center group-hover/card:scale-110 transition-transform duration-500">
                                <Film className="w-8 h-8 text-white/5 opacity-40" />
                              </div>
                              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded-[2px] text-[9px] font-mono text-white">
                                {rec.duration}s
                              </div>
                              {selectedRecordingId === rec.id && (
                                <div className="absolute inset-0 bg-[#2563eb]/20 flex items-center justify-center">
                                  <div className="p-2 rounded-full bg-[#2563eb] text-white shadow-lg scale-110">
                                    <Play className="w-4 h-4 fill-current" />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="p-3 flex-1 flex flex-col justify-between">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-3 h-3 text-[#2563eb]" />
                                <span className="text-[11px] font-bold text-white">
                                  {format(new Date(rec.startTime), 'HH:mm:ss')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-auto">
                                <span className="text-[9px] font-mono text-[#8d90a0] uppercase">
                                  {Math.round(rec.fileSize / 1024 / 1024)} MB
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-[#8d90a0] hover:text-white hover:bg-white/5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(rec);
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
