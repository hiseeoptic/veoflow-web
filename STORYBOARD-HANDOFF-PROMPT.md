# BRIEF QUY TRÌNH — Dán vào app Storyboard

> Copy toàn bộ nội dung dưới đây và dán vào AI/app làm storyboard của bạn.
> Nó mô tả hệ thống "VeoFlow" mà storyboard cần khớp vào.

---

## BỐI CẢNH HỆ THỐNG

Tôi đang vận hành một pipeline tạo video AI đồng nhất cao tên là **VeoFlow**. Nó tạo ra
**prompt hàng loạt cho Google Veo 3** để dựng video dài 3–10 phút, chia thành nhiều
**clip 8 giây**, giữ **nhân vật / sản phẩm / bối cảnh / ánh sáng đồng nhất tuyệt đối**
xuyên suốt — mục tiêu là video "không lộ AI".

App storyboard của bạn là **mắt xích trung gian**: với mỗi clip 8s, bạn sinh ra **1 ảnh
keyframe tĩnh** đúng bố cục. Ảnh đó sẽ được đưa ngược vào Veo làm **first-frame / reference
(Image-to-Video)**, để Veo chỉ việc "làm cho khung hình chuyển động" thay vì phải tự tưởng
tượng — đây là cách duy nhất cho ra video chất lượng cao, ổn định.

```
[VeoFlow] sinh prompt từng clip  ──►  [App Storyboard của bạn] sinh ảnh keyframe
                                              │
                                              ▼
                                  Ảnh keyframe + prompt video  ──►  [Veo 3 I2V]  ──►  Video
```

---

## NGUYÊN TẮC ĐỒNG NHẤT (storyboard PHẢI tuân theo)

VeoFlow khoá "DNA" của mọi đối tượng. Khi sinh ảnh, bạn **không được sáng tạo lệch** khỏi
các khoá này — phải lặp lại y hệt ở mọi keyframe:

1. **Character / Product DNA (forensic-level)** — mỗi đối tượng có:
   - Khuôn mặt / nhãn sản phẩm (eye_details / label)
   - Da / chất liệu bề mặt (skin_texture / surface finish)
   - Tóc / hình dáng (hair / container shape)
   - Trang phục / bao bì (clothing / container DNA)
   - Phụ kiện / màu thương hiệu (accessories / brand colors — kèm mã RGB)
   - Dáng / kiểu chuyển động (gait_posture / motion style)
   - Đạo cụ đặc trưng / nguyên liệu (signature_props / ingredients)

2. **Scene Bible Tokens** — các "vân tay phong cách" lặp lại verbatim mọi cảnh:
   ví dụ `"85mm f/1.8 lens"`, `"4200K key + 5600K rim"`, `"seamless gradient backdrop #40E0D0→#008080"`.
   Ảnh keyframe phải tái hiện đúng lens, ánh sáng, nền, tông màu này.

3. **Một bối cảnh / phim trường duy nhất** — mọi keyframe trong cùng một phân đoạn dùng
   chung backdrop, sàn, ánh sáng. Chỉ camera và hành động đổi.

4. **Negative (cấm thay đổi)** — không méo nhãn, không đổi logo, không đổi màu thương hiệu,
   không thêm sản phẩm/người thừa, không đổi tóc/trang phục/phụ kiện, không bàn tay người
   nếu kịch bản không yêu cầu.

---

## ĐẶC TẢ PROMPT SINH ẢNH KEYFRAME (quan trọng nhất)

Mỗi ảnh keyframe là **một khoảnh khắc TĨNH đẹp nhất** của clip 8s — KHÔNG phải animation.
Khi bạn nhận prompt video từ VeoFlow, hãy **chuyển hoá** nó thành prompt-ảnh theo quy tắc:

**LOẠI BỎ khỏi prompt ảnh:**
- Mọi mốc thời gian `[00:00–00:02]`, `[00:02–00:04]`…
- Mọi động từ chuyển động camera: ORBIT, DOLLY PUSH-IN, SPIRAL-IN, LEVITATION (chuyển thành
  trạng thái tĩnh: "đang lơ lửng giữa khung", "nguyên liệu treo lưng chừng quanh lọ")
- Thoại / voiceover
- Marker `(thats where the camera is)`

**GIỮ LẠI & nhấn mạnh:**
- Toàn bộ Character/Product DNA verbatim (kèm mã màu RGB nếu có)
- Bố cục khung hình (chủ thể ở đâu, nguyên liệu sắp xếp ra sao)
- Ánh sáng + lens + tông màu (từ Scene Bible Tokens)
- Phông nền

**CẤU TRÚC PROMPT-ẢNH đề xuất (1 đoạn, tiếng Anh để image model mạnh nhất):**
```
[Shot type & composition] + [Subject with full forensic DNA] +
[Key ingredients/props in static arrangement] + [Backdrop] +
[Lighting + lens + color grade] + [Style: photoreal commercial / cinematic] +
[Aspect ratio] + [Negative: no warped label, no logo change, no extra product...]
```

**Ví dụ (cảnh lọ Vtopcan + nguyên liệu bay quanh):**
```
Macro product hero shot, centered composition. A cylindrical emerald-green glass bottle
(RGB #40E0D0), smooth and highly transparent, ivory-white rectangular label (RGB #F8F8F8)
with dark-green "Vtopcan" sans-serif logo (RGB #006400), matte gold cap (RGB #B8860B),
floating mid-frame. Around it, suspended in a frozen orbital arrangement: bright silver
multifaceted selenium crystals and fine earthy-orange papaya-flower powder (RGB #D2691E)
forming a circular halo, mid-air, glowing particle trails frozen. Seamless gradient backdrop
teal #40E0D0 to #008080. Softbox key light 4500K + strip rim light 5500K, subtle speculars
and caustics on glass. 100mm macro lens, f/5.6, neutral Rec.709 grade, photoreal premium
commercial. 16:9. Negative: no warped label text, no logo change, no extra bottles, no
container morphing, no hands, no text overlay.
```

---

## ĐỊNH DẠNG / KỸ THUẬT KHỚP VỚI VEO

- **Tỉ lệ khung:** khớp với Veo — `16:9` (ngang) hoặc `9:16` (dọc). Phải nhất quán cả video.
- **Độ phân giải:** càng cao càng tốt (≥1080p) vì ảnh dùng làm seed cho video.
- **Đối tượng đứng yên, rõ nét** — keyframe là frame ĐẦU của clip, nên để chủ thể ở tư thế
  bắt đầu chuyển động (vd lọ ở giữa, nguyên liệu vừa bắt đầu tiến vào quỹ đạo).
- **1 keyframe / clip 8s** (tối thiểu). Có thể thêm keyframe cuối (last-frame) nếu app bạn
  hỗ trợ first+last frame của Veo 3.1.

---

## QUY TRÌNH KẾT NỐI 2 APP (tôi đang chạy)

1. **VeoFlow → Script:** tạo kịch bản phân cảnh (Narrative hoặc Product Commercial).
2. **VeoFlow → Manifest:** khoá DNA nhân vật/sản phẩm + Scene Bible Tokens.
3. **VeoFlow → Clip prompts:** mỗi clip ra 1 prompt video (flatten) + negative prompt.
4. **➡ App Storyboard của bạn:** nhận mô tả từng clip → sinh ảnh keyframe đúng DNA & bố cục.
5. **Veo 3 (I2V):** ảnh keyframe (first-frame) + prompt video → render clip 8s.
6. **Ghép clip:** nối tuần tự; dùng last-frame của clip N làm first-frame clip N+1 để liền mạch.

---

## ĐIỀU TÔI CẦN APP STORYBOARD LÀM

- Nhận **DNA + bố cục + scene bible tokens** của từng cảnh, sinh **ảnh keyframe tĩnh** đúng
  100% nhận diện (mặt/nhãn/màu/hình dáng không đổi giữa các cảnh).
- Cho phép **regenerate từng keyframe** đến khi ưng mà vẫn giữ DNA.
- Xuất ảnh đúng tỉ lệ Veo, độ phân giải cao, để đưa làm reference/first-frame.
- (Tùy chọn) sinh cả **first-frame và last-frame** cho mỗi clip để chuyển cảnh liền mạch.

> Mục tiêu cuối: chuỗi keyframe nhất quán như một bộ phim → đưa vào Veo → video 3–10 phút
> đồng nhất nhân vật/sản phẩm/bối cảnh, đạt chất lượng "không nhận ra là AI".
