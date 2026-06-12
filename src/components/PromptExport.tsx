"use client";
import { useState, useCallback } from "react";
import { Project, VideoClip, VEO_MODELS, VEO_ASPECT_RATIOS, VideoGenStatus } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

type VideoState = {
  status: VideoGenStatus;
  operationName?: string;
  error?: string;
};

const MODEL_ID_DEFAULT = "veo-2.0-generate-001";
const POLL_INTERVAL_MS = 6000;

/**
 * PHASE 2: Extract the last frame of a video as a base64 PNG.
 * Used to chain clip N's final frame as clip N+1's first frame for seamless continuity.
 */
async function extractLastFrameFromVideo(videoUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.src = videoUrl;

    const timeout = setTimeout(() => resolve(null), 30000);

    video.addEventListener("loadedmetadata", () => {
      // Seek to the very last frame (duration - 0.05s for safety)
      video.currentTime = Math.max(0, video.duration - 0.1);
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        clearTimeout(timeout);
        resolve(dataUrl);
      } catch (err) {
        clearTimeout(timeout);
        resolve(null);
      }
    });

    video.addEventListener("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export default function PromptExport({ project, onUpdate }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState(MODEL_ID_DEFAULT);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(8);
  const [videoStates, setVideoStates] = useState<Record<string, VideoState>>({});
  const [activeTab, setActiveTab] = useState<"prompts" | "videos">("prompts");
  // PHASE 2: Toggle for frame chaining
  const [chainFrames, setChainFrames] = useState(true);

  const completedClips = project.clips.filter(c => c.status === "completed" && c.flattenedPrompt);

  const setClipVideoState = (clipId: string, state: Partial<VideoState>) =>
    setVideoStates(prev => ({ ...prev, [clipId]: { ...prev[clipId], ...state } }));

  const copyToClipboard = (text: string, clipId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(clipId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllPrompts = () => {
    const allPrompts = completedClips
      .map(c => `=== CLIP ${c.sequence} (8s) ===\n${c.flattenedPrompt}`)
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
      estimated_duration: `${completedClips.length * 8}s`,
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

  /**
   * PHASE 2: After a clip is ready, extract its last frame for chaining.
   * Returns a promise that resolves when the frame is extracted and stored.
   */
  const extractAndStoreLastFrame = useCallback(async (clipId: string, videoUri: string): Promise<string | null> => {
    try {
      const proxiedUrl = `/api/video-download?uri=${encodeURIComponent(videoUri)}&inline=1`;
      const lastFrame = await extractLastFrameFromVideo(proxiedUrl);
      if (lastFrame) {
        const newClips = project.clips.map(c =>
          c.id === clipId ? { ...c, lastFrameBase64: lastFrame } : c
        );
        onUpdate({ clips: newClips });
      }
      return lastFrame;
    } catch (e) {
      console.warn("Frame extraction failed:", e);
      return null;
    }
  }, [project.clips, onUpdate]);

  const pollVideoStatus = useCallback(async (clipId: string, operationName: string) => {
    const maxAttempts = 60;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

      try {
        const res = await fetch(`/api/video-status?operation=${encodeURIComponent(operationName)}`);
        const data = await res.json();

        if (data.error) {
          setClipVideoState(clipId, { status: "failed", error: data.error });
          return;
        }

        if (data.done) {
          if (data.videoUri) {
            setClipVideoState(clipId, { status: "ready" });
            const newClips = project.clips.map(c =>
              c.id === clipId ? { ...c, videoUri: data.videoUri, videoStatus: "ready" as VideoGenStatus } : c
            );
            onUpdate({ clips: newClips });

            // PHASE 2: Extract last frame in background for chaining
            if (chainFrames) {
              setTimeout(() => extractAndStoreLastFrame(clipId, data.videoUri), 1500);
            }
          } else {
            setClipVideoState(clipId, { status: "failed", error: data.error || "No video URI returned." });
          }
          return;
        }
      } catch (e: any) {
        setClipVideoState(clipId, { status: "failed", error: e.message });
        return;
      }
    }
    setClipVideoState(clipId, { status: "failed", error: "Timed out waiting for video." });
  }, [project.clips, onUpdate, chainFrames, extractAndStoreLastFrame]);

  const generateVideo = async (clip: VideoClip, firstFrameOverride?: string) => {
    if (!clip.flattenedPrompt) return;
    setClipVideoState(clip.id, { status: "queued" });

    try {
      // PHASE 1+3+USER_TOGGLE: Find character reference image for I2V
      // Priority: masterFrameBase64 > imageBase64
      // Only used if character.useAsVeoReference !== false (default true if image exists)
      const character = project.characters.find(c => c.id === clip.characterId);
      const hasImage = !!(character?.masterFrameBase64 || character?.imageBase64);
      const useRef = character?.useAsVeoReference !== undefined
        ? character.useAsVeoReference
        : hasImage; // default ON if image exists
      const referenceImage = useRef
        ? (character?.masterFrameBase64 || character?.imageBase64)
        : undefined;

      // PHASE 2: Frame chaining - prefer previous clip's last frame over character image
      let firstFrameImage = firstFrameOverride;
      if (chainFrames && !firstFrameImage) {
        const currentIdx = project.clips.findIndex(c => c.id === clip.id);
        if (currentIdx > 0) {
          const prevClip = project.clips[currentIdx - 1];
          if (prevClip.lastFrameBase64) {
            firstFrameImage = prevClip.lastFrameBase64;
          }
        }
      }

      // Negative prompt
      const negativePrompt = clip.negativePrompt
        || clip.final_json_output?.visual_prompt?.negative_prompt
        || "no text overlays, no watermarks, no subtitles, no cartoon effects, no unrealistic proportions, no blurry faces, no extra fingers, no facial hair changes, do not alter hair length or color, do not change outfit, do not remove accessories, no random props";

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: clip.flattenedPrompt,
          modelId: selectedModelId,
          durationSeconds: duration,
          aspectRatio,
          referenceImage,
          firstFrameImage,   // PHASE 2: chain from previous clip's last frame
          negativePrompt,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Store firstFrame on the clip for traceability
      if (firstFrameImage) {
        const newClips = project.clips.map(c =>
          c.id === clip.id ? { ...c, firstFrameBase64: firstFrameImage } : c
        );
        onUpdate({ clips: newClips });
      }

      setClipVideoState(clip.id, { status: "generating", operationName: data.operationName });
      pollVideoStatus(clip.id, data.operationName);
    } catch (e: any) {
      setClipVideoState(clip.id, { status: "failed", error: e.message });
    }
  };

  /**
   * PHASE 2: Sequential generation with frame chaining.
   * Each clip waits for the previous one to finish AND extract its last frame
   * before starting, ensuring true seamless continuity.
   */
  const generateAllVideos = async () => {
    let previousLastFrame: string | undefined = undefined;

    for (let i = 0; i < completedClips.length; i++) {
      const clip = completedClips[i];
      const vs = videoStates[clip.id];

      // Skip already done/in-progress
      if (vs?.status === "ready" || clip.videoUri) {
        // Pick up its last frame for next iteration
        if (chainFrames && clip.lastFrameBase64) {
          previousLastFrame = clip.lastFrameBase64;
        }
        continue;
      }
      if (vs?.status === "generating" || vs?.status === "queued") continue;

      await generateVideo(clip, previousLastFrame);

      // Wait for completion before chaining
      if (chainFrames) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const currentState = videoStates[clip.id];
            const currentClip = project.clips.find(c => c.id === clip.id);
            if (currentState?.status === "ready" || currentState?.status === "failed" || currentClip?.videoUri) {
              clearInterval(checkInterval);
              if (currentClip?.lastFrameBase64) {
                previousLastFrame = currentClip.lastFrameBase64;
              }
              resolve();
            }
          }, 3000);
          setTimeout(() => { clearInterval(checkInterval); resolve(); }, 600000);
        });
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  const downloadVideo = (clip: VideoClip) => {
    if (!clip.videoUri) return;
    const a = document.createElement("a");
    a.href = `/api/video-download?uri=${encodeURIComponent(clip.videoUri)}&filename=veo_clip_${clip.sequence}.mp4`;
    a.click();
  };

  const selectedModel = VEO_MODELS.find(m => m.modelId === selectedModelId) || VEO_MODELS[1];

  const videoReadyCount = completedClips.filter(c => videoStates[c.id]?.status === "ready" || c.videoUri).length;
  const videoGeneratingCount = completedClips.filter(c =>
    videoStates[c.id]?.status === "generating" || videoStates[c.id]?.status === "queued"
  ).length;

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 flex flex-col min-h-[calc(100dvh-56px)] sm:h-[calc(100vh-0px)] sm:min-h-0">
      {/* Header */}
      <div className="mb-4 sm:mb-6 bg-zinc-900 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-white italic">
              EXPORT &amp; GENERATE
              <span className="text-indigo-500 font-mono not-italic text-[10px] sm:text-sm ml-2">VEO FLOW</span>
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              {completedClips.length} clips ready
              {videoReadyCount > 0 && ` · ${videoReadyCount} videos generated`}
              {videoGeneratingCount > 0 && ` · ${videoGeneratingCount} generating`}
            </p>
          </div>
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === "prompts" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Prompts
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                activeTab === "videos" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Videos {videoReadyCount > 0 && `(${videoReadyCount})`}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {activeTab === "prompts" ? (
            <>
              <button onClick={copyAllPrompts}
                className={`px-4 py-2.5 rounded-xl font-black text-[10px] tracking-widest transition-all ${
                  copiedId === "all" ? "bg-green-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-white"
                }`}>
                {copiedId === "all" ? "COPIED!" : "COPY ALL"}
              </button>
              <button onClick={exportAsText}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2.5 rounded-xl text-[10px] tracking-widest shadow-xl shadow-indigo-500/20">
                EXPORT .TXT
              </button>
              <button onClick={exportAllAsJson}
                className="bg-green-600 hover:bg-green-500 text-white font-black px-4 py-2.5 rounded-xl text-[10px] tracking-widest shadow-xl shadow-green-500/20">
                EXPORT .JSON
              </button>
            </>
          ) : (
            <>
              <button
                onClick={generateAllVideos}
                disabled={completedClips.length === 0 || videoGeneratingCount > 0}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black px-4 py-2.5 rounded-xl text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                GENERATE ALL
              </button>
              {videoReadyCount > 0 && (
                <button
                  onClick={() => {
                    completedClips.forEach(c => { if (c.videoUri) downloadVideo(c); });
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white font-black px-4 py-2.5 rounded-xl text-[10px] tracking-widest shadow-xl shadow-green-500/20 flex items-center gap-2 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  DOWNLOAD ALL
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* HELP BANNER (prompts tab) - explains what to paste into Veo */}
      {activeTab === "prompts" && completedClips.length > 0 && (
        <div className="mb-4 bg-indigo-950/40 border border-indigo-500/20 rounded-[20px] p-4 shrink-0 text-[11px] text-zinc-400 leading-relaxed">
          <p className="font-black text-indigo-300 uppercase tracking-widest mb-2 text-[10px]">📋 Cách dùng prompt với Veo Flow</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/30 rounded-xl p-3">
              <p className="font-black text-indigo-400 mb-1">📋 COPY PROMPT → VEO</p>
              <p>Đây là prompt chính. Dán vào ô prompt của Veo Flow là xong.</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="font-black text-zinc-300 mb-1">NEG (Negative)</p>
              <p>Tuỳ chọn. Dán vào ô &quot;Negative prompt&quot; riêng của Veo nếu có (nếu không, prompt chính đã chứa sẵn).</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="font-black text-zinc-500 mb-1">JSON</p>
              <p>KHÔNG dán vào Veo. Chỉ để lưu trữ/xem lại bản thiết kế gốc.</p>
            </div>
          </div>
        </div>
      )}

      {/* Video Config Panel (shown in videos tab) */}
      {activeTab === "videos" && (
        <div className="mb-4 bg-zinc-900/60 border border-indigo-600/20 rounded-[20px] p-4 sm:p-5 shrink-0">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Veo Generation Config</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1.5">Model</label>
              <select
                value={selectedModelId}
                onChange={e => setSelectedModelId(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-zinc-300 outline-none cursor-pointer"
              >
                {VEO_MODELS.map(m => (
                  <option key={m.id} value={m.modelId}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1.5">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-zinc-300 outline-none cursor-pointer"
              >
                {VEO_ASPECT_RATIOS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-zinc-600 uppercase block mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-zinc-300 outline-none cursor-pointer"
              >
                <option value={5}>5 seconds</option>
                <option value={8}>8 seconds</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <button
                onClick={() => setChainFrames(!chainFrames)}
                className={`rounded-xl px-3 py-2 border transition-all text-left ${
                  chainFrames
                    ? "bg-emerald-900/40 border-emerald-500/40 text-emerald-300"
                    : "bg-zinc-800 border-white/10 text-zinc-500"
                }`}
                title="PHASE 2: Chain last frame of each clip to first frame of next clip"
              >
                <div className="text-[9px] font-black uppercase flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${chainFrames ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                  Frame Chain
                </div>
                <div className="text-[10px] font-black mt-0.5">{chainFrames ? "ON · Seamless" : "OFF"}</div>
              </button>
              <div className="bg-zinc-800 rounded-xl px-3 py-2 border border-indigo-600/20">
                <div className="text-[9px] text-indigo-400 font-bold uppercase">{selectedModel.name}</div>
                <div className="text-[10px] text-zinc-300 font-black mt-0.5">{aspectRatio} · {duration}s</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clips List */}
      {completedClips.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center opacity-30 px-6">
            <div className="w-16 h-16 border-2 border-white/20 rounded-full border-t-indigo-500 animate-spin mx-auto mb-6"></div>
            <p className="text-sm font-black uppercase tracking-widest">No prompts generated yet</p>
            <p className="text-xs text-zinc-500 mt-2">Go to Script &amp; Prompt tab first</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1">
          {completedClips.map(clip => {
            const vs = videoStates[clip.id];
            const isGenerating = vs?.status === "generating" || vs?.status === "queued";
            const isReady = vs?.status === "ready" || !!clip.videoUri;
            const isFailed = vs?.status === "failed";
            const videoUri = clip.videoUri;

            return (
              <div key={clip.id} className="bg-zinc-900/40 border border-white/10 rounded-[20px] sm:rounded-[32px] overflow-hidden hover:border-indigo-500/30 transition-all">
                {/* Clip header */}
                <div className="px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 border-b border-white/5">
                  <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-[8px] font-black text-zinc-700 uppercase">Clip</span>
                      <span className="text-lg font-mono text-white font-black">{clip.sequence}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black text-green-400 bg-green-900/20 px-2 py-0.5 rounded uppercase">READY</span>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase hidden sm:inline">{clip.characterId}</span>
                        <span className="text-[9px] font-bold text-zinc-600">8s</span>
                        {/* Mode indicator: I2V or T2V based on character's useAsVeoReference */}
                        {(() => {
                          const ch = project.characters.find(c => c.id === clip.characterId);
                          const hasImg = !!(ch?.masterFrameBase64 || ch?.imageBase64);
                          const veoRef = ch?.useAsVeoReference !== undefined ? ch.useAsVeoReference : hasImg;
                          if (hasImg && veoRef) {
                            return <span className="text-[9px] font-black text-cyan-300 bg-cyan-900/30 px-2 py-0.5 rounded uppercase" title="Image-to-Video mode: character image used as reference">I2V</span>;
                          } else {
                            return <span className="text-[9px] font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded uppercase" title="Text-to-Video mode: no reference image">T2V</span>;
                          }
                        })()}
                        {isReady && (
                          <span className="text-[9px] font-black text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded uppercase">VIDEO ✓</span>
                        )}
                        {isGenerating && (
                          <span className="text-[9px] font-black text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded uppercase animate-pulse">
                            {vs?.status === "queued" ? "QUEUED" : "GENERATING..."}
                          </span>
                        )}
                        {isFailed && (
                          <span className="text-[9px] font-black text-red-400 bg-red-900/20 px-2 py-0.5 rounded uppercase">FAILED</span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400 mt-1 truncate">{clip.actionSummary}</p>
                      {isFailed && vs?.error && (
                        <p className="text-[10px] text-red-400 font-mono mt-1 truncate">{vs.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {activeTab === "prompts" ? (
                      <>
                        <button
                          onClick={() => copyToClipboard(clip.flattenedPrompt, clip.id)}
                          title="Dán đoạn này vào ô prompt của Veo Flow"
                          className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            copiedId === clip.id ? "bg-green-600 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          }`}>
                          {copiedId === clip.id ? "✓ COPIED" : "📋 COPY PROMPT → VEO"}
                        </button>
                        {clip.negativePrompt && (
                          <button
                            onClick={() => copyToClipboard(clip.negativePrompt || "", clip.id + "-neg")}
                            title="Negative prompt - dán vào ô 'Negative prompt' riêng của Veo (nếu có)"
                            className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                              copiedId === clip.id + "-neg" ? "bg-green-600 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            }`}>
                            {copiedId === clip.id + "-neg" ? "✓" : "NEG"}
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(clip.final_json_output, null, 2), clip.id + "-json")}
                          title="JSON gốc - chỉ để lưu trữ/xem lại, KHÔNG dán vào Veo"
                          className={`px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            copiedId === clip.id + "-json" ? "bg-green-600 text-white" : "bg-transparent border border-zinc-700 text-zinc-500 hover:text-zinc-300"
                          }`}>
                          {copiedId === clip.id + "-json" ? "✓" : "JSON"}
                        </button>
                      </>
                    ) : (
                      <>
                        {isReady && videoUri ? (
                          <button onClick={() => downloadVideo(clip)}
                            className="px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-green-600 hover:bg-green-500 text-white transition-all flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            DL
                          </button>
                        ) : isGenerating ? (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <button onClick={() => generateVideo(clip)}
                            className="px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            GEN
                          </button>
                        )}
                        {isFailed && (
                          <button onClick={() => generateVideo(clip)}
                            className="px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-zinc-800 hover:bg-zinc-700 text-white transition-all">
                            RETRY
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Prompt text (prompts tab) */}
                {activeTab === "prompts" && (
                  <div className="px-4 sm:px-8 py-4">
                    <p className="text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap max-h-28 overflow-y-auto">
                      {clip.flattenedPrompt.substring(0, 400)}{clip.flattenedPrompt.length > 400 ? "..." : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-[9px] text-zinc-600">
                      <span>{clip.flattenedPrompt.length.toLocaleString()} chars</span>
                      {clip.continuity_snapshot?.lock_hash && (
                        <span className="text-indigo-500">Hash: {clip.continuity_snapshot.lock_hash.substring(0, 10)}...</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Video player (videos tab, when ready) */}
                {activeTab === "videos" && isReady && videoUri && (
                  <div className="px-4 sm:px-8 py-4">
                    <video
                      controls
                      playsInline
                      className="w-full max-h-64 rounded-2xl bg-black border border-white/10"
                      src={`/api/video-download?uri=${encodeURIComponent(videoUri)}&filename=veo_clip_${clip.sequence}.mp4`}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Generating placeholder */}
                {activeTab === "videos" && isGenerating && (
                  <div className="px-4 sm:px-8 py-6 flex items-center gap-4">
                    <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full animate-pulse w-2/3 rounded-full"></div>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase shrink-0">
                      {vs?.status === "queued" ? "In queue..." : "Rendering..."}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
