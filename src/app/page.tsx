"use client";
import { useState } from "react";
import { Project, AppView, VEO_STYLES } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import CharacterEditor from "@/components/CharacterEditor";
import ScriptProcessor from "@/components/ScriptProcessor";
import PromptExport from "@/components/PromptExport";

export default function Home() {
  const [view, setView] = useState<AppView>(AppView.EDITOR);
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

  const renderView = () => {
    switch (view) {
      case AppView.ASSETS:
        return <CharacterEditor project={project} onUpdate={updateProject} />;
      case AppView.EDITOR:
        return <ScriptProcessor project={project} onUpdate={updateProject} />;
      case AppView.EXPORT:
        return <PromptExport project={project} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-indigo-500/30">
      <Sidebar currentView={view} onViewChange={setView} />
      <main className="ml-72 min-h-screen">{renderView()}</main>
    </div>
  );
}
