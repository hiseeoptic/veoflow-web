"use client";
import { useState, useEffect, useRef } from "react";
import { Project, VideoClip, VEO_STYLES } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

type LogEntry = { msg: string; type: "info" | "success" | "warning" | "error"; time: string };

export default function ScriptProcessor({ project, onUpdate }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [expandedClip, setExpandedClip] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [manifestStatus, setManifestStatus] = useState<"missing" | "creating" | "ready">(
    project.masterManifest ? "ready" : "missing"
  );
  const [scriptInput, setScriptInput] = useState(project.script);
  const isProcessingRef = useRef(false);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsProcessing(false);
    isProcessingRef.current = false;
    setManifestStatus(project.masterManifest ? "ready" : "missing");
    setScriptInput(project.script);
  }, [project.id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scriptInput !== project.script) onUpdate({ script: scriptInput });
    }, 500);
    return () => clearTimeout(timeout);
  }, [scriptInput]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executionLogs]);

  const addLog = (msg: string, type: LogEntry["type"] = "info") => {
    setExecutionLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleInitializeProject = async () => {
    if (!project.script) { alert("Please enter a script first."); return; }
    setManifestStatus("creating");
    setStatusMessage("Initializing Project DNA...");
    setShowTerminal(true);
    setExecutionLogs([]);
    addLog("Starting Project Initialization...", "info");

    try {
      const res = await fetch("/api/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onUpdate({ masterManifest: data.manifest });
      setManifestStatus("ready");
      setStatusMessage("DNA Locked.");
      addLog("Project DNA Initialized Successfully.", "success");
    } catch (e: any) {
      addLog(`Manifest Creation Failed: ${e.message}`, "error");
      alert("Error creating Manifest: " + e.message);
      setManifestStatus("missing");
      setStatusMessage("Manifest creation failed.");
    }
  };

  const stopProcessing = () => {
    isProcessingRef.current = false;
    setIsProcessing(false);
    setStatusMessage("Force Stopped by User.");
    addLog("Process force stopped by user.", "warning");
  };

  const handleProcessScript = async (mode: "analyze" | "generate") => {
    if (!project.script || !project.masterManifest) return;
    setIsProcessing(true);
    isProcessingRef.current = true;
    setShowTerminal(true);

    if (mode === "analyze") {
      setExecutionLogs([]);
      addLog("Starting Script Segmentation...", "info");
      onUpdate({ clips: [] });
      setProgress(null);

      try {
        setStatusMessage("Analyzing script structure...");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!isProcessingRef.current) return;
        onUpdate({ clips: data.clips });
        addLog(`Segmentation Complete. Found ${data.clips.length} clips.`, "success");
        setStatusMessage("Segmentation done. Ready to generate.");
      } catch (error: any) {
        addLog(`Segmentation Error: ${error.message}`, "error");
        setStatusMessage("Error occurred.");
      } finally {
        setIsProcessing(false);
        isProcessingRef.current = false;
      }
    } else if (mode === "generate") {
      const pendingClips = project.clips.filter(c => c.status === "pending" || c.status === "failed");
      if (pendingClips.length === 0) {
        addLog("No pending clips to generate.", "warning");
        setIsProcessing(false);
        return;
      }

      addLog(`Resuming Generation for ${pendingClips.length} clips...`, "info");
      setProgress({ current: project.clips.length - pendingClips.length, total: project.clips.length });
      const finalClips = [...project.clips];
      const manifest = project.masterManifest!;

      try {
        for (let i = 0; i < finalClips.length; i++) {
          if (finalClips[i].status === "completed") continue;
          if (!isProcessingRef.current) { addLog("Sequence aborted by user.", "warning"); break; }

          setStatusMessage(`Generating prompt for Clip ${i + 1}/${finalClips.length}...`);
          addLog(`Generating Prompt for Clip ${i + 1}/${finalClips.length}...`, "info");

          const prevContext = i > 0 ? JSON.stringify(finalClips[i - 1].final_json_output?.visual_prompt) : undefined;

          const res = await fetch("/api/generate-clip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project, targetClip: finalClips[i], masterManifest: manifest, previousClipContext: prevContext })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);

          finalClips[i] = data.clip;
          onUpdate({ clips: [...finalClips] });
          setProgress({ current: i + 1, total: finalClips.length });

          if (data.clip.status === "failed") {
            addLog(`Clip ${i + 1} FAILED: ${data.clip.errorLog}`, "error");
          } else {
            addLog(`Clip ${i + 1} SUCCESS (${data.clip.flattenedPrompt?.length || 0} chars)`, "success");
          }

          if (i < finalClips.length - 1 && isProcessingRef.current) {
            const waitTime = i % 5 === 0 ? 3000 : 1000;
            setStatusMessage(`Rate limit cooldown (${waitTime}ms)...`);
            await new Promise(r => setTimeout(r, waitTime));
          }
        }
        if (isProcessingRef.current) {
          setStatusMessage("Sequence generation complete.");
          addLog("BATCH GENERATION COMPLETED.", "success");
        }
      } catch (error: any) {
        addLog(`Generation Error: ${error.message}`, "error");
      } finally {
        setIsProcessing(false);
        isProcessingRef.current = false;
        setProgress(null);
      }
    }
  };

  const handleRegenerateSingle = async (e: React.MouseEvent, clip: VideoClip, index: number) => {
    e.stopPropagation();
    if (!project.masterManifest) return;
    setRegeneratingId(clip.id);
    setShowTerminal(true);
    addLog(`Regenerating Clip ${index + 1}...`, "info");
    const prevContext = index > 0 ? JSON.stringify(project.clips[index - 1].final_json_output?.visual_prompt) : undefined;

    try {
      const res = await fetch("/api/generate-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, targetClip: clip, masterManifest: project.masterManifest, previousClipContext: prevContext })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newClips = [...project.clips];
      newClips[index] = data.clip;
      onUpdate({ clips: newClips });
      addLog(`Regenerated Clip ${index + 1} successfully.`, "success");
    } catch (error: any) {
      addLog(`Regeneration Failed: ${error.message}`, "error");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      project_title: project.title,
      master_manifest: project.masterManifest,
      generated_clips: project.clips.map(c => c.final_json_output).filter(Boolean)
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veo_flow_sequence_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="max-w-[1600px] mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6 min-h-[calc(100dvh-56px)] sm:h-[calc(100vh-0px)] sm:min-h-0 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-950 border border-white/5 p-5 sm:p-8 rounded-[24px] sm:rounded-[40px] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-1.5 sm:w-2 h-full bg-indigo-600"></div>
        <div className="pl-2">
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tighter italic flex items-center gap-3 uppercase">
            VEOFLOW
            <span className="text-indigo-500 font-mono not-italic text-[10px] sm:text-xs tracking-[0.4em]">v18.0</span>
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-6">
            <select
              value={project.style}
              onChange={e => onUpdate({ style: e.target.value })}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-zinc-400 outline-none uppercase cursor-pointer"
            >
              {VEO_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${manifestStatus === "ready" ? "bg-green-500" : "bg-red-500 animate-pulse"}`}></div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {manifestStatus === "ready" ? "DNA LOCKED" : manifestStatus === "creating" ? "INIT..." : "NO DNA"}
              </span>
            </div>
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border transition-all ${
                showTerminal ? "bg-zinc-800 border-zinc-600 text-white" : "bg-transparent border-zinc-800 text-zinc-500"
              }`}
            >
              {showTerminal ? "HIDE LOG" : "LOG"}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          {statusMessage && (
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
              {statusMessage}
            </div>
          )}
          {progress && (
            <div className="w-full sm:w-48 bg-zinc-900 rounded-full h-2 overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {manifestStatus === "missing" && (
              <button onClick={handleInitializeProject} disabled={!project.script}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[16px] font-black text-[10px] tracking-widest transition-all disabled:opacity-40">
                1. INIT DNA
              </button>
            )}
            {isProcessing ? (
              <button onClick={stopProcessing}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-[16px] font-black text-[10px] tracking-widest transition-all shadow-xl shadow-red-600/20">
                FORCE STOP
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.clips.length === 0 ? (
                  <button onClick={() => handleProcessScript("analyze")} disabled={manifestStatus !== "ready"}
                    className={`px-8 py-3 rounded-[16px] font-black text-[10px] tracking-widest transition-all ${
                      manifestStatus !== "ready"
                        ? "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20"
                    }`}>
                    2. ANALYZE
                  </button>
                ) : (
                  <>
                    <button onClick={() => { if (confirm("Reset all clips?")) handleProcessScript("analyze"); }}
                      className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-[16px] font-black text-[10px] tracking-widest transition-all">
                      RESET
                    </button>
                    <button onClick={() => handleProcessScript("generate")}
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[16px] font-black text-[10px] tracking-widest transition-all shadow-xl shadow-indigo-600/20">
                      {project.clips.some(c => c.status === "pending") ? "RESUME" : "REGEN ALL"}
                    </button>
                  </>
                )}
              </div>
            )}
            {project.clips.length > 0 && !isProcessing && (
              <button onClick={handleExportJson}
                className="px-5 py-3 bg-green-600 hover:bg-green-500 text-white rounded-[16px] font-black text-[10px] tracking-widest transition-all shadow-xl shadow-green-600/20">
                JSON
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8 min-h-0 relative">
        {/* Script Input */}
        <div className="col-span-1 lg:col-span-4 flex flex-col min-h-0" style={{ minHeight: "200px" }}>
          <p className="mb-2 px-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">Input Script</p>
          <textarea
            value={scriptInput}
            onChange={e => setScriptInput(e.target.value)}
            className="flex-1 w-full bg-black/40 border border-zinc-900 rounded-[24px] sm:rounded-[48px] p-6 sm:p-10 text-zinc-400 text-sm sm:text-base leading-relaxed focus:border-indigo-500/20 outline-none resize-none font-medium"
            style={{ minHeight: "180px" }}
            placeholder="Paste your script here..."
          />
        </div>

        {/* Clip Output */}
        <div className="col-span-1 lg:col-span-8 flex flex-col min-h-0 relative" style={{ minHeight: "300px" }}>
          <div className="flex justify-between items-center mb-2 px-4">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Live Clip Output</p>
            {project.masterManifest?.character_manifests?.[0] && (
              <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-white/5 truncate max-w-[160px] sm:max-w-xs">
                Lock: {project.masterManifest.character_manifests[0].visual_dna_full?.substring(0, 25)}...
              </span>
            )}
          </div>

          <div className="flex-1 bg-zinc-950 border border-white/5 rounded-[32px] sm:rounded-[56px] overflow-hidden flex flex-col shadow-2xl relative">
            {project.clips.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-4 py-16">
                <div className="w-10 h-10 border-2 border-white/20 rounded-full border-t-indigo-500 animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Ready to Sequence</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4">
                {project.clips.map((clip, idx) => {
                  const isPending = clip.status === "pending";
                  const isFailed = clip.status === "failed";
                  const jsonReady = !!clip.final_json_output;

                  return (
                    <div key={clip.id} className={`border rounded-[20px] sm:rounded-[32px] overflow-hidden transition-all duration-500 ${
                      isFailed ? "border-red-500/50 bg-red-900/10" : isPending ? "bg-zinc-900/10 border-white/5 opacity-50" : "bg-zinc-900/40 border-white/10 hover:border-indigo-500/30"
                    }`}>
                      <div
                        onClick={() => !isPending && setExpandedClip(expandedClip === clip.id ? null : clip.id)}
                        className={`px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between gap-3 ${isPending ? "cursor-wait" : "cursor-pointer"}`}
                      >
                        <div className="flex items-center gap-4 sm:gap-8 flex-1 min-w-0">
                          <div className="flex flex-col items-center w-8 sm:w-12 shrink-0">
                            <span className="text-[8px] font-black text-zinc-700 uppercase">Seq</span>
                            <span className="text-base sm:text-lg font-mono text-white font-black">{clip.sequence}</span>
                          </div>
                          <div className="flex flex-col flex-1 min-w-0 gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                isFailed ? "text-red-400 bg-red-900/20" : jsonReady ? "text-green-400 bg-green-900/20" : "text-zinc-500 bg-zinc-800"
                              }`}>
                                {isFailed ? "FAIL" : jsonReady ? "PASS" : "..."}
                              </span>
                              {clip.characterId && <span className="text-[9px] font-bold text-zinc-500 uppercase hidden sm:inline">{clip.characterId}</span>}
                              {/* PHASE 3: Critic Drift Badge */}
                              {clip.criticReport && (
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    clip.criticReport.verdict === "pass"
                                      ? "text-emerald-400 bg-emerald-900/30"
                                      : clip.criticReport.verdict === "warning"
                                      ? "text-yellow-400 bg-yellow-900/30"
                                      : "text-red-400 bg-red-900/30"
                                  }`}
                                  title={`Critic: ${clip.criticReport.issues?.length || 0} issues, iter ${clip.criticReport.iteration || 1}`}
                                >
                                  🔍 DRIFT {(clip.criticReport.drift_score * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-300 truncate font-medium">&quot;{clip.scriptSegment}&quot;</p>
                            {isFailed && <p className="text-[10px] text-red-400 font-mono mt-1 truncate">{clip.errorLog}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isPending ? (
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); if (clip.flattenedPrompt) copyToClipboard(clip.flattenedPrompt); }}
                                className="hidden sm:block text-[9px] font-black text-zinc-500 hover:text-white uppercase border border-zinc-700 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all">
                                COPY
                              </button>
                              <button onClick={e => handleRegenerateSingle(e, clip, idx)} disabled={regeneratingId === clip.id}
                                className="p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                                <svg className={`w-4 h-4 ${regeneratingId === clip.id ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                              <svg className={`w-4 h-4 text-zinc-600 transition-transform ${expandedClip === clip.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </div>
                      </div>

                      {expandedClip === clip.id && !isPending && clip.final_json_output && (
                        <div className="px-4 sm:px-8 pb-6 pt-0">
                          <div className="bg-black/40 rounded-2xl p-4 sm:p-6 border border-white/5 space-y-4">
                            <div>
                              <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-2">Structured Visual Prompt (JSON)</span>
                              <pre className="text-[10px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto p-4 bg-zinc-950 rounded-xl border border-white/5 max-h-48 overflow-y-auto">
                                {JSON.stringify(clip.final_json_output.visual_prompt, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-indigo-400 uppercase block mb-2">Flattened for Veo</span>
                              <p className="text-[10px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap border-l-2 border-indigo-500 pl-4 max-h-36 overflow-y-auto">
                                {clip.flattenedPrompt}
                              </p>
                            </div>
                            {/* PHASE 3: Critic Report Detail */}
                            {clip.criticReport && (
                              <div>
                                <span className={`text-[9px] font-bold uppercase block mb-2 ${
                                  clip.criticReport.verdict === "pass" ? "text-emerald-400" :
                                  clip.criticReport.verdict === "warning" ? "text-yellow-400" : "text-red-400"
                                }`}>
                                  🔍 VLM Critic Report — Drift {(clip.criticReport.drift_score * 100).toFixed(0)}% · {clip.criticReport.verdict.toUpperCase()}
                                </span>
                                {clip.criticReport.issues && clip.criticReport.issues.length > 0 ? (
                                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {clip.criticReport.issues.map((issue, i) => (
                                      <div key={i} className="text-[10px] bg-black/40 rounded-lg p-2.5 border-l-2 border-zinc-700">
                                        <div className="flex gap-2 items-start">
                                          <span className={`font-black uppercase shrink-0 text-[9px] px-1.5 py-0.5 rounded ${
                                            issue.severity === "high" ? "bg-red-900/40 text-red-400" :
                                            issue.severity === "medium" ? "bg-yellow-900/40 text-yellow-400" :
                                            "bg-zinc-800 text-zinc-500"
                                          }`}>{issue.severity}</span>
                                          <span className="text-zinc-500 font-bold uppercase text-[9px]">{issue.category}</span>
                                        </div>
                                        <p className="text-zinc-400 mt-1.5">{issue.description}</p>
                                        <p className="text-emerald-500 mt-1 italic">↳ Fix: {issue.suggested_fix}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-emerald-500 italic">No drift detected. Clip passes all consistency checks.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="absolute inset-x-0 sm:inset-x-6 bottom-0 sm:bottom-6 h-56 sm:h-64 bg-black/95 border border-zinc-800 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col z-20 backdrop-blur-md">
              <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Execution Log</span>
                </div>
                <button onClick={() => setShowTerminal(false)} className="text-zinc-500 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto font-mono text-[10px] space-y-1">
                {executionLogs.length === 0 && <div className="text-zinc-600 italic">Waiting for process...</div>}
                {executionLogs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0 hidden sm:inline">[{log.time}]</span>
                    <span className={`${
                      log.type === "error" ? "text-red-500 font-bold" :
                      log.type === "success" ? "text-green-500 font-bold" :
                      log.type === "warning" ? "text-yellow-500" : "text-zinc-300"
                    }`}>
                      {log.msg}
                    </span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
