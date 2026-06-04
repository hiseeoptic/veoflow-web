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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const updateCharacterField = (charId: string, field: keyof Character, value: string) => {
    onUpdate({
      characters: project.characters.map(c =>
        c.id === charId ? { ...c, [field]: value } : c
      )
    });
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
        imageBase64: existing?.imageBase64,
        // Phase 1: preserve forensic DNA
        eye_details: existing?.eye_details,
        skin_texture: existing?.skin_texture,
        accessories: existing?.accessories,
        gait_posture: existing?.gait_posture,
        signature_props: existing?.signature_props,
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
          <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter italic">
            CHARACTER SETUP
            <span className="ml-2 text-[10px] sm:text-xs text-emerald-400 font-mono not-italic">FORENSIC DNA v2</span>
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2 sm:mt-3 max-w-2xl leading-relaxed font-medium">
            Upload images for I2V (Image-to-Video) consistency. Expand each card to lock <span className="text-emerald-400 font-bold">eyes, skin, accessories, posture, signature props</span> - prevents drift across long videos.<br />
            <span className="text-indigo-400 font-mono font-bold text-[11px]">Quick batch: Name | Hair | Outfit | Voice</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-start">
        <div className="lg:col-span-5 space-y-4">
          <textarea
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            className="w-full h-48 sm:h-[400px] bg-black border-2 border-zinc-900 rounded-[24px] sm:rounded-[40px] p-5 sm:p-10 text-indigo-400 font-mono text-sm leading-relaxed outline-none focus:border-red-600/40 shadow-inner resize-none"
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
          <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 text-[11px] text-zinc-400">
            <p className="font-black text-emerald-400 uppercase tracking-widest mb-2 text-[10px]">Phase 1 Upgrade</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Reference images passed to Veo (I2V mode)</li>
              <li>Negative prompts auto-generated per clip</li>
              <li>5 forensic DNA fields anti-drift</li>
              <li>Dialogue colon-format (no subtitles)</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] px-4 sm:px-6">
            Forensic Identity Locks ({project.characters.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4 overflow-y-auto max-h-[700px] pr-1">
            {project.characters.map(char => {
              const isExpanded = expandedId === char.id;
              const dnaCompleteness = [
                char.eye_details,
                char.skin_texture,
                char.accessories,
                char.gait_posture,
                char.signature_props,
              ].filter(Boolean).length;

              return (
                <div key={char.id} className="bg-zinc-900/50 border border-white/5 rounded-[20px] sm:rounded-[32px] overflow-hidden hover:border-emerald-500/30 transition-all">
                  {/* Card Header */}
                  <div className="p-4 sm:p-6 flex items-center gap-4 sm:gap-6">
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-white font-black uppercase text-sm truncate">{char.name}</h4>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          dnaCompleteness === 5
                            ? "bg-emerald-900/40 text-emerald-400"
                            : dnaCompleteness >= 3
                            ? "bg-yellow-900/40 text-yellow-400"
                            : "bg-red-900/40 text-red-400"
                        }`}>
                          DNA {dnaCompleteness}/5
                        </span>
                        {char.imageBase64 && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-400">
                            I2V READY
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 p-2 rounded-lg text-[10px] text-zinc-500 truncate font-bold">Outfit: {char.clothing || '—'}</div>
                        <div className="bg-black/40 p-2 rounded-lg text-[10px] text-zinc-500 truncate font-bold">Voice: {char.voice_profile_id}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : char.id)}
                      className="shrink-0 p-2 rounded-full bg-emerald-900/40 hover:bg-emerald-800/60 transition-colors"
                      title="Edit forensic DNA"
                    >
                      <svg className={`w-4 h-4 text-emerald-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expandable forensic DNA fields */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest pt-3">
                        Forensic Identity Lock (prevents AI drift)
                      </p>

                      <DnaField
                        label="Eye Details"
                        placeholder="e.g., warm brown almond eyes with double eyelid, slight crow's feet"
                        value={char.eye_details || ""}
                        onChange={v => updateCharacterField(char.id, "eye_details", v)}
                      />

                      <DnaField
                        label="Skin Texture"
                        placeholder="e.g., smooth light beige, natural pores, single beauty mark on left cheek, minimal makeup"
                        value={char.skin_texture || ""}
                        onChange={v => updateCharacterField(char.id, "skin_texture", v)}
                      />

                      <DnaField
                        label="Accessories (always present)"
                        placeholder="e.g., silver wristwatch on left wrist, wire-rimmed glasses, gold wedding band"
                        value={char.accessories || ""}
                        onChange={v => updateCharacterField(char.id, "accessories", v)}
                      />

                      <DnaField
                        label="Gait & Posture"
                        placeholder="e.g., confident upright stance, slow deliberate walk, hands often in pockets"
                        value={char.gait_posture || ""}
                        onChange={v => updateCharacterField(char.id, "gait_posture", v)}
                      />

                      <DnaField
                        label="Signature Props"
                        placeholder="e.g., brown leather satchel, fountain pen, vintage notebook"
                        value={char.signature_props || ""}
                        onChange={v => updateCharacterField(char.id, "signature_props", v)}
                      />

                      <p className="text-[10px] text-zinc-600 italic pt-2">
                        Tip: The more specific, the less Veo will drift these features across clips.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DnaField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-zinc-200 outline-none focus:border-emerald-500/40 placeholder:text-zinc-700"
      />
    </div>
  );
}
