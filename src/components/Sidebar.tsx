"use client";
import { AppView } from "@/lib/types";

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  isOpen?: boolean;
}

const navItems = [
  {
    id: AppView.SCRIPT_GEN,
    label: "0. Script Generator",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    accent: "emerald",
  },
  {
    id: AppView.EDITOR,
    label: "1. Script & Prompt",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    id: AppView.ASSETS,
    label: "2. Characters",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    id: AppView.EXPORT,
    label: "3. Export & Generate",
    icon: "M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
  },
];

export default function Sidebar({ currentView, onViewChange, isOpen = false }: SidebarProps) {
  return (
    <div
      className={`
        w-72 border-r border-white/5 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0 z-50
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
      `}
    >
      <div className="p-8 hidden sm:block">
        <div className="flex items-center gap-3 text-white font-black text-2xl tracking-tighter">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 rotate-3 text-sm">
            V4
          </div>
          <div className="flex flex-col leading-none">
            <span>VEOFLOW</span>
            <span className="text-[10px] text-indigo-500 font-bold tracking-[0.2em] mt-1">PROMPT ENGINE</span>
          </div>
        </div>
      </div>

      {/* Spacer on mobile to clear the top bar */}
      <div className="h-14 sm:hidden shrink-0" />

      <nav className="flex-1 px-4 space-y-2 pt-4 overflow-y-auto">
        <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">
          Production Pipeline
        </p>
        {navItems.map(item => {
          const isActive = currentView === item.id;
          const isEmerald = (item as any).accent === "emerald";
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
                isActive
                  ? isEmerald
                    ? "bg-emerald-900/40 text-emerald-400 shadow-xl border border-emerald-500/30 translate-x-2"
                    : "bg-zinc-900 text-white shadow-xl border border-white/10 translate-x-2"
                  : isEmerald
                  ? "text-emerald-500/70 hover:bg-emerald-900/20 hover:text-emerald-400 border border-transparent hover:border-emerald-500/10"
                  : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-left">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-6 pb-2">
          <p className="px-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">
            Video Engine
          </p>
          <div className="px-4 space-y-2">
            {["Veo 2", "Veo 3", "Veo 4"].map((model, i) => (
              <div key={model} className="flex items-center gap-3 py-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${i === 1 ? "bg-green-500 animate-pulse" : i === 2 ? "bg-indigo-500" : "bg-zinc-600"}`} />
                <span className={`text-xs font-bold ${i === 1 ? "text-zinc-300" : i === 2 ? "text-indigo-400" : "text-zinc-600"}`}>
                  {model}
                  {i === 1 && <span className="ml-2 text-[9px] text-green-500 uppercase">Active</span>}
                  {i === 2 && <span className="ml-2 text-[9px] text-indigo-400 uppercase">New</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="pt-4 pb-2">
          <div className="border-t border-white/5"></div>
        </div>

        {/* Guide button */}
        <button
          onClick={() => onViewChange(AppView.GUIDE)}
          className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${
            currentView === AppView.GUIDE
              ? "bg-emerald-900/40 text-emerald-400 shadow-xl border border-emerald-500/30 translate-x-2"
              : "text-zinc-500 hover:bg-emerald-900/20 hover:text-emerald-400 border border-transparent hover:border-emerald-500/10"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-left">User Guide / Hướng dẫn</span>
        </button>
      </nav>

      <div className="p-6 shrink-0">
        <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase">GPT-4o + Veo API</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Prompts via GPT-4o. Video export via Google Veo 2/3/4.
          </p>
        </div>
      </div>
    </div>
  );
}
