"use client";
import { AppView } from "@/lib/types";

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const navItems = [
  { id: AppView.EDITOR, label: "1. Script & Prompt", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: AppView.ASSETS, label: "2. Characters", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { id: AppView.EXPORT, label: "3. Export Prompts", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
];

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <div className="w-72 border-r border-white/5 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 text-white font-black text-2xl tracking-tighter">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 rotate-3">V3</div>
          <div className="flex flex-col leading-none">
            <span>VEOFLOW</span>
            <span className="text-[10px] text-indigo-500 font-bold tracking-[0.2em] mt-1">PROMPT ENGINE</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 pt-4">
        <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Production Pipeline</p>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
              currentView === item.id
                ? "bg-zinc-900 text-white shadow-xl border border-white/10 translate-x-2"
                : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6">
        <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Powered by GPT-4o</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">Generate prompts server-side. API key secured on Vercel.</p>
        </div>
      </div>
    </div>
  );
}
