"use client";
import { useState } from "react";
import { Project } from "@/lib/types";

interface Props {
  project: Project;
}

export default function PromptExport({ project }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const completedClips = project.clips.filter(c => c.status === "completed" && c.flattenedPrompt);

  const copyToClipboard = (text: string, clipId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(clipId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllPrompts = () => {
    const allPrompts = completedClips
      .map((c, i) => `=== CLIP ${c.sequence} (8s) ===\n${c.flattenedPrompt}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(allPrompts);
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportAllAsJson = () => {
    const exportData = {
      project_title: project.title,
      style: project.style,
      total_clips: completedClips.length,
      estimated_duration: `${completedClips.length * 8}s (~${Math.round(completedClips.length * 8 / 60)} min)`,
      master_manifest: project.masterManifest,
      clips: completedClips.map(c => ({
        sequence: c.sequence,
        character: c.characterId,
        action: c.actionSummary,
        flattened_prompt: c.flattenedPrompt,
        full_json: c.final_json_output
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veoflow_prompts_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const text = completedClips
      .map(c => `=== CLIP ${c.sequence} | ${c.characterId} | ${c.actionSummary} ===\n\n${c.flattenedPrompt}`)
      .join("\n\n" + "=".repeat(80) + "\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veoflow_prompts_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-zinc-900 p-6 rounded-[32px] border border-white/5 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white italic">
            PROMPT EXPORT <span className="text-indigo-500 font-mono not-italic text-sm ml-2">FOR VEO 3 FLOW</span>
          </h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
            {completedClips.length} clips ready | ~{Math.round(completedClips.length * 8 / 60)} min total duration
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={copyAllPrompts}
            className={`px-6 py-3 rounded-2xl font-black text-xs tracking-widest transition-all ${
              copiedId === "all" ? "bg-green-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"
            }`}>
            {copiedId === "all" ? "COPIED!" : "COPY ALL PROMPTS"}
          </button>
          <button onClick={exportAsText}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-2xl text-xs tracking-widest shadow-xl shadow-indigo-500/20">
            EXPORT .TXT
          </button>
          <button onClick={exportAllAsJson}
            className="bg-green-600 hover:bg-green-500 text-white font-black px-6 py-3 rounded-2xl text-xs tracking-widest shadow-xl shadow-green-500/20">
            EXPORT .JSON
          </button>
        </div>
      </div>

      {/* Clips List */}
      {completedClips.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-30">
            <div className="w-20 h-20 border-2 border-white/20 rounded-full border-t-indigo-500 animate-spin mx-auto mb-6"></div>
            <p className="text-sm font-black uppercase tracking-widest">No prompts generated yet</p>
            <p className="text-xs text-zinc-500 mt-2">Go to Script & Prompt tab to generate clips first</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {completedClips.map((clip, idx) => (
            <div key={clip.id} className="bg-zinc-900/40 border border-white/10 rounded-[32px] overflow-hidden hover:border-indigo-500/30 transition-all">
              <div className="px-8 py-5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-zinc-700 uppercase">Clip</span>
                    <span className="text-xl font-mono text-white font-black">{clip.sequence}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-green-400 bg-green-900/20 px-2 py-0.5 rounded uppercase">READY</span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">{clip.characterId}</span>
                      <span className="text-[9px] font-bold text-zinc-600">8s</span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-1 truncate max-w-lg">{clip.actionSummary}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => copyToClipboard(clip.flattenedPrompt, clip.id)}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      copiedId === clip.id ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}>
                    {copiedId === clip.id ? "COPIED!" : "COPY PROMPT"}
                  </button>
                  <button onClick={() => copyToClipboard(JSON.stringify(clip.final_json_output, null, 2), clip.id + "-json")}
                    className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-white transition-all">
                    JSON
                  </button>
                </div>
              </div>
              <div className="px-8 py-5">
                <p className="text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {clip.flattenedPrompt.substring(0, 500)}{clip.flattenedPrompt.length > 500 ? "..." : ""}
                </p>
                <div className="mt-3 flex items-center gap-4 text-[9px] text-zinc-600">
                  <span>{clip.flattenedPrompt.length.toLocaleString()} chars</span>
                  {clip.continuity_snapshot?.lock_hash && (
                    <span className="text-indigo-500">Hash: {clip.continuity_snapshot.lock_hash.substring(0, 12)}...</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
