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

interface DownloadStore {
  queue: DownloadItem[];
  isDownloading: boolean;
  _isProcessing: boolean;
  enqueue: (item: EnqueuePayload) => void;
  enqueueAll: (items: EnqueuePayload[]) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  removeItem: (id: string) => void;
  clearDone: () => void;
  _processNext: () => void;
  _controllers: Map<string, AbortController>;
}

function buildDownloadUrl(
  nvrId: string,
  channel: number,
  startTime: string,
  endTime: string,
): string {
  const params = new URLSearchParams({
    nvrId,
    channel: String(channel),
    startTime,
    endTime,
  });
  const { token } = useSessionStore.getState();
  if (token) params.set('token', token);
  return `/api/playback/download?${params.toString()}`;
}

type FileSystemAccessWindow = Window & typeof globalThis & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (chunk: Blob | Uint8Array | ArrayBuffer) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  queue: [],
  isDownloading: false,
  _isProcessing: false,
  _controllers: new Map(),

  enqueue(payload) {
    const existing = get().queue.find((i) => i.id === payload.id);
    if (existing && existing.status !== 'done' && existing.status !== 'error' && existing.status !== 'paused') return;

    const item: DownloadItem = {
      ...payload,
      status: 'queued',
      progress: 0,
      receivedBytes: 0,
    };
    set((s) => ({ queue: [...s.queue.filter((i) => i.id !== payload.id), item] }));

    if (!get().isDownloading) {
      get()._processNext();
    }
  },

  enqueueAll(items) {
    const current = get().queue;
    const toAdd: DownloadItem[] = items
      .filter((p) => {
        const ex = current.find((i) => i.id === p.id);
        return !ex || ex.status === 'done' || ex.status === 'error';
      })
      .map((p) => ({ ...p, status: 'queued' as const, progress: 0, receivedBytes: 0 }));

    if (toAdd.length === 0) return;

    set((s) => {
      const filtered = s.queue.filter((i) => !toAdd.some((t) => t.id === i.id));
      return { queue: [...filtered, ...toAdd] };
    });

    if (!get().isDownloading) {
      get()._processNext();
    }
  },

  pause(id) {
    const { _controllers } = get();

    const ctrl = _controllers.get(id);
    if (ctrl) {
      ctrl.abort();
      _controllers.delete(id);
    }

    set((s) => ({
      isDownloading: false,
      queue: s.queue.map((i) =>
        i.id === id && (i.status === 'downloading' || i.status === 'queued')
          ? { ...i, status: 'paused' }
          : i,
      ),
    }));

    if (!get()._isProcessing) {
      setTimeout(() => get()._processNext(), 100);
    }
  },

  resume(id) {
    set((s) => ({
      queue: s.queue.map((i) =>
        i.id === id && i.status === 'paused'
          ? { ...i, status: 'queued', progress: 0, receivedBytes: 0 }
          : i,
      ),
    }));

    if (!get().isDownloading) {
      get()._processNext();
    }
  },

  removeItem(id) {
    const ctrl = get()._controllers.get(id);
    if (ctrl) ctrl.abort();
    set((s) => ({ queue: s.queue.filter((i) => i.id !== id) }));
  },

  clearDone() {
    set((s) => ({
      queue: s.queue.filter((i) => i.status !== 'done' && i.status !== 'error'),
    }));
  },

  async _processNext() {
    if (get()._isProcessing) return;

    set({ _isProcessing: true });

    const { queue } = get();
    const nextItem = queue.find((i) => i.status === 'queued');
    if (!nextItem) {
      set({ isDownloading: false, _isProcessing: false });
      return;
    }

    const controller = new AbortController();
    get()._controllers.set(nextItem.id, controller);

    set((s) => ({
      isDownloading: true,
      queue: s.queue.map((i) =>
        i.id === nextItem.id
          ? { ...i, status: 'downloading', progress: 0, receivedBytes: 0 }
          : i,
      ),
    }));

    const url = buildDownloadUrl(
      nextItem.nvrId,
      nextItem.channel,
      nextItem.startTime,
      nextItem.endTime,
    );

    try {
      const { token } = useSessionStore.getState();
      const response = await fetch(url, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? Number.parseInt(contentLength, 10) : null;

      const filePickerWindow = window as FileSystemAccessWindow;
      if (!filePickerWindow.showSaveFilePicker) {
        throw new Error('File System Access API is not available in this browser');
      }

      const fileHandle = await filePickerWindow.showSaveFilePicker({
        suggestedName: nextItem.filename,
        types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
      });
      const writable = await fileHandle.createWritable();

      const reader = response.body!.getReader();
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writable.write(value);
        receivedBytes += value.byteLength;

        const pct = totalBytes
          ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100))
          : 0;

        set((s) => ({
          queue: s.queue.map((i) =>
            i.id === nextItem.id
              ? { ...i, progress: pct, receivedBytes }
              : i,
          ),
        }));
      }

      await writable.close();
      get()._controllers.delete(nextItem.id);

      set((s) => ({
        queue: s.queue.map((i) =>
          i.id === nextItem.id
            ? { ...i, status: 'done', progress: 100 }
            : i,
        ),
      }));
    } catch (err) {
      get()._controllers.delete(nextItem.id);

      if (err instanceof Error && err.name === 'AbortError') {
        set({ _isProcessing: false });
        get()._processNext();
        return;
      }

      const message = err instanceof Error ? err.message : 'Download failed';
      set((s) => ({
        queue: s.queue.map((i) =>
          i.id === nextItem.id
            ? { ...i, status: 'error', error: message }
            : i,
        ),
      }));
    }

    const hasQueued = get().queue.some((i) => i.status === 'queued');
    set({
      isDownloading: false,
      _isProcessing: false,
    });

    if (hasQueued) {
      get()._processNext();
    }
  },
}));
