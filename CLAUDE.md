# CLAUDE.md — Tool tiến độ thi công (project-cong-trinh)

Đọc file này trước khi sửa bất cứ thứ gì trong repo.

## Tool này là gì

Web app **theo dõi nhiều dự án cùng lúc**, mục đích chính là **kiểm soát tiến độ thi công**:
biết dự án nào, hạng mục nào, căn/lô nào đang trễ hoặc sắp phải triển khai, để đôn đốc kịp thời.

- Người dùng chính: Nguyễn Đại Đức (quản lý dự án bên tổng thầu) — admin hệ thống, theo dõi tất cả dự án.
- Kỹ sư hiện trường: vào tab mặt bằng của dự án được giao để cập nhật căn đã xong, số cọc.
- Mỗi dự án là một document độc lập; số lượng dự án sẽ tăng dần (dự án mới = mặt bằng + danh sách công việc + BOQ).

### Nguyên tắc thiết kế

- **Mọi tính năng phải phục vụ kiểm soát tiến độ.** Tính năng không giúp trả lời "đang trễ gì / sắp phải làm gì / ai cần đôn đốc" thì hỏi lại người dùng trước khi làm.
- **Dùng chung cho mọi dự án.** Không hardcode tên dự án, block, lô, zone, số tầng hay hạng mục vào code. Những gì khác nhau giữa các dự án phải nằm trong `json` của dự án đó (cấu hình được trên giao diện).
- **Nhìn được nhiều dự án một lúc.** Khi thêm báo cáo/cảnh báo, nghĩ cả ở cấp tổng hợp (tất cả dự án) chứ không chỉ dự án đang mở.
- Dữ liệu trong repo (`Package 3.json`, `Package 4.json`, `Casa_Bonita_1.json`) chỉ là dữ liệu mẫu/seed, không phải giới hạn của tool.

- Stack: Next.js 15 (App Router) + React 19 + TypeScript, Auth.js v5 (next-auth beta, JWT), MongoDB Atlas.
- Deploy: Vercel, tự build từ nhánh `main` của GitHub `daiduc7297/project-cong-trinh`.
- Lệnh: `npm run dev` · `npm run build` · `npm run seed` (`-- --reset`, `-- --reset --only=pkg3,pkg4`).

## Quy tắc làm việc (bắt buộc)

1. **Thay đổi giao diện: đề xuất trước, làm sau.** Người dùng gửi một loạt yêu cầu → Claude trình bày cách làm → chờ duyệt → mới sửa code.
2. **Khi người dùng nói "sửa": gộp toàn bộ các yêu cầu vào một lần sửa**, không sửa lẻ từng cái.
3. **Không tự merge vào `main`.** Làm trên nhánh riêng (vd. `feat/...`), mở PR để người dùng xem bản Preview trên Vercel; chỉ merge khi người dùng ra lệnh.
4. **Ngôn ngữ giao diện:** mọi nút bấm, nhãn, chú thích cố định, thông báo lỗi đều bằng **tiếng Anh** (trên máy tính, điện thoại và màn hình kỹ sư hiện trường). Nội dung người dùng nhập (tên công tác song ngữ "English / Tiếng Việt") **giữ nguyên, không dịch, không sửa**.
5. **Chỉ lưu khi bấm Save.** Không thêm auto-save cho bất kỳ vai trò nào (admin lẫn kỹ sư hiện trường).
6. **Giao diện điện thoại:** admin chủ yếu chỉ xem tab Schedule và Report → ưu tiên gọn, chữ dễ đọc, ít nút sửa.
7. Không đưa `MONGODB_URI` hay secret nào vào code phía client; không commit `.env.local`.

## Cấu trúc

```
src/assets/tien-do.html          ← TOÀN BỘ giao diện app (1 file HTML: CSS + JS inline, dòng rất dài)
Tiến_độ_thi_công_V15 (trial ver).html  ← bản gốc tham khảo, KHÔNG sửa
src/app/tien-do/route.ts         ← trả file tien-do.html sau khi kiểm tra đăng nhập
src/app/api/projects/...         ← GET/POST danh sách; [id] GET/PUT/DELETE; [id]/lock
src/app/api/users/..., api/me    ← quản lý user (admin), thông tin user hiện tại
src/app/login/...                ← đăng nhập email/mật khẩu, PIN, "quick" (nút vào mặt bằng)
src/app/admin/                   ← trang /admin: thêm user, cấp PIN, gán quyền
src/lib/access.ts                ← vai trò, quyền ghi, mergeMemberJson (rất quan trọng)
src/lib/session.ts, auth.ts, auth.config.ts, middleware.ts ← xác thực
src/lib/mongo.ts, dns.ts         ← kết nối Atlas (dns.ts vá lỗi querySrv trên Windows)
scripts/seed.ts                  ← nạp 3 file JSON mẫu + tạo admin
Package 3.json / Package 4.json / Casa_Bonita_1.json ← dữ liệu seed
```

### Sửa `src/assets/tien-do.html`

- File minify một phần, có dòng dài hàng chục nghìn ký tự. Dùng Edit với chuỗi đủ dài để duy nhất; không viết lại cả file.
- 4 tab, điều khiển bằng `body[data-tab]`: `1` Schedule (Gantt) · `2` Layout (mặt bằng) · `3` Piling (ép cọc) · `4` Report.
- Có `@media (max-width:760px)` cho điện thoại và `prefers-color-scheme:dark`.
- Gọi server qua hàm `api(path, opt)`; lưu qua `flushSave(...)` gửi `PUT /api/projects/:id` kèm `rev`.
- Vẫn còn vài chỗ `claude.use(...)` trong try/catch (di sản từ bản artifact) — để nguyên, có fallback.
- Sau khi sửa: kiểm tra bằng `npm run build` và mở thử trên màn hình hẹp (≤760px).

## Dữ liệu dự án

MongoDB db `tiendo`, collection: `projects` (1 document / dự án), `users`, `members` (projectId + userId + role).

Document `projects`: `{ _id, name, json, rev, lockedBy, lockedByName, lockedAt, updatedAt }`.
`json` là toàn bộ dữ liệu dự án:

| Khóa | Ý nghĩa |
|---|---|
| `info` | `{name, start, wd (ngày làm/tuần), status (ngày báo cáo), mode: "a" CPM tự động / thủ công}` |
| `R` | Danh sách công tác: `id, lv (cấp WBS), name, dur, pred ("7FS+0", "3FF+0"), res ("NC:12; KS:3"), pct (0–1), note, bs/bf (baseline start/finish), as/af (thực tế), link (vd. ["P",0] nối sang ép cọc), sum, mile` |
| `res` | Tài nguyên: `code, name, type, unit, lim (giới hạn), price` (NC công nhân, KS kỹ sư, CT cẩu tháp…) |
| `plan` | Mặt bằng: `W, H, bg, rows[]` — mỗi dãy `{b (block/lô), n (số căn), z (zone), A/B/C (tọa độ)}` |
| `done`, `dd` | Tick căn hoàn thành và ngày xong trên mặt bằng |
| `piles`, `pl` | Bảng ép cọc; `pl[] = {n (lô), t (tổng cọc), d (lũy kế)}` |
| `mq`, `mrows` | Máy móc theo tuần (`mq[code][ngày]=số lượng`) |
| `W` | Danh sách hạng mục công việc (song ngữ) |
| `hol`, `hols` | Ngày nghỉ (mảng ngày / khoảng `{a,b,n}`) |
| `hist`, `hide`, `pj`, `lab` | Lịch sử baseline, cột ẩn, cấu hình phụ |

**Ngày tháng lưu dạng số ngày kể từ 1970-01-01** (vd. `20727` = 2026-10-01). Không đổi sang chuỗi.

## Vai trò & quyền (src/lib/access.ts)

| Role | Quyền |
|---|---|
| `xem` | Chỉ đọc, xuất PDF/JSON |
| `member` | Đăng nhập nhanh "Vào mặt bằng"; server chỉ ghi `done`, `dd`, `piles`, `pl[].d` qua `mergeMemberJson` — không đụng Gantt |
| `sua` | Lưu dự án được gán; không xóa |
| `admin` | Xóa dự án; admin hệ thống vào `/admin` |

- Thêm trường dữ liệu mới mà kỹ sư hiện trường cần ghi → **phải thêm vào `mergeMemberJson`**, nếu không server sẽ bỏ qua.
- Ghi đồng thời: `findOneAndUpdate` theo `rev`; sai rev → 409, client nhận bản mới nhất. Lock mềm 60 giây (`LOCK_MS`) qua `/lock`.

## Thêm dự án mới

Người dùng gửi mặt bằng, danh sách công việc và BOQ. Tạo JSON cùng cấu trúc với các file mẫu
(tên công tác song ngữ, `plan.rows` theo block/zone của dự án đó), rồi nhập qua menu
"Import JSON (as new project)" trên giao diện. Chỉ thêm vào `FILES` trong `scripts/seed.ts` khi người dùng yêu cầu.
Sau khi thêm, kiểm tra dự án mới hiển thị đúng ở cả 4 tab và không làm ảnh hưởng dự án khác.

## Hướng phát triển (đều xoay quanh tiến độ)

- Cảnh báo việc trễ / sắp triển khai cho từng dự án và tổng hợp mọi dự án; báo cáo tuần song ngữ Việt–Anh.
- Hồ sơ đệ trình (vật tư, NCC/thầu phụ, biện pháp, shop drawing, RFI/RFA): **một danh mục duy nhất**, mỗi hồ sơ có mã riêng,
  checklist giấy tờ còn thiếu, và gắn với công tác tiến độ để tính "cần duyệt trước ngày nào".
- Mặt bằng: mỗi căn theo hạng mục có trạng thái chưa làm / đã thi công / đã nghiệm thu. Không theo dõi tiền thanh toán.
- Trợ lý AI (agent) đọc dữ liệu tool để nhắc việc. Thiết kế chưa chốt — hỏi người dùng trước khi dựng.
