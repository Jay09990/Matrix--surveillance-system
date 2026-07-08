import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '../components/Topbar';
import { usePlaybackRecordings, type RecordingWithMeta } from '../features/recordings/useRecordings';
import { useDownloadStore, type DownloadItem } from '../store/useDownloadStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | string | null | undefined): string {
  const n = typeof bytes === 'string' ? parseFloat(bytes) : (bytes ?? 0);
  if (!n || isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function toHHMMSS(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  } catch {
    return '00:00:00';
  }
}

function parseTimeToMs(date: string, hhmm: string): number {
  return new Date(`${date}T${hhmm}Z`).getTime();
}

function buildItemId(nvrId: string, channel: number, startTime: string) {
  return `${nvrId}-${channel}-${startTime}`;
}

function buildFilename(
  stationName: string,
  nvrName: string,
  channel: number,
  startTime: string,
): string {
  const safe = (s: string) => s.replace(/[^a-z0-9]/gi, '_');
  const ts = startTime.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
  return `${safe(stationName)}_${safe(nvrName)}_CH${channel}_${ts}.mp4`;
}

// ── Calendar grid builder ─────────────────────────────────────────────────────

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ item }: { item: DownloadItem | undefined }) {
  if (!item) return null;

  if (item.status === 'done') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Done
      </span>
    );
  }
  if (item.status === 'error') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-400" title={item.error}>
        <XCircle className="w-3 h-3" /> Error
      </span>
    );
  }
  if (item.status === 'queued') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#f59e0b]">
        <Clock className="w-3 h-3" /> Queued
      </span>
    );
  }
  if (item.status === 'paused') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#8d90a0]">
        <Pause className="w-3 h-3" />
        {item.receivedBytes > 0 ? formatBytes(item.receivedBytes) : 'Paused'}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#2563eb]">
      <Loader2 className="w-3 h-3 animate-spin" />
      {formatBytes(item.receivedBytes)}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DownloadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nvrId = searchParams.get('nvrId');
  const channelStr = searchParams.get('channel');
  const cameraName = searchParams.get('cameraName') ?? 'Unknown Camera';
  const nvrName = searchParams.get('nvrName') ?? 'Unknown NVR';
  const stationName = searchParams.get('stationName') ?? 'Unknown Station';
  const channel = channelStr ? Number(channelStr) : null;

  // Date state
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Time range filter
  const [startTime, setStartTime] = useState('00:00:00');
  const [endTime, setEndTime] = useState('23:59:59');

  // Download store
  const { queue, isDownloading, enqueue, enqueueAll, pause, resume } = useDownloadStore();

  console.log('DownloadPage Render:', { nvrId, channel, selectedDate, enabled: !!nvrId && channel !== null && !!selectedDate });

  // Data
  const { data: rawRecordings, isLoading, isError } = usePlaybackRecordings(
    nvrId,
    channel,
    selectedDate,
  );

  console.log('DownloadPage Query Result:', { rawRecordings, isLoading, isError });

  const recordings = useMemo<RecordingWithMeta[]>(() => {
    if (!rawRecordings) return [];
    return rawRecordings.map((rec) => ({
      ...rec,
      nvrId: nvrId ?? '',
      channel: channel ?? 0,
      stationName,
      nvrName,
      cameraName,
    }));
  }, [rawRecordings, nvrId, channel, stationName, nvrName, cameraName]);

  // Filtered by time range
  const filteredRecordings = useMemo<RecordingWithMeta[]>(() => {
    if (!recordings) return [];
    const startMs = parseTimeToMs(selectedDate, startTime);
    const endMs = parseTimeToMs(selectedDate, endTime);
    return recordings.filter((r) => {
      const rStart = new Date(r.startTime).getTime();
      return rStart >= startMs && rStart <= endMs;
    });
  }, [recordings, selectedDate, startTime, endTime]);

  // Close calendar on outside click
  useEffect(() => {
    if (!calendarOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [calendarOpen]);

  const now = new Date();
  const minYear = 2000;
  const maxYear = now.getFullYear();
  const maxMonth = now.getMonth() + 1;
  const canGoPrev = calendarYear > minYear || calendarMonth > 1;
  const canGoNext =
    calendarYear < maxYear || (calendarYear === maxYear && calendarMonth < maxMonth + 12);

  function navMonth(delta: number) {
    let m = calendarMonth + delta;
    let y = calendarYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    if (y < minYear) return;
    setCalendarYear(y);
    setCalendarMonth(m);
  }

  const calendarGrid = buildCalendarGrid(calendarYear, calendarMonth);

  // Build a download payload from a recording
  const buildPayload = useCallback(
    (rec: RecordingWithMeta) => {
      const endTimeIso =
        rec.endTime ??
        new Date(
          new Date(rec.startTime).getTime() + (rec.durationSeconds ?? 300) * 1000,
        ).toISOString();
      return {
        id: buildItemId(rec.nvrId, rec.channel, rec.startTime),
        nvrId: rec.nvrId,
        channel: rec.channel,
        startTime: rec.startTime,
        endTime: endTimeIso,
        stationName: rec.stationName,
        nvrName: rec.nvrName,
        filename: buildFilename(rec.stationName, rec.nvrName, rec.channel, rec.startTime),
        sizeBytes:
          rec.sizeBytes != null
            ? typeof rec.sizeBytes === 'string'
              ? parseFloat(rec.sizeBytes)
              : rec.sizeBytes
            : null,
      };
    },
    [],
  );

  function handleDownloadOne(rec: RecordingWithMeta) {
    enqueue(buildPayload(rec));
    toast.success('Added to download queue', {
      description: `CH${rec.channel} — ${toHHMMSS(rec.startTime)}`,
    });
  }

  function handleDownloadAll() {
    if (filteredRecordings.length === 0) return;
    enqueueAll(filteredRecordings.map(buildPayload));
    toast.success(`${filteredRecordings.length} recordings queued`, {
      description: 'Downloads will process one at a time.',
    });
  }

  // Map queue items by id for quick lookup
  const queueMap = useMemo(
    () => new Map(queue.map((item) => [item.id, item])),
    [queue],
  );

  const activeCount = queue.filter(
    (i) => i.status === 'queued' || i.status === 'downloading',
  ).length;

  return (
    <div className="h-screen w-full bg-[#0d0d0d] flex flex-col overflow-hidden font-sans">
      <Topbar />

      {/* Page header */}
      <div className="h-14 border-b border-[#1e1e1e] bg-[#131313] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/playback')}
            className="flex items-center gap-2 text-[#8d90a0] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#2563eb]" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Playback</span>
          </button>
          <div className="w-px h-5 bg-[#2a2a2a]" />
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-[#2563eb]" />
            <h1 className="text-sm font-bold uppercase tracking-widest text-white">
              Download Manager
            </h1>
          </div>
        </div>

        {/* Queue status pill */}
        {activeCount > 0 && (
          <div className="flex items-center gap-2 bg-[#2563eb]/10 border border-[#2563eb]/30 rounded-sm px-3 py-1.5">
            <Loader2 className="w-3.5 h-3.5 text-[#2563eb] animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563eb]">
              {activeCount} in queue{isDownloading ? ' · Downloading…' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-r border-[#1e1e1e] bg-[#131313] flex flex-col overflow-y-auto">

          {/* Date picker */}
          <div className="p-4 border-b border-[#1e1e1e]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] mb-2">
              Select Date
            </p>
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setCalendarOpen((o) => !o)}
                className="w-full flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-3 py-2
                           text-white hover:border-[#3a3a3a] transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#2563eb] shrink-0" />
                <span className="font-mono text-sm font-bold uppercase tracking-wider">{selectedDate}</span>
              </button>

              {calendarOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50
                              bg-[#131313] border border-[#1e1e1e] rounded-sm shadow-xl"
                  style={{ minWidth: 270 }}
                >
                  {/* Month navigation */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e1e]">
                    <button
                      type="button"
                      disabled={!canGoPrev}
                      onClick={() => navMonth(-1)}
                      className="w-7 h-7 flex items-center justify-center rounded-sm
                                 text-[#8d90a0] hover:text-white hover:bg-[#1e1e1e]
                                 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                      {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
                    </span>
                    <button
                      type="button"
                      disabled={!canGoNext}
                      onClick={() => navMonth(1)}
                      className="w-7 h-7 flex items-center justify-center rounded-sm
                                 text-[#8d90a0] hover:text-white hover:bg-[#1e1e1e]
                                 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day-of-week header */}
                  <div className="grid grid-cols-7 px-2 pt-2 pb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} className="flex items-center justify-center" style={{ height: 24 }}>
                        <span className="text-[9px] font-bold uppercase text-[#4a4a4a]">{d}</span>
                      </div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                    {calendarGrid.map((day, i) => {
                      if (!day) return <div key={`empty-${i}`} className="w-8 h-8" />;
                      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = dateStr === selectedDate;
                      const isToday = dateStr === todayStr;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => { setSelectedDate(dateStr); setCalendarOpen(false); }}
                          className={[
                            'w-8 h-8 mx-auto flex items-center justify-center rounded-sm',
                            'text-[11px] font-mono font-bold transition-colors',
                            isSelected
                              ? 'bg-[#2563eb] text-white'
                              : 'text-white hover:bg-[#1e1e1e]',
                            isToday && !isSelected ? 'ring-1 ring-[#2563eb]/40' : '',
                          ].join(' ')}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time range */}
          <div className="p-4 border-b border-[#1e1e1e] space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0]">
              Time Range Filter
            </p>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-[#5a5a5a] mb-1">
                Start Time (UTC)
              </label>
              <input
                type="time"
                step={1}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-sm border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5
                           font-mono text-sm text-white outline-none [color-scheme:dark]
                           focus:border-[#2563eb] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-[#5a5a5a] mb-1">
                End Time (UTC)
              </label>
              <input
                type="time"
                step={1}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-sm border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5
                           font-mono text-sm text-white outline-none [color-scheme:dark]
                           focus:border-[#2563eb] transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => { setStartTime('00:00:00'); setEndTime('23:59:59'); }}
              className="text-[9px] font-bold uppercase tracking-widest text-[#8d90a0] hover:text-white transition-colors"
            >
              Reset to full day
            </button>
          </div>

          {/* Stats */}
          <div className="p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0]">
              Filtered Recordings
            </p>
            <p className="text-2xl font-bold text-white font-mono">
              {isLoading ? '…' : filteredRecordings.length}
            </p>
            {filteredRecordings.length > 0 && (
              <p className="text-[9px] text-[#5a5a5a] font-mono uppercase tracking-widest">
                Total size:{' '}
                {formatBytes(
                  filteredRecordings.reduce(
                    (acc, r) =>
                      acc + (r.sizeBytes != null
                        ? typeof r.sizeBytes === 'string'
                          ? parseFloat(r.sizeBytes)
                          : r.sizeBytes
                        : 0),
                    0,
                  ),
                )}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Table header / toolbar */}
          <div className="h-12 border-b border-[#1e1e1e] bg-[#0d0d0d] flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0]">
              {isLoading ? 'Loading recordings…' : `${filteredRecordings.length} recordings for ${selectedDate}`}
            </span>
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">
                  Failed to load recordings
                </p>
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle className="w-10 h-10 text-[#3a3a3a]" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#8d90a0]">
                  No recordings found for this date/time range
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1e1e1e] hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] w-44">
                      Station
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] w-40">
                      NVR
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] w-20">
                      Channel
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] w-36">
                      Start Time
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] w-36">
                      End Time
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] w-40">
                      Progress
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-[#8d90a0] bg-[#0f0f0f] text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>Actions</span>
                        <button
                          type="button"
                          onClick={handleDownloadAll}
                          className="inline-flex items-center gap-1.5 bg-[#2563eb]/10 hover:bg-[#2563eb]/20
                                     border border-[#2563eb]/30 hover:border-[#2563eb]/60
                                     text-[#2563eb] hover:text-white rounded-sm px-2.5 py-1
                                     text-[9px] font-bold uppercase tracking-widest transition-all"
                        >
                          <Download className="w-3 h-3" />
                          Download All
                        </button>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecordings.map((rec) => {
                    const itemId = buildItemId(rec.nvrId, rec.channel, rec.startTime);
                    const queueItem = queueMap.get(itemId);

                    const endTimeIso =
                      rec.endTime ??
                      new Date(
                        new Date(rec.startTime).getTime() + (rec.durationSeconds ?? 300) * 1000,
                      ).toISOString();

                    return (
                      <TableRow
                        key={itemId}
                        className="border-[#1e1e1e] hover:bg-[#131313] transition-colors"
                      >
                        <TableCell className="text-[11px] font-semibold text-white uppercase tracking-wide">
                          {rec.stationName}
                        </TableCell>
                        <TableCell className="text-[11px] text-[#8d90a0] font-mono uppercase">
                          {rec.nvrName}
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-white font-mono">
                          CH{String(rec.channel).padStart(2, '0')}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-[#8d90a0]">
                          {toHHMMSS(rec.startTime)}
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-[#8d90a0]">
                          {toHHMMSS(endTimeIso)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge item={queueItem} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {queueItem?.status === 'error' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadOne(rec)}
                                className="inline-flex items-center gap-1 text-[9px] font-bold uppercase
                                           tracking-widest text-red-400 hover:text-white transition-colors"
                              >
                                <Download className="w-3 h-3" /> Retry
                              </button>
                            )}

                            {queueItem?.status === 'downloading' && (
                              <button
                                type="button"
                                onClick={() => pause(itemId)}
                                className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#f59e0b]/10
                                           border border-[#2a2a2a] hover:border-[#f59e0b]/50
                                           text-[#8d90a0] hover:text-[#f59e0b] rounded-sm px-2.5 py-1
                                           text-[9px] font-bold uppercase tracking-widest transition-all"
                              >
                                <Pause className="w-3 h-3" /> Pause
                              </button>
                            )}

                            {queueItem?.status === 'queued' && (
                              <button
                                type="button"
                                onClick={() => pause(itemId)}
                                className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#f59e0b]/10
                                           border border-[#2a2a2a] hover:border-[#f59e0b]/50
                                           text-[#8d90a0] hover:text-[#f59e0b] rounded-sm px-2.5 py-1
                                           text-[9px] font-bold uppercase tracking-widest transition-all"
                              >
                                <Pause className="w-3 h-3" /> Dequeue
                              </button>
                            )}

                            {queueItem?.status === 'paused' && (
                              <button
                                type="button"
                                onClick={() => resume(itemId)}
                                className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#2563eb]/10
                                           border border-[#2a2a2a] hover:border-[#2563eb]/50
                                           text-[#8d90a0] hover:text-[#2563eb] rounded-sm px-2.5 py-1
                                           text-[9px] font-bold uppercase tracking-widest transition-all"
                              >
                                <Play className="w-3 h-3" /> Resume
                              </button>
                            )}

                            {queueItem?.status === 'done' && (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                Complete
                              </span>
                            )}

                            {!queueItem && (
                              <button
                                type="button"
                                onClick={() => handleDownloadOne(rec)}
                                className="inline-flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#2563eb]/10
                                           border border-[#2a2a2a] hover:border-[#2563eb]/50
                                           text-[#8d90a0] hover:text-[#2563eb] rounded-sm px-2.5 py-1
                                           text-[9px] font-bold uppercase tracking-widest transition-all"
                              >
                                <Download className="w-3 h-3" /> Download
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
