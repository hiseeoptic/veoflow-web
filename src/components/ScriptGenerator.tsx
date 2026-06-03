"use client";
import { useState } from "react";
import {
  Project,
  AppView,
  VEO_STYLES,
  SCRIPT_PLATFORMS,
  SCRIPT_TONES,
  ScriptPlatform,
  ScriptTone,
  ScriptLanguage,
  ScriptGenResult,
  ScriptIdea,
} from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  onSwitchView: (view: AppView) => void;
}

type Stage = "idle" | "bible" | "beats" | "scenes" | "done" | "error";

const STAGE_INFO: Record<Stage, { label: string; pct: number }> = {
  idle: { label: "Waiting", pct: 0 },
  bible: { label: "Stage 1/3: Building Story Bible (characters + locations)", pct: 25 },
  beats: { label: "Stage 2/3: Generating Beat Sheet (story structure)", pct: 55 },
  scenes: { label: "Stage 3/3: Writing scenes (dialogue + action)", pct: 85 },
  done: { label: "Complete!", pct: 100 },
  error: { label: "Error occurred", pct: 0 },
};

export default function ScriptGenerator({ project, onUpdate, onSwitchView }: Props) {
  // Form state
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<ScriptPlatform>("youtube");
  const [duration, setDuration] = useState(300);
  const [tone, setTone] = useState<ScriptTone>("storytelling");
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState<ScriptLanguage>("vi");
  const [style, setStyle] = useState(VEO_STYLES[0]);
  const [characterCount, setCharacterCount] = useState(2);
  const [customAngle, setCustomAngle] = useState("");
  const [hookStyle, setHookStyle] = useState<"auto" | "shocking" | "question" | "statement" | "visual">("auto");

  // Generation state
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ScriptGenResult | null>(null);
  const [expandedSection, setExpandedSection] = useState<"bible" | "beats" | "script" | null>("bible");

  const platformConfig = SCRIPT_PLATFORMS.find(p => p.id === platform)!;
  const sceneCount = Math.max(2, Math.ceil(duration / 8));

  const handlePlatformChange = (p: ScriptPlatform) => {
    setPlatform(p);
    const cfg = SCRIPT_PLATFORMS.find(x => x.id === p);
    if (cfg) setDuration(cfg.defaultSec);
  };

  const handleGenerate = async () => {
    if (!idea.trim()) {
      alert("Please enter your video idea first.");
      return;
    }
    setStage("bible");
    setErrorMsg("");
    setResult(null);

    const payload: ScriptIdea = {
      idea: idea.trim(),
      platform,
      durationSeconds: duration,
      tone,
      audience: audience.trim() || "general audience",
      language,
      style,
      characterCount,
      customAngle: customAngle.trim() || undefined,
      hookStyle,
    };

    // Stage progress simulation (real progress server-side, we estimate timing)
    const stageTimer = setTimeout(() => setStage("beats"), 10000);
    const stageTimer2 = setTimeout(() => setStage("scenes"), 20000);

    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data as ScriptGenResult);
      setStage("done");
    } catch (e: any) {
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);
      setStage("error");
      setErrorMsg(e.message || "Unknown error");
    }
  };

  const handlePushToEditor = () => {
    if (!result) return;
    const bible = result.storyBible;

    onUpdate({
      title: bible.log_line || project.title,
      script: result.script,
      characters: bible.characters,
      style,
      // Reset downstream artifacts since we have a new script
      masterManifest: undefined,
      clips: [],
    });

    onSwitchView(AppView.EDITOR);
  };

  const handlePushToCharacters = () => {
    if (!result) return;
    onUpdate({ characters: result.storyBible.characters });
    onSwitchView(AppView.ASSETS);
  };

  const copyScript = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.script);
  };

  const isGenerating = stage === "bible" || stage === "beats" || stage === "scenes";

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-zinc-900 border-l-4 border-emerald-500 rounded-r-[32px] p-6 sm:p-10 flex flex-col sm:flex-row gap-6 sm:gap-10 items-start sm:items-center shadow-2xl">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-500 rounded-[24px] sm:rounded-[32px] flex items-center justify-center shrink-0 shadow-2xl shadow-emerald-500/40 transform -rotate-6">
          <svg className="w-8 h-8 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter italic">
            SCRIPT GENERATOR <span className="text-emerald-400 font-mono text-[10px] sm:text-sm ml-2 not-italic">AI-POWERED</span>
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-3 max-w-2xl leading-relaxed font-medium">
            Multi-stage pipeline: <span className="text-emerald-400 font-bold">Story Bible</span> → <span className="text-emerald-400 font-bold">Beat Sheet</span> → <span className="text-emerald-400 font-bold">Scene-by-scene Script</span>. Auto-push to VeoFlow pipeline.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-950 border border-white/5 rounded-[24px] p-5 sm:p-6 space-y-4">
            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Your Idea</h3>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Video Idea / Concept</label>
              <textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                rows={4}
                disabled={isGenerating}
                className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-200 outline-none focus:border-emerald-500/40 resize-none disabled:opacity-50"
                placeholder={language === "vi"
                  ? "VD: Video về cách AI đang thay đổi ngành y tế qua câu chuyện của một bác sĩ và bệnh nhân của cô ấy..."
                  : "E.g. A video about how AI is changing healthcare through the story of a doctor and her patient..."}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Platform</label>
                <select
                  value={platform}
                  onChange={e => handlePlatformChange(e.target.value as ScriptPlatform)}
                  disabled={isGenerating}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                >
                  {SCRIPT_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                  Duration ({duration}s · {sceneCount} scenes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={900}
                  step={15}
                  value={duration}
                  onChange={e => setDuration(Math.max(15, Math.min(900, parseInt(e.target.value) || 60)))}
                  disabled={isGenerating}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                />
                <p className="text-[9px] text-zinc-600 mt-1">Range: {platformConfig.range}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Tone</label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as ScriptTone)}
                  disabled={isGenerating}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                >
                  {SCRIPT_TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Language</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value as ScriptLanguage)}
                  disabled={isGenerating}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Visual Style</label>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  disabled={isGenerating}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                >
                  {VEO_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Characters ({characterCount})</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={characterCount}
                  onChange={e => setCharacterCount(parseInt(e.target.value))}
                  disabled={isGenerating}
                  className="w-full disabled:opacity-50 accent-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Target Audience</label>
              <input
                type="text"
                value={audience}
                onChange={e => setAudience(e.target.value)}
                disabled={isGenerating}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                placeholder={language === "vi" ? "VD: dân văn phòng 25-35 tuổi" : "E.g., professionals aged 25-35"}
              />
            </div>

            <details className="group">
              <summary className="cursor-pointer text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                Advanced Options ▾
              </summary>
              <div className="mt-3 space-y-3 pt-3 border-t border-white/5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Custom Angle (optional)</label>
                  <input
                    type="text"
                    value={customAngle}
                    onChange={e => setCustomAngle(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/40 disabled:opacity-50"
                    placeholder={language === "vi" ? "VD: kể từ góc nhìn của bệnh nhân" : "E.g., from patient's perspective"}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Hook Style</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(["auto", "shocking", "question", "statement", "visual"] as const).map(h => (
                      <button
                        key={h}
                        onClick={() => setHookStyle(h)}
                        disabled={isGenerating}
                        className={`px-2 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                          hookStyle === h
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-900 text-zinc-500 hover:text-white"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !idea.trim()}
              className={`w-full py-4 sm:py-5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all shadow-2xl ${
                isGenerating
                  ? "bg-zinc-800 text-zinc-500 cursor-wait"
                  : !idea.trim()
                  ? "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-[0.98]"
              }`}
            >
              {isGenerating ? "GENERATING SCRIPT..." : "✨ GENERATE SCRIPT"}
            </button>

            {/* Progress */}
            {(isGenerating || stage === "done" || stage === "error") && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    stage === "error" ? "text-red-400" : stage === "done" ? "text-green-400" : "text-emerald-400"
                  }`}>
                    {STAGE_INFO[stage].label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">{STAGE_INFO[stage].pct}%</span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      stage === "error" ? "bg-red-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${STAGE_INFO[stage].pct}%` }}
                  />
                </div>
                {errorMsg && (
                  <p className="text-[11px] text-red-400 font-mono mt-2">{errorMsg}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Generated Result */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !isGenerating && (
            <div className="bg-zinc-950 border border-white/5 rounded-[24px] p-10 sm:p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-2 border-zinc-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                </svg>
              </div>
              <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">No script generated yet</p>
              <p className="text-xs text-zinc-600 mt-2 max-w-md mx-auto">Fill in your idea on the left and click Generate. AI will produce Story Bible → Beat Sheet → Full Script.</p>
            </div>
          )}

          {isGenerating && !result && (
            <div className="bg-zinc-950 border border-emerald-500/20 rounded-[24px] p-10 sm:p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-6 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">{STAGE_INFO[stage].label}</p>
              <p className="text-xs text-zinc-500 mt-2">This may take 30-90 seconds for {sceneCount} scenes...</p>
            </div>
          )}

          {result && (
            <>
              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={handlePushToEditor}
                  className="px-3 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/30 transition-all"
                >
                  → EDITOR
                </button>
                <button
                  onClick={handlePushToCharacters}
                  className="px-3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all"
                >
                  → CHARACTERS
                </button>
                <button
                  onClick={copyScript}
                  className="px-3 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  COPY SCRIPT
                </button>
                <button
                  onClick={() => { setResult(null); setStage("idle"); }}
                  className="px-3 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                >
                  NEW
                </button>
              </div>

              {/* Metadata Bar */}
              <div className="bg-zinc-950 border border-emerald-500/20 rounded-2xl p-4 flex flex-wrap gap-3 sm:gap-6 text-[10px] font-mono">
                <div><span className="text-zinc-500">Scenes:</span> <span className="text-emerald-400 font-black">{result.metadata.sceneCount}</span></div>
                <div><span className="text-zinc-500">Duration:</span> <span className="text-emerald-400 font-black">{result.metadata.estimatedDuration}</span></div>
                <div><span className="text-zinc-500">Characters:</span> <span className="text-emerald-400 font-black">{result.storyBible.characters.length}</span></div>
                <div><span className="text-zinc-500">Locations:</span> <span className="text-emerald-400 font-black">{result.storyBible.locations.length}</span></div>
                <div><span className="text-zinc-500">Beats:</span> <span className="text-emerald-400 font-black">{result.beatSheet.length}</span></div>
              </div>

              {/* Story Bible Section */}
              <Section
                title="📖 Story Bible"
                isOpen={expandedSection === "bible"}
                onToggle={() => setExpandedSection(expandedSection === "bible" ? null : "bible")}
              >
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Log Line</span>
                    <p className="text-zinc-300 italic">&quot;{result.storyBible.log_line}&quot;</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Premise</span>
                    <p className="text-zinc-400">{result.storyBible.premise}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Hook Strategy</span>
                    <p className="text-zinc-400">{result.storyBible.hook_strategy}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Characters</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {result.storyBible.characters.map(c => (
                        <div key={c.id} className="bg-black/40 rounded-xl p-3 border border-white/5">
                          <p className="text-white font-black text-xs">{c.name} <span className="text-zinc-600 font-normal text-[10px] ml-1">{c.gender} · {c.age_group}</span></p>
                          <p className="text-zinc-500 text-[10px] mt-1">{c.clothing}</p>
                          <p className="text-emerald-500 text-[9px] mt-1 font-mono">🎙️ {c.voice_profile_id}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Locations</span>
                    <div className="space-y-1.5 mt-2">
                      {result.storyBible.locations.map(l => (
                        <div key={l.location_id} className="bg-black/40 rounded-xl p-3 border border-white/5">
                          <p className="text-white font-black text-xs">{l.display_name}</p>
                          <p className="text-zinc-500 text-[10px] mt-1">{l.description}</p>
                          {l.archetype_ref && <p className="text-indigo-400 text-[9px] mt-1 font-mono">⚙️ {l.archetype_ref}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Beat Sheet Section */}
              <Section
                title="🎯 Beat Sheet"
                isOpen={expandedSection === "beats"}
                onToggle={() => setExpandedSection(expandedSection === "beats" ? null : "beats")}
              >
                <div className="space-y-2">
                  {result.beatSheet.map(b => (
                    <div key={b.beat_id} className="bg-black/40 rounded-xl p-3 border-l-2 border-emerald-500/40">
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-white font-black text-xs">{b.beat_name}</p>
                        <span className="text-emerald-400 text-[9px] font-mono shrink-0">{b.scene_range} · {b.percentage}%</span>
                      </div>
                      <p className="text-zinc-500 text-[10px] mt-1">{b.description}</p>
                      <p className="text-indigo-400 text-[9px] mt-1 italic">↳ {b.emotional_intent}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Script Section */}
              <Section
                title="📝 Full Script"
                isOpen={expandedSection === "script"}
                onToggle={() => setExpandedSection(expandedSection === "script" ? null : "script")}
              >
                <pre className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap bg-black rounded-xl p-4 max-h-96 overflow-y-auto border border-white/5">
                  {result.script}
                </pre>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  isOpen,
  onToggle,
  children,
}: { title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950 border border-white/5 rounded-[24px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors"
      >
        <h3 className="text-xs font-black text-white uppercase tracking-widest">{title}</h3>
        <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
