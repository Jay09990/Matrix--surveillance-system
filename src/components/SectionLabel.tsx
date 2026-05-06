export const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="px-4 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
      <span className="text-[10px] font-bold tracking-widest text-[#8d90a0] uppercase">
        {children}
      </span>
    </div>
  );
};
