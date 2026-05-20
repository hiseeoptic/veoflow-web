"use client";
import { useState } from "react";
import { Project, Character } from "@/lib/types";

interface Props {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export default function CharacterEditor({ project, onUpdate }: Props) {
  const [batchText, setBatchText] = useState(
    project.characters.map(c => `${c.name} | ${c.hair} | ${c.clothing} | ${c.voice_profile_id}`).join("\n")
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const handleImageUpload = (charId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdate({
          characters: project.characters.map(c => c.id === charId ? { ...c, imageBase64: reader.result as string } : c)
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBatchSync = async () => {
    setIsSyncing(true);
    const lines = batchText.split("\n").filter(l => l.trim() && l.includes("|"));
    const newCharacters: Character[] = lines.map((line, idx) => {
      const parts = line.split("|").map(s => s.trim());
      const [name, hair, clothing, voice] = parts;
      const existing = project.characters.find(c => c.name === name);
      return {
        id: existing?.id || `char-${idx}-${Date.now()}`,
        name: name || `Unknown-${idx}`,
        gender: existing?.gender || "female",
        age_group: existing?.age_group || "20-30",
        hair: hair || "",
        face_features: existing?.face_features || "standard",
        clothing: clothing || "",
        voice_profile_id: voice || "hanoi_female_soft_trust",
        voice_timbre: existing?.voice_timbre || "neutral",
        description: line,
        imageBase64: existing?.imageBase64
      };
    });

    onUpdate({ characters: newCharacters });

    try {
      const res = await fetch("/api/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: { ...project, characters: newCharacters } })
      });
      const data = await res.json();
      if (data.manifest) {
        onUpdate({ masterManifest: data.manifest });
      }
    } catch (e: any) {
      alert("Characters saved but Manifest update failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-10">
      <div className="bg-zinc-900 border-l-4 border-red-600 rounded-r-[20px] sm:rounded-r-[32px] p-5 sm:p-10 flex gap-5 sm:gap-10 items-center shadow-2xl">
        <div className="w-14 h-14 sm:w-24 sm:h-24 bg-red-600 rounded-[20px] sm:rounded-[32px] flex items-center justify-center shrink-0 shadow-2xl shadow-red-600/40 transform -rotate-6">
          <svg className="w-7 h-7 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter italic">CHARACTER SETUP</h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-3 max-w-2xl leading-relaxed font-medium">
            Upload images to lock faces. Locks <span className="text-red-500 font-bold">Outfit</span> &amp; <span className="text-red-500 font-bold">Voice</span> into Manifest.<br />
            <span className="text-indigo-400 font-mono font-bold text-[11px]">Name | Hair | Outfit | Voice</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
        <div className="lg:col-span-6 space-y-4">
          <textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            className="w-full h-48 sm:h-[500px] bg-black border-2 border-zinc-900 rounded-[24px] sm:rounded-[40px] p-5 sm:p-10 text-indigo-400 font-mono text-sm leading-relaxed outline-none focus:border-red-600/40 shadow-inner resize-none"
            placeholder={"Character A | Short black hair | Navy suit | hanoi_male_leadership\nCharacter B | Long shoulder hair | Red dress | hanoi_female_soft_trust"}
          />
          <button
            onClick={handleBatchSync}
            disabled={isSyncing}
            className={`w-full font-black py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.97] ${
              isSyncing ? "bg-zinc-800 text-zinc-500 cursor-wait" : "bg-red-600 hover:bg-red-500 text-white"
            }`}
          >
            {isSyncing ? "SYNCING DNA..." : "SYNC CHARACTER DATABASE"}
          </button>
        </div>

        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] px-4 sm:px-6">
            Visual Anchors ({project.characters.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 overflow-y-auto max-h-[400px] sm:max-h-[600px] pr-1">
            {project.characters.map(char => (
              <div key={char.id} className="bg-zinc-900/50 border border-white/5 p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] flex items-center gap-4 sm:gap-6 group hover:border-red-600/40 transition-all">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-black rounded-xl sm:rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                    {char.imageBase64 ? (
                      <img src={char.imageBase64} className="w-full h-full object-cover" alt={char.name} />
                    ) : (
                      <span className="text-zinc-700 text-2xl sm:text-3xl font-black">{char.name.charAt(0)}</span>
                    )}
                  </div>
                  <label className="absolute -bottom-1.5 -right-1.5 bg-red-600 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-500 shadow-xl border-2 border-zinc-950">
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(char.id, e)} />
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4v16m8-8H4" strokeWidth="3" />
                    </svg>
                  </label>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <h4 className="text-white font-black uppercase text-sm truncate">{char.name}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 p-2 rounded-lg text-[10px] text-zinc-500 truncate font-bold">Outfit: {char.clothing}</div>
                    <div className="bg-black/40 p-2 rounded-lg text-[10px] text-zinc-500 truncate font-bold">Voice: {char.voice_profile_id}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
