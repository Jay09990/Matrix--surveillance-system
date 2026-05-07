import { useGridStore, type GridLayout } from '../../store/useGridStore';
import { LayoutGrid, Grid2x2, Grid3X3, Grid } from 'lucide-react';

export const LayoutToggle = () => {
  const { layout, setLayout } = useGridStore();

  const layouts: { id: GridLayout; icon: React.ElementType; label: string }[] = [
    { id: '1x1', icon: LayoutGrid, label: '1x1' }, // LayoutGrid looks like a square or 2x2, let's use it for 1x1
    { id: '2x2', icon: Grid2x2, label: '2x2' },
    { id: '3x3', icon: Grid3X3, label: '3x3' },
    { id: '4x4', icon: Grid, label: '4x4' },
  ];

  return (
    <div className="flex items-center justify-between p-2 bg-[#131313] border-t border-[#2a2a2a]">
      <div className="flex bg-[#0d0d0d] p-1 border border-[#2a2a2a] rounded-[2px]">
        {layouts.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setLayout(id)}
            title={label}
            className={`p-1.5 rounded-[2px] transition-colors ${
              layout === id 
                ? 'bg-[#2563eb] text-white' 
                : 'text-[#8d90a0] hover:text-[#e5e2e1] hover:bg-[#1e1e1e]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
};
