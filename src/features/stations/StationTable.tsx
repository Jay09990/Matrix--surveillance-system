import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner'
import { Pencil, Trash2, Loader2, Search, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAllNVRs } from '../nvrs/useNVRs';
import { useSessionStore } from '../../store/useSessionStore';
import { apiService } from '../../services/api';
import { StatusBadge } from '../../components/StatusBadge';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

// ── Main StationTable ─────────────────────────────────────────────────────────
export function StationTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSessionStore();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [deleteNvrId, setDeleteNvrId] = useState<string | null>(null);

  const { data: nvrs, isLoading, isError, error } = useAllNVRs();

  // Derive unique stations for the filter dropdown
  const uniqueStations = useMemo(() => {
    if (!nvrs) return [];
    const map = new Map<string, { id: string; name: string; city: string }>();
    nvrs.forEach((nvr) => {
      if (!map.has(nvr.station.id)) {
        map.set(nvr.station.id, nvr.station);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [nvrs]);

  // Filter NVRs by station and search
  const filteredNVRs = useMemo(() => {
    if (!nvrs) return [];
    return nvrs.filter((nvr) => {
      const matchesStation =
        stationFilter === 'all' || nvr.station.id === stationFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        nvr.name.toLowerCase().includes(q) ||
        nvr.ip.includes(q) ||
        nvr.station.name.toLowerCase().includes(q) ||
        nvr.station.city.toLowerCase().includes(q);
      return matchesStation && matchesSearch;
    });
  }, [nvrs, stationFilter, searchQuery]);

  const deleteNvr = useMutation({
    mutationFn: (id: string) => apiService.nvrs.delete(id),
    onSuccess: () => {
      toast.success('NVR deleted');
      queryClient.invalidateQueries({ queryKey: ['nvrs'] });
    },
    onError: () => toast.error('Failed to delete NVR'),
  });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-[#8d90a0]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2563eb]" />
        <p className="text-xs uppercase tracking-widest font-bold">Loading NVR Data</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="w-full p-6 border border-[#93000a] bg-[#93000a]/10 text-[#ffb4ab] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold mb-1">Failed to load NVRs</h3>
          <p className="text-sm">{(error as any)?.message || 'An unexpected error occurred.'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Filters bar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d90a0] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by NVR name, IP or station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-[#131313] border border-[#2a2a2a] pl-10 pr-3 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#2563eb] transition-colors rounded-[0px]"
          />
        </div>

        {/* Station filter */}
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-full sm:w-56 h-10 bg-[#131313] border-[#2a2a2a] text-[#e5e2e1] rounded-[0px]">

            <SelectValue placeholder="All Stations" />
          </SelectTrigger>
          <SelectContent className="bg-[#131313] border-[#2a2a2a] text-[#e5e2e1]">
            <SelectItem value="all" className="focus:bg-[#2563eb] focus:text-white">All Stations</SelectItem>
            {uniqueStations.map((s) => (
              <SelectItem key={s.id} value={s.id} className="focus:bg-[#2563eb] focus:text-white">
                {s.name} — {s.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      {filteredNVRs.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center p-12 text-[#8d90a0] border border-[#2a2a2a]">
          <span className="font-mono text-xl text-[#383838] block mb-2">00</span>
          <p className="text-sm font-semibold uppercase tracking-widest">No NVRs found</p>
          <p className="text-xs mt-1">Try adjusting your search or station filter.</p>
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-[0px] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#131313] border-b border-[#2a2a2a] hover:bg-[#131313]">
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Station</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">NVR Name & IP</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Cameras</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Last Seen / Offline Since</TableHead>
                {isAdmin && (
                  <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNVRs.map((nvr) => (
                <TableRow
                  key={nvr.id}
                  className="bg-[#0d0d0d] border-b border-[#2a2a2a] hover:bg-[#131313] transition-colors"
                >
                  {/* Station */}
                  <TableCell>
                    <div className="flex flex-col">
                      <button
                        onClick={() => navigate(`/live/${nvr.station.id}`)}
                        className="text-sm font-bold text-[#e5e2e1] hover:text-[#2563eb] transition-colors text-left"
                      >
                        {nvr.station.name}
                      </button>
                      <span className="text-[10px] text-[#8d90a0]">{nvr.station.city}</span>
                    </div>
                  </TableCell>

                  {/* NVR Name & IP */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-[#e5e2e1]">{nvr.name}</span>
                      <span className="text-[10px] font-mono text-[#8d90a0] mt-0.5">{nvr.ip}</span>
                      {(nvr.rtspPort || nvr.httpPort) && (
                        <span className="text-[9px] font-mono text-[#383838] mt-0.5">
                          {nvr.rtspPort && `RTSP:${nvr.rtspPort}`}
                          {nvr.rtspPort && nvr.httpPort && ' · '}
                          {nvr.httpPort && `HTTP:${nvr.httpPort}`}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-mono rounded-[2px] px-2 py-0.5 ${
                        nvr.type === 'HIKVISION'
                          ? 'bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/30'
                          : 'bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/30'
                      }`}
                    >
                      {nvr.type}
                    </Badge>
                  </TableCell>

                  {/* Cameras */}
                  <TableCell className="text-sm text-[#8d90a0] font-mono">
                    {nvr._count.cameras}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={nvr.status as any} />
                  </TableCell>

                  {/* Last Seen / Offline Since */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {nvr.lastSeenAt && (
                        <span className="text-[10px] font-mono text-[#8d90a0]">
                          Seen: {formatDistanceToNow(new Date(nvr.lastSeenAt))} ago
                        </span>
                      )}
                      {nvr.offlineSince && nvr.status === 'offline' && (
                        <span className="text-[10px] font-mono text-[#e03e3e]/70">
                          Offline: {formatDistanceToNow(new Date(nvr.offlineSince))} ago
                        </span>
                      )}
                      {!nvr.lastSeenAt && !nvr.offlineSince && (
                        <span className="text-[10px] text-[#383838]">—</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#8d90a0] hover:text-white hover:bg-[#2a2a2a]"
                          title="Edit NVR"
                          onClick={() => navigate(`/admin/nvrs/edit/${nvr.id}`)}
                        >
                          <Pencil className="w-3.5 h-3.5 text-[#2563eb]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#8d90a0] hover:text-[#e03e3e] hover:bg-[#e03e3e]/10"
                          title="Delete NVR"
                          onClick={() => setDeleteNvrId(nvr.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Delete NVR confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteNvrId} onOpenChange={(o) => !o && setDeleteNvrId(null)}>
        <AlertDialogContent className="bg-[#131313] border border-[#2a2a2a] text-[#e5e2e1] rounded-[2px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete NVR?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8d90a0]">
              This will permanently remove the NVR and all associated camera data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e5e2e1] hover:bg-[#2a2a2a] rounded-[2px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#e03e3e] hover:bg-[#c53030] text-white rounded-[2px]"
              onClick={() => {
                if (deleteNvrId) deleteNvr.mutate(deleteNvrId);
                setDeleteNvrId(null);
              }}
            >
              Delete NVR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
