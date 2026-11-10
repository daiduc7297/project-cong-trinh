# CLAUDE.md — Website kiểm soát tiến độ thi công (project-cong-trinh)

Đọc file này trước khi sửa bất cứ thứ gì trong repo.

## Mục đích

Website **so sánh tiến độ thực tế với tiến độ kế hoạch** cho **nhiều dự án xây dựng cùng lúc**,
để phát hiện sớm và **dự đoán trễ** của từng dự án.

Phạm vi **chỉ có tiến độ**. KHÔNG làm: hồ sơ nghiệm thu, QAQC, đệ trình vật tư / shop drawing, thanh toán.
Yêu cầu nào thuộc các mảng đó → nhắc người dùng là ngoài phạm vi, không tự làm.

- Người dùng chính: Nguyễn Đại Đức (trợ lý giám đốc dự án bên tổng thầu) — admin, theo dõi và báo cáo tất cả dự án cho giám đốc.
- Kỹ sư hiện trường: cập nhật số liệu thực tế của dự án được giao (tick căn trên mặt bằng, số cọc).
- Admin tự nhập **tổng công nhân + thời tiết hằng ngày**. Không theo dõi kỹ sư thực tế, không theo dõi máy móc thực tế.

## Mô hình: Kế hoạch → Thực tế → So sánh → Dự báo

Mọi tính năng phải nằm ở một trong 4 bước dưới đây. Tính năng không thuộc bước nào → hỏi người dùng trước.

### 1. Kế hoạch (lập một lần khi bắt đầu dự án, có baseline)

- Lập từ **BOQ của hợp đồng**: không quá chi tiết, nhưng **đủ các đầu mục** để theo dõi và dự đoán trễ
  (thường: chuẩn bị, cọc, móng/đà kiềng, kết cấu từng tầng, xây trát, hoàn thiện, MEP, ngoài nhà, bàn giao).
- Mỗi đầu mục có: thời gian, quan hệ trước/sau, **trọng số** (giá trị BOQ hoặc tỷ trọng) để tính % toàn dự án,
  phạm vi trên mặt bằng (lô/zone/căn), và **nguồn lực kế hoạch** (nhân công, máy móc theo ngày/tuần).
- Chốt kế hoạch thành **baseline**. Mọi so sánh đều so với baseline đang áp dụng; không sửa đè baseline cũ.

### 2. Thực tế (cập nhật định kỳ từ công trường)

| Số liệu thực tế | Cách nhập hiện có / cần có |
|---|---|
| Khối lượng / % hoàn thành theo đầu mục | Tick căn trên mặt bằng (`done`, `dd`), bảng ép cọc (`piles`, `pl`), hoặc nhập `pct` |
| Ngày bắt đầu / kết thúc thực tế | `as`, `af` của từng công tác |
| Tổng công nhân thực tế + thời tiết | Hằng ngày qua nút **＋ Daily** (`daily`). `lab` theo tuần là dữ liệu cũ, chỉ dùng khi tuần đó chưa có số liệu ngày |
| Máy móc, kỹ sư thực tế | **Không theo dõi** (người dùng đã quyết định) |

### 3. So sánh (tại ngày báo cáo `info.status`)

- % kế hoạch vs % thực tế: theo đầu mục, theo zone/lô, toàn dự án; **chỉ số tiến độ = thực tế / kế hoạch**.
- Đường cong S: lũy kế kế hoạch vs thực tế theo tháng/tuần.
- Nguồn lực kế hoạch vs thực tế: nhân công, máy móc theo tuần → thấy thiếu người/thiếu máy là nguyên nhân trễ.
- Danh sách **việc trễ** (đã quá ngày bắt đầu/kết thúc kế hoạch mà chưa xong) và **việc sắp phải triển khai**.

### 4. Dự báo trễ

- Ngày hoàn thành dự báo của từng đầu mục và toàn dự án, so với baseline và với hạn hợp đồng → **số ngày trễ dự báo**.
- Cách tính phải đơn giản, giải thích được cho giám đốc: dựa trên tốc độ thực tế (năng suất đã đạt)
  áp vào khối lượng còn lại, và đường găng (CPM) hiện có.
- Cảnh báo cấp **tổng hợp nhiều dự án**: dự án nào đang/ sẽ trễ, trễ ở đầu mục nào, thiếu nguồn lực gì.

## Nguyên tắc thiết kế

- **Dùng chung cho mọi dự án.** Không hardcode tên dự án, block, lô, zone, số tầng hay đầu mục vào code.
  Cái gì khác nhau giữa các dự án phải nằm trong `json` của dự án đó.
- **Nhìn nhiều dự án một lúc.** Báo cáo / cảnh báo luôn nghĩ cả ở cấp tổng hợp, không chỉ dự án đang mở.
- **Đơn giản trước.** Người dùng cần đủ để theo dõi và dự đoán trễ, không cần chi tiết như phần mềm lập tiến độ chuyên dụng.
- `Package 3.json`, `Package 4.json`, `Casa_Bonita_1.json` chỉ là dữ liệu mẫu, không phải giới hạn của tool.

## Quy tắc làm việc (bắt buộc)

1. **Thay đổi giao diện: đề xuất trước, làm sau.** Người dùng gửi một loạt yêu cầu → Claude trình bày cách làm → chờ duyệt → mới sửa code.
2. **Khi người dùng nói "sửa": gộp toàn bộ yêu cầu vào một lần sửa**, không sửa lẻ.
3. **Không tự merge vào `main`.** Làm trên nhánh riêng, mở PR để người dùng xem bản Preview trên Vercel; chỉ merge khi người dùng ra lệnh.
4. **Ngôn ngữ giao diện:** mọi nút, nhãn, chú thích cố định, thông báo lỗi bằng **tiếng Anh** (máy tính, điện thoại, màn hình kỹ sư).
   Nội dung người dùng nhập (tên công tác song ngữ "English / Tiếng Việt") **giữ nguyên, không dịch, không sửa**.
5. **Chỉ lưu khi bấm Save.** Không auto-save cho bất kỳ vai trò nào.
6. **Điện thoại:** admin chủ yếu xem Schedule và Report → gọn, chữ dễ đọc, ít nút sửa.
7. Không đưa `MONGODB_URI` hay secret vào code phía client; không commit `.env.local`.

## Kỹ thuật

- Stack: Next.js 15 (App Router) + React 19 + TypeScript, Auth.js v5 (next-auth beta, JWT), MongoDB Atlas.
- Deploy: Vercel, tự build từ `main` của `daiduc7297/project-cong-trinh`. Mỗi PR có link Preview.
- Lệnh: `npm run dev` · `npm run build` · `npm run seed` (`-- --reset`, `-- --reset --only=pkg3,pkg4`).

### Cấu trúc

```
src/assets/tien-do.html          ← TOÀN BỘ giao diện (1 file HTML: CSS + JS inline, dòng rất dài)
Tiến_độ_thi_công_V15 (trial ver).html  ← bản gốc tham khảo, KHÔNG sửa
src/app/tien-do/route.ts         ← trả tien-do.html sau khi kiểm tra đăng nhập
src/app/api/projects/...         ← GET/POST danh sách; [id] GET/PUT/DELETE; [id]/lock
src/app/api/users/..., api/me    ← quản lý user (admin), user hiện tại
src/app/login/...                ← đăng nhập email/mật khẩu, PIN, "quick" (vào mặt bằng)
src/app/admin/                   ← /admin: thêm user, cấp PIN, gán quyền
src/lib/access.ts                ← vai trò, quyền ghi, mergeMemberJson (rất quan trọng)
src/lib/session.ts, auth.ts, auth.config.ts, middleware.ts ← xác thực
src/lib/mongo.ts, dns.ts         ← kết nối Atlas (dns.ts vá lỗi querySrv trên Windows)
scripts/seed.ts                  ← nạp JSON mẫu + tạo admin
```

### Sửa `src/assets/tien-do.html`

- Minify một phần, có dòng dài hàng chục nghìn ký tự. Dùng Edit với chuỗi đủ dài để duy nhất; không viết lại cả file.
- 4 tab theo `body[data-tab]`: `1` Schedule (Gantt) · `2` Layout (mặt bằng) · `3` Piling (ép cọc) · `4` Report.
- Đã có: Planned vs Actual, Schedule index (Actual/Planned), Forecast finish, Variance so với baseline, S-curve theo tháng,
  bảng nguồn lực theo tuần (vượt giới hạn tô đỏ), cảnh báo trễ. Mở rộng trên cái có sẵn, không làm lại song song.
- Gọi server qua `api(path, opt)`; lưu qua `flushSave(...)` → `PUT /api/projects/:id` kèm `rev`.
- Còn vài chỗ `claude.use(...)` trong try/catch (di sản bản artifact) — để nguyên.
- Sau khi sửa: `npm run build` và thử trên màn hình hẹp (≤760px).

## Dữ liệu dự án

MongoDB db `tiendo`: `projects` (1 document / dự án), `users`, `members` (projectId + userId + role).
Document `projects`: `{ _id, name, json, rev, lockedBy, lockedByName, lockedAt, updatedAt }`. `json`:

| Khóa | Ý nghĩa | Bước |
|---|---|---|
| `info` | `{name, start, wd (ngày làm/tuần), status (ngày báo cáo), mode: "a" CPM tự động / thủ công}` | — |
| `R` | Công tác: `id, lv (cấp WBS), name, dur, pred ("7FS+0"), res ("NC:12; KS:3"), wt (đầu mục trong W), lot, zn, link, sum, mile` | Kế hoạch |
| | `bs/bf` baseline start/finish · `ins` | Kế hoạch |
| | `pct` (0–1), `as/af` ngày thực tế, `note` | Thực tế |
| `W` | Danh sách đầu mục công việc (song ngữ) — gốc từ BOQ | Kế hoạch |
| `res` | Tài nguyên: `code, name, type, unit, lim (giới hạn), price` | Kế hoạch |
| `mq`, `mrows` | Máy móc theo tuần (`mq[code][ngày đầu tuần]=số lượng`) | Kế hoạch |
| `daily` | `{ngày: {w: tổng công nhân, wx: 0 bình thường / 1 mưa một phần / 2 mưa dừng thi công, n: ghi chú}}` | Thực tế |
| `wk` | Chốt tuần, tự ghi khi bấm Save: `{thứ Hai: {pa, pp, fin, w (TB công nhân/ngày), r1, r2 (ngày mưa)}}` | So sánh |
| `lab` | (cũ) công nhân thực tế theo tuần — fallback khi tuần chưa có `daily` | Thực tế |
| `hideRes` | `true` → ẩn biểu đồ kỹ sư + máy móc dưới Gantt (màn hình và PDF) | — |
| `plan` | Mặt bằng: `W, H, bg, rows[]` — mỗi dãy `{b (lô), n (số căn), z (zone), A/B/C (tọa độ)}` | — |
| `done`, `dd` | Căn đã xong theo đầu mục, ngày xong | Thực tế |
| `piles`, `pl` | Ép cọc; `pl[] = {n (lô), t (tổng cọc), d (lũy kế)}` | Thực tế |
| `hist` | Các baseline đã lưu | Kế hoạch |
| `R[].v` | (tùy chọn) Giá trị BOQ của công tác. Có `v` → % dự án, đường S tính theo giá trị BOQ thay vì thời lượng | Kế hoạch |
| `hr` | (tùy chọn) Mặt bằng cao tầng: `floors[]` (ô căn/zone có diện tích + đa giác), `imgs` (ảnh nền, file trong `public/hr/...`), `acts`, `ho` (mốc bàn giao + điều kiện). Công tác có `hf`+`hm` (tầng + ô) hoặc `hl` (danh sách hạng mục); tick lưu ở `done['t'+id]`/`dd` → tab Layout hiện Elevation / Floor plan / 3D / Building-wide, % theo m² | Thực tế |
| `hol`, `hols`, `hide`, `pj` | Ngày nghỉ, cột ẩn, cấu hình phụ | — |

**Ngày lưu dạng số ngày kể từ 1970-01-01** (vd. `20727` = 2026-10-01). Không đổi sang chuỗi.

## Vai trò & quyền (`src/lib/access.ts`)

| Role | Quyền |
|---|---|
| `xem` | Chỉ đọc, xuất PDF/JSON |
| `member` | Kỹ sư hiện trường; server chỉ ghi `done`, `dd`, `piles`, `pl[].d` qua `mergeMemberJson` — không đụng kế hoạch |
| `sua` | Lưu dự án được gán; không xóa |
| `admin` | Xóa dự án; admin hệ thống vào `/admin` |

- Thêm số liệu thực tế mà kỹ sư cần nhập (vd. nhân công, máy móc thực tế) → **phải thêm vào `mergeMemberJson`**, nếu không server bỏ qua.
- Ghi đồng thời: `findOneAndUpdate` theo `rev`; sai rev → 409, client nhận bản mới nhất. Lock mềm 60 giây (`LOCK_MS`).

## Thêm dự án mới

Người dùng gửi **BOQ hợp đồng, mặt bằng, mốc khởi công / hạn hợp đồng, giới hạn nguồn lực**.
1. Từ BOQ gom thành đầu mục `W` (đủ để theo dõi, không quá chi tiết) và gán trọng số.
2. Lập `R` theo lô/zone, thời gian, quan hệ, nguồn lực; kiểm tra không vượt giới hạn `res.lim`.
3. Dựng `plan.rows` từ mặt bằng. Chốt baseline.
4. Nhập qua "Import JSON (as new project)". Chỉ thêm vào `scripts/seed.ts` khi người dùng yêu cầu.
5. Kiểm tra dự án mới hiển thị đúng ở cả 4 tab và không ảnh hưởng dự án khác.

## Đã quyết định KHÔNG làm (đừng đề xuất lại)

Màn hình tổng quan nhiều dự án (xem từng dự án trên điện thoại là đủ) · máy móc thực tế · kỹ sư thực tế ·
báo cáo tuần riêng (tab Report đã đủ) · gán thầu phụ/tổ đội · nhật ký thay đổi · ảnh hiện trường · danh sách việc 2 tuần tới ·
tách tiến độ hợp đồng riêng (BL1 = tiến độ chốt với CĐT, coi là tiến độ hợp đồng).

## Dự báo theo năng suất (đã có)

- `paceFC(c)` trong tien-do.html: mỗi công tác có ngày xong dự báo = ngày báo cáo + phần còn lại ÷ tốc độ thực tế (từ ngày tick đầu tiên, hoặc 4 tuần gần nhất); <10% hoặc <10 ngày dữ liệu → tốc độ kế hoạch; chưa bắt đầu mà quá ngày → thời lượng kế hoạch tính từ ngày báo cáo. Trễ lan sang công việc sau theo liên kết (dùng hết dự trữ trước). Công tác kéo dài cả dự án (ban chỉ huy) không dự báo.
- Hiển thị: chip `Forecast` trên Schedule, mục FORECAST trong Report (+PDF), dòng dự báo trên thẻ điện thoại; dự án cao tầng có thêm biểu đồ Line of balance.

## Việc có thể cân nhắc sau

- Nhắc việc (quên nhập công nhân trong ngày, cảnh báo trễ).
