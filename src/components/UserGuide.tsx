"use client";
import { useState } from "react";

type Lang = "en" | "vi";

const guide: Record<Lang, { title: string; subtitle: string; sections: { icon: string; title: string; steps: string[] }[]; tips: string[]; faq: { q: string; a: string }[] }> = {
  en: {
    title: "USER GUIDE",
    subtitle: "Complete guide to create professional video prompts with VeoFlow",
    sections: [
      {
        icon: "01",
        title: "Script & Prompt — Write Your Script",
        steps: [
          "Open the \"1. Script & Prompt\" tab from the left sidebar.",
          "Choose a visual style (Cinematic 8K, Realistic Life, 3D Animation, etc.) from the dropdown.",
          "Paste or type your full script into the text area on the left. Separate each scene with a blank line or separator (----).",
          "Click \"INIT PROJECT DNA\" to initialize the project. The system uses GPT-4o to create a Master Manifest (character DNA, environment lock, camera lock).",
          "Wait for the green \"DNA LOCKED\" indicator — this means your project is ready.",
          "Click \"ANALYZE SCRIPT\" — AI will segment your script into individual 8-second clips automatically.",
          "Click \"RESUME GENERATION\" to generate detailed Veo 3 prompts for each clip. You can monitor progress in the Live Terminal.",
          "Each clip shows status: PASS (success) or VIOLATION (failed). Click any clip to expand and see the full structured JSON + flattened prompt.",
          "Use \"COPY PROMPT\" or \"COPY JSON\" on individual clips, or \"FORCE STOP\" to halt generation mid-way.",
        ],
      },
      {
        icon: "02",
        title: "Characters — Define Your Cast",
        steps: [
          "Open the \"2. Characters\" tab from the sidebar.",
          "Enter character information in the text area using the format: Name | Hair | Outfit | Voice Profile (one character per line).",
          "Example: \"Sarah | Long brown wavy hair | Red evening dress | hanoi_female_soft_trust\"",
          "Click \"SYNC CHARACTER DATABASE\" to save characters and update the Master Manifest.",
          "Upload reference images for each character by clicking the + button on their avatar card. This helps lock visual consistency across all clips.",
          "Characters will be automatically referenced in generated prompts to maintain appearance consistency throughout your video.",
        ],
      },
      {
        icon: "03",
        title: "Export Prompts — Get Your Results",
        steps: [
          "Open the \"3. Export Prompts\" tab to see all completed clips.",
          "\"COPY ALL PROMPTS\" — copies every prompt to clipboard in a formatted text block.",
          "\"EXPORT .TXT\" — downloads all prompts as a plain text file.",
          "\"EXPORT .JSON\" — downloads full structured data (project title, manifest, clips with JSON output).",
          "\"PUSH TO AUTOFLOW\" — sends prompts directly to Auto Flow Pro Chrome Extension for automatic batch submission to Google Flow.",
          "\"AF JSON\" — copies the AutoFlow-compatible JSON payload to clipboard for manual import.",
          "Individual clips have \"COPY PROMPT\" and \"JSON\" buttons for selective export.",
        ],
      },
    ],
    tips: [
      "Write scripts with clear scene breaks — each paragraph becomes one 8-second clip.",
      "Use specific character names in your script that match your Character Database entries.",
      "The Master Manifest locks character appearance, environment, and camera rules. Re-initialize if you make major changes.",
      "Failed clips can be regenerated individually by clicking the refresh icon without affecting other clips.",
      "Use the Terminal (Show Terminal button) to monitor AI processing in real time.",
      "Visual styles affect the entire project — choose before generating clips for best results.",
      "AutoFlow integration lets you go from script to rendered video without manual copy-paste.",
    ],
    faq: [
      { q: "What AI model does VeoFlow use?", a: "GPT-4o for all processing: script analysis, manifest creation, and prompt generation. The API key is secured server-side on Vercel." },
      { q: "How long is each generated clip?", a: "Each clip targets 8 seconds of video, optimized for Veo 3 Flow on Google Labs." },
      { q: "Can I edit individual prompts after generation?", a: "Currently, you can regenerate individual clips. Direct editing will be added in a future update." },
      { q: "What is the Master Manifest?", a: "It's a DNA lock file that ensures character appearance, environment, lighting, and camera remain consistent across all clips in your project." },
      { q: "How does AutoFlow integration work?", a: "VeoFlow generates prompts, then pushes them to Auto Flow Pro Chrome Extension, which automatically submits them one by one to Google Flow for video generation." },
    ],
  },
  vi: {
    title: "HƯỚNG DẪN SỬ DỤNG",
    subtitle: "Hướng dẫn đầy đủ để tạo prompt video chuyên nghiệp với VeoFlow",
    sections: [
      {
        icon: "01",
        title: "Script & Prompt — Viết Kịch Bản",
        steps: [
          "Mở tab \"1. Script & Prompt\" từ thanh bên trái.",
          "Chọn phong cách hình ảnh (Cinematic 8K, Realistic Life, 3D Animation, v.v.) từ dropdown.",
          "Dán hoặc nhập toàn bộ kịch bản vào ô text bên trái. Ngăn cách mỗi cảnh bằng dòng trống hoặc dấu phân cách (----).",
          "Bấm \"INIT PROJECT DNA\" để khởi tạo dự án. Hệ thống sử dụng GPT-4o tạo Master Manifest (DNA nhân vật, khóa môi trường, khóa camera).",
          "Chờ đèn xanh \"DNA LOCKED\" hiện lên — nghĩa là dự án đã sẵn sàng.",
          "Bấm \"ANALYZE SCRIPT\" — AI sẽ tự động chia kịch bản thành từng clip 8 giây.",
          "Bấm \"RESUME GENERATION\" để tạo prompt chi tiết cho từng clip. Theo dõi tiến trình trong Live Terminal.",
          "Mỗi clip hiện trạng thái: PASS (thành công) hoặc VIOLATION (lỗi). Bấm vào clip để xem JSON đầy đủ + prompt đã flatten.",
          "Dùng \"COPY PROMPT\" hoặc \"COPY JSON\" cho từng clip, hoặc \"FORCE STOP\" để dừng giữa chừng.",
        ],
      },
      {
        icon: "02",
        title: "Characters — Thiết Lập Nhân Vật",
        steps: [
          "Mở tab \"2. Characters\" từ thanh bên.",
          "Nhập thông tin nhân vật theo định dạng: Tên | Tóc | Trang phục | Voice Profile (mỗi nhân vật 1 dòng).",
          "Ví dụ: \"Mai | Tóc dài nâu xoăn | Đầm đỏ dạ hội | hanoi_female_soft_trust\"",
          "Bấm \"SYNC CHARACTER DATABASE\" để lưu nhân vật và cập nhật Master Manifest.",
          "Tải ảnh tham khảo cho từng nhân vật bằng cách bấm nút + trên thẻ avatar. Giúp khóa ngoại hình nhất quán xuyên suốt tất cả clip.",
          "Nhân vật sẽ tự động được tham chiếu trong các prompt tạo ra để duy trì sự nhất quán ngoại hình.",
        ],
      },
      {
        icon: "03",
        title: "Export Prompts — Xuất Kết Quả",
        steps: [
          "Mở tab \"3. Export Prompts\" để xem tất cả clip đã hoàn thành.",
          "\"COPY ALL PROMPTS\" — sao chép tất cả prompt vào clipboard dạng text có format.",
          "\"EXPORT .TXT\" — tải tất cả prompt dạng file text thuần.",
          "\"EXPORT .JSON\" — tải dữ liệu đầy đủ (tên dự án, manifest, clips kèm JSON output).",
          "\"PUSH TO AUTOFLOW\" — gửi prompt trực tiếp đến Auto Flow Pro Chrome Extension để tự động submit hàng loạt lên Google Flow.",
          "\"AF JSON\" — sao chép JSON tương thích AutoFlow vào clipboard để import thủ công.",
          "Từng clip có nút \"COPY PROMPT\" và \"JSON\" để xuất riêng lẻ.",
        ],
      },
    ],
    tips: [
      "Viết kịch bản với ngắt cảnh rõ ràng — mỗi đoạn văn sẽ thành 1 clip 8 giây.",
      "Dùng tên nhân vật cụ thể trong kịch bản khớp với các mục trong Character Database.",
      "Master Manifest khóa ngoại hình nhân vật, môi trường và camera. Khởi tạo lại nếu thay đổi lớn.",
      "Clip lỗi có thể tạo lại riêng bằng nút refresh mà không ảnh hưởng clip khác.",
      "Dùng Terminal (nút Show Terminal) để theo dõi AI xử lý theo thời gian thực.",
      "Phong cách hình ảnh áp dụng cho toàn bộ dự án — chọn trước khi tạo clip để có kết quả tốt nhất.",
      "Tích hợp AutoFlow giúp đi từ kịch bản đến video render mà không cần copy-paste thủ công.",
    ],
    faq: [
      { q: "VeoFlow sử dụng AI model nào?", a: "GPT-4o cho mọi xử lý: phân tích kịch bản, tạo manifest, và tạo prompt. API key được bảo mật phía server trên Vercel." },
      { q: "Mỗi clip được tạo dài bao lâu?", a: "Mỗi clip nhắm 8 giây video, tối ưu cho Veo 3 Flow trên Google Labs." },
      { q: "Có thể sửa prompt riêng lẻ sau khi tạo không?", a: "Hiện tại bạn có thể tạo lại từng clip riêng. Chức năng sửa trực tiếp sẽ có trong bản cập nhật sau." },
      { q: "Master Manifest là gì?", a: "Là file khóa DNA đảm bảo ngoại hình nhân vật, môi trường, ánh sáng và camera nhất quán xuyên suốt tất cả clip trong dự án." },
      { q: "Tích hợp AutoFlow hoạt động thế nào?", a: "VeoFlow tạo prompt, rồi đẩy sang Auto Flow Pro Chrome Extension, extension tự động submit từng prompt lên Google Flow để tạo video." },
    ],
  },
};

export default function UserGuide() {
  const [lang, setLang] = useState<Lang>("en");
  const g = guide[lang];

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 h-[calc(100vh-48px)] flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-l-4 border-emerald-500 rounded-r-[32px] p-8 flex justify-between items-center shadow-2xl shrink-0 mb-8">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-[24px] flex items-center justify-center shrink-0 shadow-2xl shadow-emerald-600/30 transform -rotate-3">
            <span className="text-2xl">📖</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
              {g.title} <span className="text-emerald-500 font-mono not-italic text-xs ml-2">VEOFLOW v18.0</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-2 font-medium">{g.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLang("en")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all ${
              lang === "en" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" : "bg-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            ENGLISH
          </button>
          <button
            onClick={() => setLang("vi")}
            className={`px-5 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all ${
              lang === "vi" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" : "bg-zinc-800 text-zinc-500 hover:text-white"
            }`}
          >
            TIẾNG VIỆT
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        {/* Steps */}
        {g.sections.map((section, si) => (
          <div key={si} className="bg-zinc-900/50 border border-white/5 rounded-[32px] overflow-hidden hover:border-emerald-500/20 transition-all">
            <div className="px-8 py-6 border-b border-white/5 flex items-center gap-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
                <span className="text-white font-black text-sm">{section.icon}</span>
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">{section.title}</h3>
            </div>
            <div className="px-8 py-6 space-y-4">
              {section.steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-6 h-6 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-emerald-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tips */}
        <div className="bg-emerald-900/10 border border-emerald-600/20 rounded-[32px] p-8">
          <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-5 flex items-center gap-3">
            <span className="text-lg">💡</span>
            {lang === "en" ? "PRO TIPS" : "MẸO HAY"}
          </h3>
          <div className="space-y-3">
            {g.tips.map((tip, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-emerald-500 mt-1 shrink-0">▸</span>
                <p className="text-sm text-zinc-400 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8">
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-3">
            <span className="text-lg">❓</span>
            {lang === "en" ? "FREQUENTLY ASKED QUESTIONS" : "CÂU HỎI THƯỜNG GẶP"}
          </h3>
          <div className="space-y-6">
            {g.faq.map((item, i) => (
              <div key={i} className="border-l-2 border-indigo-500/30 pl-6">
                <p className="text-sm font-bold text-white mb-2">{item.q}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            VeoFlow Prompt Engine — Powered by GPT-4o
          </p>
        </div>
      </div>
    </div>
  );
}
