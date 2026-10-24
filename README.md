# Tiến độ thi công

App HTML hiện tại (Gantt / mặt bằng / ép cọc) chạy trên **Next.js + Vercel**. Dữ liệu chung nằm trên **MongoDB Atlas** — một document một dự án.

## Việc bạn làm trên Atlas

1. [mongodb.com/atlas](https://www.mongodb.com/atlas) → tạo cluster (M0 free được).
2. **Database Access** → user/password, quyền `Read and write to any database`.
3. **Network Access** → Add IP `0.0.0.0/0` (Vercel serverless đổi IP).
4. **Connect** → Drivers → copy URI `mongodb+srv://...`.

## Chạy local

```bash
copy .env.example .env.local
```

Điền `MONGODB_URI`, `AUTH_SECRET` (`openssl rand -base64 32`), `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

```bash
npm install
npm run seed
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) → đăng nhập admin. Ghi đè 3 JSON mẫu: `npm run seed -- --reset`.

## Việc bạn làm trên Vercel

1. Import git repo (hoặc `npx vercel`).
2. Environment variables (Production + Preview):

   - `MONGODB_URI`
   - `MONGODB_DB` = `tiendo`
   - `AUTH_SECRET` (cùng giá trị local)
   - `AUTH_URL` = `https://<project>.vercel.app` (phải có `https://`, không copy `localhost`)

3. Deploy. Chạy seed **một lần** từ máy bạn (đã trỏ URI Atlas): `npm run seed`.

Không đưa URI Mongo vào client. Không commit `.env.local`.

## Vai trò

| Vai trò | Ý nghĩa |
|---|---|
| xem | Đọc, PDF, xuất JSON. Không lưu. |
| member | Nút “Vào mặt bằng” trên login, không nhập gì. Chỉ xem/sửa tab Mặt bằng (tick căn). Server chỉ ghi field `done`. |
| sửa | Lưu dự án được gán, tick mặt bằng. Không xóa dự án. |
| admin dự án / admin hệ thống | Xóa dự án; admin hệ thống vào `/admin` thêm user / cấp PIN. |

Hai người sửa cùng lúc: `findOneAndUpdate` theo `rev` — ai ghi khớp rev trước thì được, bản sau (rev cũ) bị bỏ, client im lặng nhận bản đã lưu. Không khóa, không hỏi ghi đè.

## Cấu trúc giữ nguyên

- `Tiến_độ_thi_công_V15 (trial ver).html` — bản gốc.
- `src/assets/tien-do.html` — bản chạy (gọi `/api/projects` thay `claude.use('db')`).
- `Package 3.json` / `Package 4.json` / `Casa_Bonita_1.json` — seed.
