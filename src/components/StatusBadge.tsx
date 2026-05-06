import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-sans rounded-[2px] border',
  {
    variants: {
      status: {
        online: 'bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/30',
        offline: 'bg-[#e03e3e]/10 text-[#e03e3e] border-[#e03e3e]/30',
        warning: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30',
        'no-signal': 'bg-[#8d90a0]/10 text-[#8d90a0] border-[#8d90a0]/30',
      },
    },
    defaultVariants: {
      status: 'offline',
    },
  }
);

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  status: 'online' | 'offline' | 'warning' | 'no-signal';
}

export const StatusBadge = ({ className, status, ...props }: StatusBadgeProps) => {
  return (
    <div className={cn(badgeVariants({ status }), className)} {...props}>
      <span className={cn(
        "w-1.5 h-1.5 mr-1.5 rounded-sm",
        status === 'online' ? "bg-[#16a34a]" : 
        status === 'offline' ? "bg-[#e03e3e]" : 
        status === 'warning' ? "bg-[#f59e0b]" : "bg-[#8d90a0]"
      )} />
      {status.replace('-', ' ')}
    </div>
  );
};
