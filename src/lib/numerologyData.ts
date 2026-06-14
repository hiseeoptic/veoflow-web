// Numerology knowledge base — distilled from the thansohoc Google Sheet (135 rows)
// + Five Elements (Ngũ Hành) mapping. Used by the Script Generator's "numerology" mode
// to write viral short-video scripts for a given Life Path + Mission number.

export interface NumeroProfile {
  archetype: string;
  keywords: string;
  superpower: string;
  shadow: string; // pain points — fuel for the video HOOK + PROBLEM beat
  quote: string;
}

/** Số Chủ Đạo (Life Path) — 1-9, 11, 22, 33 */
export const LIFE_PATH: Record<string, NumeroProfile> = {
  "1": {
    archetype: "Người Dẫn Đầu, Khai Phá & Độc Lập",
    keywords: "Lãnh đạo, Tiên phong, Tầm nhìn, Tự chủ, Quyết đoán, Sáng tạo",
    superpower: "Lãnh đạo bẩm sinh, tư duy đổi mới, độc lập, lì đòn trước thử thách",
    shadow: "Cứng đầu/bảo thủ, thiếu kiên nhẫn, cái tôi quá lớn, sợ thất bại, cô đơn khi không được công nhận",
    quote: "Người mang Số 1 không đến để xin phép – họ đến để mở đường và làm chủ vận mệnh.",
  },
  "2": {
    archetype: "Người Hòa Giải & Kết Nối",
    keywords: "Hòa hợp, Nhạy cảm, Trực giác, Thấu hiểu, Yêu thương, Dịu dàng",
    superpower: "Trực giác nhạy, hòa giải xung đột, hợp tác, bao dung",
    shadow: "Phụ thuộc cảm xúc, thiếu quyết đoán, sợ làm mất lòng, tự hy sinh đến kiệt sức",
    quote: "Số 2 không cần đứng trước ánh đèn sân khấu, vì họ chính là người làm sân khấu ấy rực rỡ hơn.",
  },
  "3": {
    archetype: "Người Truyền Cảm Hứng & Biểu Hiện Bản Thân",
    keywords: "Sáng tạo, Tự do, Vui tươi, Lạc quan, Lôi cuốn, Dí dỏm",
    superpower: "Giao tiếp bậc thầy, sáng tạo, lan tỏa năng lượng tích cực",
    shadow: "Thiếu kiên trì/dễ bỏ cuộc, cảm xúc thất thường, bị xem là hời hợt, phân tán",
    quote: "Số 3 không chỉ mang lại tiếng cười mà còn đánh thức ước mơ và sáng tạo trong mỗi người.",
  },
  "4": {
    archetype: "Người Xây Dựng, Hệ Thống & Kiên Trì",
    keywords: "Thực tế, Tổ chức, Nguyên tắc, Ổn định, Cần cù, Trung thực",
    superpower: "Kiên trì, tư duy hệ thống, đáng tin cậy, trụ cột",
    shadow: "Cứng nhắc/bảo thủ, cầu toàn, dễ stress, ngại thay đổi",
    quote: "Số 4 chính là trụ cột của xã hội, người bảo vệ trật tự và mang lại sự bền vững.",
  },
  "5": {
    archetype: "Người Khai Phá, Tự Do & Truyền Cảm Hứng",
    keywords: "Tự do, Linh hoạt, Trải nghiệm, Đa năng, Thích nghi, Lôi cuốn",
    superpower: "Thích nghi nhanh, giao tiếp tốt, dám phá giới hạn",
    shadow: "Mất tập trung/thiếu định hướng, sợ ràng buộc & cam kết, bốc đồng theo cảm xúc",
    quote: "Số 5 không đến để đi theo lối mòn – họ sinh ra để tạo con đường mới.",
  },
  "6": {
    archetype: "Người Bảo Vệ, Chăm Sóc & Lan Tỏa Yêu Thương",
    keywords: "Yêu thương, Trách nhiệm, Đáng tin cậy, Tinh tế, Che chở",
    superpower: "Trắc ẩn, trách nhiệm cao, năng khiếu nghệ thuật, kết nối gia đình/cộng đồng",
    shadow: "Cầu toàn/kiểm soát, hy sinh quá mức, dễ bị lợi dụng, ôm việc thiên hạ",
    quote: "Số 6 không chỉ tạo nên tổ ấm, mà còn là ngọn lửa giữ ấm trái tim của mọi người.",
  },
  "7": {
    archetype: "Nhà Triết Lý, Người Truy Cầu Chân Lý",
    keywords: "Kín đáo, Trực giác, Hướng nội, Lý trí, Chiêm nghiệm, Cầu toàn, Sâu sắc",
    superpower: "Phân tích sâu, trực giác + lý trí, tư duy độc lập, đào vàng tri thức",
    shadow: "Cô lập/khó mở lòng, hoài nghi, lạnh lùng xa cách, phân tích thái quá đến tê liệt",
    quote: "Số 7 không chỉ tìm sự thật cho bản thân, mà còn dẫn dắt cộng đồng khai sáng trí tuệ.",
  },
  "8": {
    archetype: "Người Lãnh Đạo, Tài Chính & Quyền Lực",
    keywords: "Tầm nhìn, Óc tổ chức, Điều hành, Thành tựu, Khát vọng, Công bằng",
    superpower: "Lãnh đạo mạnh, quản lý tài chính giỏi, ý chí thép, tạo ảnh hưởng lớn",
    shadow: "Tham vọng quá mức, thiếu nhạy cảm cảm xúc, cầu toàn/kiểm soát, đặt vật chất lên trên",
    quote: "Số 8 không chỉ làm giàu cho bản thân, mà còn kiến tạo giá trị bền vững cho xã hội.",
  },
  "9": {
    archetype: "Người Phụng Sự, Lan Tỏa Tình Yêu & Trí Tuệ",
    keywords: "Lý tưởng, Cho đi, Trực giác, Thông thái, Nhân đạo, Trách nhiệm",
    superpower: "Nhân ái, cống hiến/cải cách, truyền cảm hứng, trí tuệ sâu",
    shadow: "Hy sinh đến kiệt sức, lý tưởng hóa & kỳ vọng cao, né tránh xung đột, ôm nỗi đau thế gian",
    quote: "Số 9 không chỉ sống vì bản thân, mà sống để tạo ra thay đổi tích cực cho thế giới.",
  },
  "11": {
    archetype: "Master 11 – Ngọn Đuốc Khai Sáng Tâm Thức",
    keywords: "Trực giác siêu việt, Truyền cảm hứng, Tâm linh, Nhạy bén, Kênh dẫn",
    superpower: "Trực giác phi thường, truyền cảm hứng tập thể, nhìn thấu bản chất",
    shadow: "Lo âu/nhạy cảm thái quá, áp lực sứ mệnh, dao động cảm xúc, thức tỉnh người khác mà quên chính mình",
    quote: "Đừng chỉ thức tỉnh người khác – hãy sống thật trước đã.",
  },
  "22": {
    archetype: "Master 22 – Bậc Thầy Kiến Tạo & Thay Đổi Thế Giới",
    keywords: "Trực giác, Quyền lực, Thực tế, Tầm ảnh hưởng, Thực thi, Logic",
    superpower: "Tầm nhìn vĩ đại + năng lực hiện thực hóa, lãnh đạo, xây di sản",
    shadow: "Áp lực tự thân khổng lồ, quá kiểm soát/cứng nhắc, bỏ quên cảm xúc cá nhân",
    quote: "Số 22 không chỉ tạo thành tựu cho bản thân mà còn để lại dấu ấn bền vững cho nhân loại.",
  },
  "33": {
    archetype: "Master 33 – Bậc Thầy Phụng Sự & Chữa Lành Bằng Tình Yêu",
    keywords: "Yêu thương vô điều kiện, Vị tha, Nhân đạo, Trực giác, Che chở",
    superpower: "Chữa lành, phụng sự bằng tình yêu lớn, nâng đỡ người khác",
    shadow: "Gánh vác quá sức, quên bản thân, kỳ vọng đạo đức cao đến mệt mỏi",
    quote: "Số 33 không phải để nổi bật – mà để đánh thức ánh sáng trong người khác.",
  },
};

/** Sứ Mệnh (Mission) — bản chất + câu chốt cho mỗi số */
export const MISSION: Record<string, { essence: string; quote: string }> = {
  "1": { essence: "Tiên phong, độc lập, dẫn dắt bằng hành động", quote: "Sống đúng hướng, đây là kết quả rực rỡ của hành trình tự dẫn dắt chính mình." },
  "2": { essence: "Kết nối, hỗ trợ, kiến tạo hài hòa", quote: "Bạn không cần làm lớn tiếng để được chú ý – chỉ cần chạm đúng tâm để được yêu mến." },
  "3": { essence: "Truyền cảm hứng qua sáng tạo & biểu đạt cá nhân", quote: "Bạn được sinh ra để biến cảm xúc thành nghệ thuật và đánh thức người khác." },
  "4": { essence: "Kiến tạo, tổ chức, biến ước mơ thành hệ thống bền vững", quote: "Bạn không cần bay cao – bạn là người khiến mọi người khác đứng vững." },
  "5": { essence: "Truyền cảm hứng, khám phá & mở rộng tự do", quote: "Bạn không sinh ra để ở yên. Bạn là ngọn gió – là tinh thần của tự do." },
  "6": { essence: "Chăm sóc, nuôi dưỡng, yêu thương có trách nhiệm", quote: "Bạn không thay đổi thế giới bằng tiếng nói. Bạn thay đổi nó bằng trái tim." },
  "7": { essence: "Chiêm nghiệm, truyền trí tuệ & kết nối tâm linh", quote: "Bạn không cần làm tất cả. Bạn cần hiểu rõ tại sao mọi thứ tồn tại." },
  "8": { essence: "Điều hành, hiện thực hóa sức mạnh – tài chính – ảnh hưởng", quote: "Sứ mệnh 8 dựng tòa lâu đài vật chất – để biến nó thành mái che cho hàng trăm người khác." },
  "9": { essence: "Phụng sự, nhân đạo, sống vì lý tưởng", quote: "Bạn không cần thay đổi thế giới – chỉ cần sống như minh chứng rằng nó đáng để thay đổi." },
  "11": { essence: "Truyền cảm hứng, kết nối tâm linh & thức tỉnh nhân loại", quote: "Bạn không sinh ra để hòa nhập – bạn sinh ra để khơi sáng." },
  "22": { essence: "Bậc thầy kiến tạo, xây di sản cho nhân loại", quote: "Master 22 không đến để tỏa sáng cho riêng mình – mà để xây điều trường tồn." },
};

/** Ngũ Hành mapping */
export type FiveElement = "Kim" | "Mộc" | "Thủy" | "Hỏa" | "Thổ";
export const NUMBER_ELEMENT: Record<string, FiveElement> = {
  "1": "Thủy", "11": "Thủy",
  "2": "Thổ", "5": "Thổ", "8": "Thổ", "22": "Thổ",
  "3": "Mộc", "4": "Mộc",
  "6": "Kim", "7": "Kim",
  "9": "Hỏa", "33": "Hỏa",
};

// Tương sinh: Mộc→Hỏa→Thổ→Kim→Thủy→Mộc
const PRODUCTIVE: Record<FiveElement, FiveElement> = {
  "Mộc": "Hỏa", "Hỏa": "Thổ", "Thổ": "Kim", "Kim": "Thủy", "Thủy": "Mộc",
};
// Tương khắc: Mộc→Thổ→Thủy→Hỏa→Kim→Mộc
const DESTRUCTIVE: Record<FiveElement, FiveElement> = {
  "Mộc": "Thổ", "Thổ": "Thủy", "Thủy": "Hỏa", "Hỏa": "Kim", "Kim": "Mộc",
};

export function elementRelation(a: string, b: string): string {
  const e1 = NUMBER_ELEMENT[String(a)];
  const e2 = NUMBER_ELEMENT[String(b)];
  if (!e1 || !e2) return "";
  if (e1 === e2) return `Cùng hành ${e1}: cộng hưởng mạnh, khuếch đại cả siêu năng lực lẫn bóng tối — cần điểm cân bằng.`;
  if (PRODUCTIVE[e1] === e2) return `${e1} sinh ${e2} (tương sinh): năng lượng chảy thuận — con đường này nuôi dưỡng sứ mệnh kia.`;
  if (PRODUCTIVE[e2] === e1) return `${e2} sinh ${e1} (tương sinh): sứ mệnh nuôi dưỡng con đường — hãy đi tới.`;
  if (DESTRUCTIVE[e1] === e2 || DESTRUCTIVE[e2] === e1) return `${e1} và ${e2} tương khắc: hai năng lượng kéo hai hướng — đó chính là nguồn lực chuyển hóa mạnh nhất.`;
  return `${e1} và ${e2}: quan hệ trung tính — cần chủ động kết nối hai năng lượng.`;
}

/** Build a compact knowledge block injected into the script-generation prompt. */
export function buildNumerologyBrief(lifePath?: string, mission?: string): string {
  const parts: string[] = [];
  if (lifePath && LIFE_PATH[lifePath]) {
    const p = LIFE_PATH[lifePath];
    parts.push(`[SỐ CHỦ ĐẠO ${lifePath} — ${p.archetype}]
- Từ khóa: ${p.keywords}
- Siêu năng lực: ${p.superpower}
- Bóng tối (dùng cho HOOK + PROBLEM): ${p.shadow}
- Câu chốt: "${p.quote}"`);
  }
  if (mission && MISSION[mission]) {
    const m = MISSION[mission];
    parts.push(`[SỨ MỆNH ${mission}]
- Bản chất: ${m.essence}
- Câu chốt (dùng cho PAYOFF): "${m.quote}"`);
  }
  if (lifePath && mission) {
    const rel = elementRelation(lifePath, mission);
    if (rel) parts.push(`[NGŨ HÀNH — Chủ Đạo ${lifePath} ↔ Sứ Mệnh ${mission}]\n${rel}`);
  }
  return parts.join("\n\n");
}

export const LIFE_PATH_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "22", "33"];
export const MISSION_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "11", "22"];
