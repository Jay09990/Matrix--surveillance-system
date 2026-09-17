import { create } from 'zustand';
import { useSessionStore } from './useSessionStore';

export interface DownloadItem {
  id: string;
  nvrId: string;
  channel: number;
  startTime: string;
  endTime: string;
  stationName: string;
  nvrName: string;
  filename: string;
  sizeBytes: number | null;
  status: 'queued' | 'downloading' | 'paused' | 'done' | 'error';
  progress: number;
  receivedBytes: number;
  error?: string;
}

type EnqueuePayload = Omit<DownloadItem, 'status' | 'progress' | 'receivedBytes'>;

interface FileWritable {
  write: (chunk: Blob | Uint8Array | ArrayBuffer) => Promise<void>;
  close: () => Promise<void>;
  abort?: () => Promise<void>;
}
interface FileHandle {
  createWritable: () => Promise<FileWritable>;
}
interface DirHandle {
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileHandle>;
}

type FSWindow = Window & typeof globalThis & {
  showSaveFilePicker?: (o: {
    suggestedName: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<FileHandle>;
  showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite' }) => Promise<DirHandle>;
};

interface DownloadStore {
  queue: DownloadItem[];
  isDownloading: boolean;
  _isProcessing: boolean;
  _controllers: Map<string, AbortController>;
  _fileHandles: Map<string, FileHandle>;
  _dirHandle: DirHandle | null;
  enqueue: (item: EnqueuePayload) => Promise<boolean>;
  enqueueAll: (items: EnqueuePayload[]) => Promise<boolean>;
  removeItem: (id: string) => void;
  clearDone: () => void;
  _processNext: () => void;
}

function buildDownloadUrl(nvrId: string, channel: number, startTime: string, endTime: string) {
  const params = new URLSearchParams({ nvrId, channel: String(channel), startTime, endTime });
  const { token } = useSessionStore.getState();
  if (token) params.set('token', token);
  return `/api/playback/download?${params.toString()}`;
}

const isAbort = (e: unknown) =>
  e instanceof Error && (e.name === 'AbortError' || e.name === 'NotAllowedError');

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  queue: [],
  isDownloading: false,
  _isProcessing: false,
  _controllers: new Map(),
  _fileHandles: new Map(),
  _dirHandle: null,

  // Returns false if the user cancelled the picker — nothing is queued.
  async enqueue(payload) {
    const existing = get().queue.find((i) => i.id === payload.id);
    if (existing && existing.status !== 'done' && existing.status !== 'error') return false;

    const w = window as FSWindow;
    if (!w.showSaveFilePicker) {
      throw new Error('File System Access API is not available in this browser');
    }

    // Picker FIRST, while the click gesture is still live.
    let handle: FileHandle;
    try {
      handle = await w.showSaveFilePicker({
        suggestedName: payload.filename,
        types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
      });
    } catch (err) {
      if (isAbort(err)) return false; // cancelled — no queue entry, no spinner
      throw err;
    }

    get()._fileHandles.set(payload.id, handle);

    const item: DownloadItem = { ...payload, status: 'queued', progress: 0, receivedBytes: 0 };
    set((s) => ({ queue: [...s.queue.filter((i) => i.id !== payload.id), item] }));

    if (!get().isDownloading) get()._processNext();
    return true;
  },

  // One directory prompt for the whole batch.
  async enqueueAll(items) {
    const current = get().queue;
    const toAdd: DownloadItem[] = items
      .filter((p) => {
        const ex = current.find((i) => i.id === p.id);
        return !ex || ex.status === 'done' || ex.status === 'error';
      })
      .map((p) => ({ ...p, status: 'queued' as const, progress: 0, receivedBytes: 0 }));

    if (toAdd.length === 0) return false;

    const w = window as FSWindow;
    if (!w.showDirectoryPicker) {
      throw new Error('Directory picker is not available in this browser');
    }

    let dir: DirHandle;
    try {
      dir = await w.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      if (isAbort(err)) return false; // cancelled — nothing queued at all
      throw err;
    }

    set({ _dirHandle: dir });
    set((s) => ({
      queue: [...s.queue.filter((i) => !toAdd.some((t) => t.id === i.id)), ...toAdd],
    }));

    if (!get().isDownloading) get()._processNext();
    return true;
  },

  removeItem(id) {
    get()._controllers.get(id)?.abort();
    get()._controllers.delete(id);
    get()._fileHandles.delete(id);
    set((s) => ({ queue: s.queue.filter((i) => i.id !== id) }));
  },

  clearDone() {
    set((s) => ({ queue: s.queue.filter((i) => i.status !== 'done' && i.status !== 'error') }));
  },

  async _processNext() {
    if (get()._isProcessing) return;
    set({ _isProcessing: true });

    const nextItem = get().queue.find((i) => i.status === 'queued');
    if (!nextItem) {
      set({ isDownloading: false, _isProcessing: false, _dirHandle: null });
      return;
    }

    const controller = new AbortController();
    get()._controllers.set(nextItem.id, controller);

    set((s) => ({
      isDownloading: true,
      queue: s.queue.map((i) =>
        i.id === nextItem.id ? { ...i, status: 'downloading', progress: 0, receivedBytes: 0 } : i,
      ),
    }));

    let writable: FileWritable | null = null;

    try {
      // Destination is resolved BEFORE the network call — no prompt here.
      let handle = get()._fileHandles.get(nextItem.id);
      if (!handle) {
        const dir = get()._dirHandle;
        if (!dir) throw new Error('No save destination selected');
        handle = await dir.getFileHandle(nextItem.filename, { create: true });
      }
      writable = await handle.createWritable();

      const { token } = useSessionStore.getState();
      const response = await fetch(buildDownloadUrl(
        nextItem.nvrId, nextItem.channel, nextItem.startTime, nextItem.endTime,
      ), {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);

      const cl = response.headers.get('content-length');
      const totalBytes = cl ? Number.parseInt(cl, 10) : null;

      const reader = response.body!.getReader();
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writable.write(value);
        receivedBytes += value.byteLength;
        const pct = totalBytes ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100)) : 0;
        set((s) => ({
          queue: s.queue.map((i) =>
            i.id === nextItem.id ? { ...i, progress: pct, receivedBytes } : i,
          ),
        }));
      }

      await writable.close();
      writable = null;

      set((s) => ({
        queue: s.queue.map((i) =>
          i.id === nextItem.id ? { ...i, status: 'done', progress: 100 } : i,
        ),
      }));
    } catch (err) {
      controller.abort();                 // C: always release the RTSP connection
      await writable?.abort?.().catch(() => {});

      if (isAbort(err)) {
        // A: actually clear the row instead of leaving it spinning
        set((s) => ({ queue: s.queue.filter((i) => i.id !== nextItem.id) }));
      } else {
        const message = err instanceof Error ? err.message : 'Download failed';
        set((s) => ({
          queue: s.queue.map((i) =>
            i.id === nextItem.id ? { ...i, status: 'error', error: message } : i,
          ),
        }));
      }
    } finally {
      get()._controllers.delete(nextItem.id);
      get()._fileHandles.delete(nextItem.id);
    }

    const hasQueued = get().queue.some((i) => i.status === 'queued');
    set({ isDownloading: false, _isProcessing: false });
    if (hasQueued) get()._processNext();
    else set({ _dirHandle: null });
  },
}));