"use client";
import { useState } from "react";
import { Project, AppView, VEO_STYLES } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import CharacterEditor from "@/components/CharacterEditor";
import ScriptProcessor from "@/components/ScriptProcessor";
import PromptExport from "@/components/PromptExport";
import UserGuide from "@/components/UserGuide";

export default function Home() {
  const [view, setView] = useState<AppView>(AppView.EDITOR);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [project, setProject] = useState<Project>({
    id: "default",
    title: "New Veo Flow",
    script: "",
    style: VEO_STYLES[0],
    characters: [],
    clips: [],
    createdAt: Date.now(),
  });

  const updateProject = (updates: Partial<Project>) =>
    setProject(p => ({ ...p, ...updates }));

  const handleViewChange = (v: AppView) => {
    setView(v);
    setSidebarOpen(false);
  };

  const renderView = () => {
    switch (view) {
      case AppView.ASSETS:
        return <CharacterEditor project={project} onUpdate={updateProject} />;
      case AppView.EDITOR:
        return <ScriptProcessor project={project} onUpdate={updateProject} />;
      case AppView.EXPORT:
        return <PromptExport project={project} onUpdate={updateProject} />;
      case AppView.GUIDE:
        return <UserGuide />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-indigo-500/30">
      {/* Mobile top bar */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-zinc-950 border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-white font-black">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">V4</div>
          <span className="text-sm tracking-tighter">VEOFLOW</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-zinc-400 hover:text-white p-2 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        currentView={view}
        onViewChange={handleViewChange}
        isOpen={sidebarOpen}
      />

      <main className="sm:ml-72 min-h-screen pt-14 sm:pt-0">
        {renderView()}
      </main>
    </div>
  );
}
