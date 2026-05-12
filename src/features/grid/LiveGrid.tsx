import { useGridStore } from '../../store/useGridStore';
import { GridCell } from './GridCell';

const gridConfig: Record<string, { cols: string; rows: string }> = {
  '1x1': { cols: 'grid-cols-1', rows: 'grid-rows-1' },
  '2x2': { cols: 'grid-cols-2', rows: 'grid-rows-2' },
  '3x3': { cols: 'grid-cols-3', rows: 'grid-rows-3' },
  '4x4': { cols: 'grid-cols-4', rows: 'grid-rows-4' },
};

export const LiveGrid = () => {
  const { layout, activeChannels } = useGridStore();
  const { cols, rows } = gridConfig[layout];

  return (
    // overflow-hidden + h-full + explicit grid-rows forces all cells to equal
    // fixed heights. Videos are constrained inside their cell, not the reverse.
    <div
      className={`w-full h-full bg-[#0d0d0d] grid gap-1 p-1 overflow-hidden ${cols} ${rows}`}
    >
      {activeChannels.map((channel, idx) => (
        <GridCell key={`cell-${idx}`} index={idx} channel={channel} />
      ))}
    </div>
  );
};
