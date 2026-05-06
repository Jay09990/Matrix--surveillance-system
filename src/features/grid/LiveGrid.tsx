import { useGridStore } from '../../store/useGridStore';
import { GridCell } from './GridCell';

export const LiveGrid = () => {
  const { layout, activeChannels } = useGridStore();

  const gridCols = {
    '1x1': 'grid-cols-1',
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
    '4x4': 'grid-cols-4',
    '4x8': 'grid-cols-4',
  }[layout];

  // Using a container that forces the aspect ratio to maintain roughly 16:9 for cells if possible,
  // or fill the height. Since it's a dashboard, filling the height might be preferred, but 
  // video needs aspect ratio. We'll use CSS grid.
  
  return (
    <div className={`flex-1 p-1 bg-[#0d0d0d] overflow-y-auto no-scrollbar grid gap-1 ${gridCols} ${
      layout === '4x8' ? 'auto-rows-[minmax(150px,1fr)]' : 'h-full'
    }`}>
      {activeChannels.map((channel, idx) => (
        <GridCell key={`cell-${idx}`} index={idx} channel={channel} />
      ))}
    </div>
  );
};
