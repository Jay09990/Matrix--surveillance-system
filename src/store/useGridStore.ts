import type { Camera } from '../types/camera';
import { create } from 'zustand';

export type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '4x8';

interface GridState {
  layout: GridLayout;
  activeChannels: (Camera | null)[]; // Array index corresponds to cell index
  setLayout: (layout: GridLayout) => void;
  addChannel: (channel: Camera, cellIndex: number) => void;
  removeChannel: (cellIndex: number) => void;
  clearGrid: () => void;
}

const getSlotCount = (layout: GridLayout) => {
  switch (layout) {
    case '1x1': return 1;
    case '2x2': return 4;
    case '3x3': return 9;
    case '4x4': return 16;
    case '4x8': return 32;
    default: return 4;
  }
};

export const useGridStore = create<GridState>((set) => ({
  layout: '2x2',
  activeChannels: new Array(4).fill(null),
  setLayout: (layout) => set((state) => {
    const newCount = getSlotCount(layout);
    const newChannels = new Array(newCount).fill(null);
    // Keep streams that still have a cell
    for (let i = 0; i < Math.min(state.activeChannels.length, newCount); i++) {
      newChannels[i] = state.activeChannels[i];
    }
    return { layout, activeChannels: newChannels };
  }),
  addChannel: (channel, cellIndex) => set((state) => {
    const newChannels = [...state.activeChannels];
    
    // Uniqueness: Remove camera from any other slot it might be in
    const existingIndex = newChannels.findIndex(c => c?.id === channel.id);
    if (existingIndex !== -1) {
      newChannels[existingIndex] = null;
    }
    
    newChannels[cellIndex] = channel;
    return { activeChannels: newChannels };
  }),
  removeChannel: (cellIndex) => set((state) => {
    const newChannels = [...state.activeChannels];
    newChannels[cellIndex] = null;
    return { activeChannels: newChannels };
  }),
  clearGrid: () => set((state) => ({
    activeChannels: new Array(getSlotCount(state.layout)).fill(null)
  })),
}));
