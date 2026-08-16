import { Sidebar } from "@/components/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[var(--background)] text-[var(--text-main)] selection:bg-indigo-500/30 overflow-hidden relative transition-colors">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>
      
      <Sidebar />
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden pb-16 md:pb-0">
        {children}
      </div>
    </div>
  );
}
