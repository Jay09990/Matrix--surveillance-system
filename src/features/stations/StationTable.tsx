import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, ChevronDown, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { Station } from '../../types/station';
import { useNVRs } from '../nvrs/useNVRs';
import { useSessionStore } from '../../store/useSessionStore';
import { api } from '../../lib/axios';
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

interface StationTableProps {
  stations: Station[];
}

// ── NVR sub-rows (lazy-loaded on expand) ─────────────────────────────────────
function NVRRows({
  stationId,
  isAdmin,
}: {
  stationId: string;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const { data: nvrs, isLoading } = useNVRs(stationId);
  const queryClient = useQueryClient();
  const [deleteNvrId, setDeleteNvrId] = useState<string | null>(null);

  const deleteNvr = useMutation({
    mutationFn: (nvrId: string) => api.delete(`/stations/${stationId}/nvrs/${nvrId}`),
    onSuccess: () => {
      toast.success('NVR deleted');
      queryClient.invalidateQueries({ queryKey: ['nvrs', stationId] });
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
    onError: () => toast.error('Failed to delete NVR'),
  });

  if (isLoading) {
    return (
      <TableRow className="bg-[#1a1a1a]">
        <TableCell colSpan={6} className="py-3 pl-12 text-[#8d90a0]">
          <Loader2 className="w-3.5 h-3.5 animate-spin inline-block mr-2" />
          Loading NVRs…
        </TableCell>
      </TableRow>
    );
  }

  if (!nvrs || nvrs.length === 0) {
    return (
      <TableRow className="bg-[#1a1a1a]">
        <TableCell colSpan={6} className="py-3 pl-12 text-[#8d90a0] text-xs uppercase tracking-wider font-bold">
          No NVRs configured
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {nvrs.map((nvr) => (
        <TableRow
          key={nvr.id}
          className="bg-[#1a1a1a] border-l-2 border-[#2563eb]/20 hover:bg-[#1e1e1e] transition-colors"
        >
          {/* indent column */}
          <TableCell className="w-10" />
          <TableCell className="pl-4">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#e5e2e1]">{nvr.name}</span>
              <span className="text-[10px] font-mono text-[#8d90a0] mt-0.5">{nvr.ip}</span>
            </div>
          </TableCell>
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
          <TableCell className="text-[#8d90a0] text-sm">{nvr.totalChannel} ch</TableCell>
          <TableCell /> {/* empty for NVRs count column */}
          <TableCell>
            <StatusBadge status={nvr.status as any} />
          </TableCell>
          <TableCell className="text-right">
            {isAdmin && (
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#8d90a0] hover:text-white hover:bg-[#2a2a2a]"
                  title="Edit NVR"
                  onClick={() => navigate(`/admin/nvrs/edit/${stationId}/${nvr.id}`)}
                >
                  <Pencil className="w-3.5 h-3.5" />
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
            )}
          </TableCell>
        </TableRow>
      ))}

      {/* Delete NVR confirmation dialog */}
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

// ── Main StationTable ─────────────────────────────────────────────────────────
export function StationTable({ stations }: StationTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSessionStore();
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteStationId, setDeleteStationId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteStation = useMutation({
    mutationFn: (id: string) => api.delete(`/stations/${id}`),
    onSuccess: () => {
      toast.success('Station deleted');
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
    onError: () => toast.error('Failed to delete station'),
  });

  if (stations.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-[#8d90a0]">
        <div className="w-16 h-16 border border-[#2a2a2a] rounded-[0px] flex items-center justify-center mb-4">
          <span className="font-mono text-xl text-[#383838]">00</span>
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest">No stations found</p>
        <p className="text-xs mt-1">Try adjusting your search filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-[#2a2a2a] rounded-[0px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#131313] border-b border-[#2a2a2a] hover:bg-[#131313]">
              <TableHead className="w-10" />
              <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Station Name</TableHead>
              <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">City</TableHead>
              <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">State</TableHead>
              <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">NVRs</TableHead>
              <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[#8d90a0] text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((station) => {
              const isExpanded = expandedIds.has(station.id);
              return (
                <>
                  {/* Station row */}
                  <TableRow
                    key={station.id}
                    className="bg-[#0d0d0d] border-b border-[#2a2a2a] hover:bg-[#131313] transition-colors"
                  >
                    {/* Expand toggle */}
                    <TableCell className="w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#8d90a0] hover:text-white hover:bg-[#2a2a2a]"
                        onClick={() => toggleExpand(station.id)}
                      >
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </TableCell>

                    {/* Station name — clickable to live view */}
                    <TableCell>
                      <button
                        onClick={() => navigate(`/live/${station.id}`)}
                        className="text-sm font-bold text-[#e5e2e1] hover:text-[#2563eb] transition-colors text-left"
                      >
                        {station.name}
                      </button>
                    </TableCell>

                    <TableCell className="text-sm text-[#8d90a0]">{station.city}</TableCell>
                    <TableCell className="text-sm text-[#8d90a0]">{station.state}</TableCell>

                    <TableCell className="text-sm text-[#8d90a0]">
                      {station.nvrCount ?? '—'}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={station.status as any} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#8d90a0] hover:text-white hover:bg-[#2a2a2a]"
                            title="Edit Station"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#8d90a0] hover:text-[#e03e3e] hover:bg-[#e03e3e]/10"
                            title="Delete Station"
                            onClick={() => setDeleteStationId(station.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Nested NVR rows */}
                  {isExpanded && (
                    <NVRRows stationId={station.id} isAdmin={isAdmin} />
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Station confirmation */}
      <AlertDialog open={!!deleteStationId} onOpenChange={(o) => !o && setDeleteStationId(null)}>
        <AlertDialogContent className="bg-[#131313] border border-[#2a2a2a] text-[#e5e2e1] rounded-[2px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Station?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8d90a0]">
              This will permanently remove the station along with all NVRs and camera feeds. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e5e2e1] hover:bg-[#2a2a2a] rounded-[2px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#e03e3e] hover:bg-[#c53030] text-white rounded-[2px]"
              onClick={() => {
                if (deleteStationId) deleteStation.mutate(deleteStationId);
                setDeleteStationId(null);
              }}
            >
              Delete Station
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
