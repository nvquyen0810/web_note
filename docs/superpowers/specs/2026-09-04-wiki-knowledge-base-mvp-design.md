# Wiki / Knowledge Base — Thiết kế Foundation + Core Wiki

**Ngày:** 2026-09-04  
**Trạng thái:** Đã duyệt, sẵn sàng lập kế hoạch triển khai  
**Phạm vi:** Sub-project 1 — Foundation + Core Wiki (MVP)  
**Cách làm:** Vertical slice (làm một luồng end-to-end mỏng trước, rồi mở rộng)

## 1. Bối cảnh và mục tiêu

Xây dựng wiki nội bộ kiểu Notion + Confluence cho doanh nghiệp. Nền tảng đầy đủ (pipeline file, OpenSearch, cộng tác realtime, AI RAG) được triển khai theo giai đoạn. Tài liệu này chỉ mô tả MVP có thể ship đầu tiên.

### Tiêu chí thành công

Người dùng Keycloak có thể:

1. Đăng nhập qua SSO (OIDC)
2. Tạo workspace và quản lý thành viên (Owner / Admin / Editor / Viewer)
3. Tổ chức nội dung theo Workspace → Folder → Document
4. Tạo / sửa / soft-delete / duplicate / move tài liệu
5. Soạn thảo bằng editor Tiptap kiểu Notion (heading, list, checklist, table, code, callout, ảnh, Mermaid)
6. Autosave bản nháp; publish; xem lịch sử phiên bản; khôi phục phiên bản cũ
7. Upload ảnh lên MinIO (PostgreSQL chỉ lưu metadata)
8. Gán quyền ở cấp document và đánh dấu tài liệu private
9. Xem các thao tác quan trọng trong audit log

### Ngoài phạm vi (các sub-project sau)

| Giai đoạn sau | Khả năng tạm hoãn |
|---------------|-------------------|
| Files & Processing | Đầy đủ loại file, quét virus, OCR, thumbnail, pipeline BullMQ |
| Search | Full-text OpenSearch, UI semantic/pgvector |
| Collaboration | Presence WebSocket, sửa đồng thời, comment, @mention, notification |
| AI Knowledge Base | Chat RAG, embedding, câu trả lời kèm nguồn đã lọc quyền |
| Permissions (đầy đủ) | Group, department, role Commenter, ACL cấp folder |

Role Commenter và ACL Group/Department nằm trong tầm nhìn sản phẩm nhưng **không triển khai** trong MVP.

## 2. Quyết định đã chốt

| Chủ đề | Lựa chọn |
|--------|----------|
| Cách giao hàng | Làm tuần tự từng sub-project; bắt đầu Foundation + Core Wiki |
| Auth | Keycloak (OIDC) trong Docker Compose |
| Repo | Monorepo pnpm + Turborepo: `apps/web`, `apps/api`, `packages/shared` |
| Permission (MVP) | Workspace + Document (theo user); audit cơ bản; chưa Group/Department |
| Collaboration (MVP) | Autosave + draft/publish + snapshot phiên bản; chưa WebSocket/comment |
| Compose (MVP) | Postgres (+ sẵn extension pgvector), Redis, Keycloak, MinIO, API, Web — chưa OpenSearch |
| Phong cách triển khai | Vertical slice |

## 3. Kiến trúc

```
Browser (Next.js)
    │  Đăng nhập OIDC
    ▼
Keycloak
    │  JWT (Bearer)
    ▼
NestJS API  ── Drizzle ── PostgreSQL (+ đã cài pgvector, chưa dùng cho query)
    │              └── bảng audit / users / wiki
    ├── Redis (dành sẵn cho cache/queue; MVP có thể dùng nhẹ)
    └── MinIO (lưu binary ảnh editor trong MVP)
```

### Cấu trúc monorepo

```
web_note/
├── apps/web                 # Next.js App Router, Tailwind, shadcn/ui, Tiptap
├── apps/api                 # NestJS, Drizzle, REST, Swagger
├── packages/shared          # Zod schema, role enum, kiểu DTO dùng chung
├── docker/                  # Export realm Keycloak, init Postgres, bootstrap MinIO
├── docker-compose.yml
├── .env.example
├── docs/
└── package.json             # pnpm workspace + Turborepo
```

### Ranh giới module backend

- `auth` — validate JWT (JWKS), đồng bộ user từ token claims
- `workspaces` — CRUD + thành viên
- `folders` — CRUD cây thư mục + move
- `documents` — CRUD, duplicate, move, autosave nội dung, publish
- `versions` — liệt kê / khôi phục snapshot
- `permissions` — tính role hiệu lực (workspace ∪ document)
- `files` — metadata upload + MinIO put/presign (ưu tiên ảnh)
- `audit` — ghi append-only các thao tác quan trọng

### Bề mặt frontend

- Auth.js (NextAuth v5) với Keycloak provider; session → Bearer token gọi API
- Sidebar: chuyển workspace, cây folder, danh sách document
- Trang editor: tiêu đề, body Tiptap, badge draft/published, Publish, panel phiên bản
- Settings: thành viên workspace, chia sẻ document, bật/tắt private
- Chỉ báo autosave (debounce 1–2 giây)

### Lưu trữ nội dung

- Thân tài liệu: **Tiptap JSON** trong PostgreSQL `jsonb`
- File binary: **chỉ MinIO**; Postgres lưu metadata + `storageKey`

## 4. Mô hình dữ liệu

### Các bảng

| Bảng | Mục đích |
|------|----------|
| `users` | Profile local đồng bộ từ Keycloak (`sub`, email, name, avatar URL) |
| `workspaces` | Không gian wiki cấp cao nhất |
| `workspace_members` | Role: `owner` \| `admin` \| `editor` \| `viewer` |
| `folders` | Folder lồng nhau (`parent_id` nullable), thuộc một workspace |
| `documents` | Title, `folder_id`, `created_by` (user), `status` (`draft` \| `published`), `is_private`, soft-delete |
| `document_revisions` | Nội dung đang làm việc (Tiptap JSON) + timestamp (đích autosave) |
| `document_versions` | Snapshot bất biến khi publish / restore; số `version` tăng dần |
| `document_members` | Ghi đè role theo từng document cho user cụ thể |
| `files` | Metadata object MinIO (key, mime, size, uploader, `document_id` tùy chọn) |
| `audit_logs` | `actor_id`, `action`, `resource_type`, `resource_id`, `metadata` jsonb, `created_at` |

### Quy tắc hành vi

1. **Soft-delete:** dùng `deleted_at` trên folder và document.
2. **Autosave:** chỉ ghi `document_revisions`; **không** tạo dòng version.
3. **Publish:** copy revision hiện tại → dòng mới trong `document_versions`; đặt `documents.status = published`.
4. **Restore:** copy nội dung version đã chọn vào `document_revisions`; ghi thêm một version mới đánh dấu restored-from `vN` (giữ lịch sử tuyến tính, có thể audit).
5. **Document private:** nếu `is_private = true`, chỉ `created_by`, các `document_members` được gán tường minh, và role **Owner** của workspace (để khôi phục khi cần) được xem. Chỉ là thành viên workspace với role **Admin/Editor/Viewer** thì **không** đủ để xem document private.
6. **Quyền hiệu lực:** nếu có dòng `document_members` cho user thì dùng role đó; nếu không thì dùng role `workspace_members` (vẫn tuân quy tắc document private ở trên).
7. **Khả năng theo role (MVP):**

| Khả năng | Owner | Admin | Editor | Viewer |
|----------|-------|-------|--------|--------|
| Quản lý workspace / thành viên | ✓ | ✓ | | |
| Tạo/sửa/xóa folder & document | ✓ | ✓ | ✓ | |
| Publish / khôi phục phiên bản | ✓ | ✓ | ✓ | |
| Đọc nội dung | ✓ | ✓ | ✓ | ✓ |
| Quản lý ACL document / cờ private | ✓ | ✓ | doc của mình* | |

\*Editor chỉ được đặt private/chia sẻ trên document mình tạo, trừ khi được nâng quyền bởi Admin/Owner.

## 5. API (REST)

Mọi route đều cần Bearer JWT, trừ health check. Validate bằng Zod từ `packages/shared`. OpenAPI qua Swagger.

### Endpoint đại diện

- `GET /health`
- `GET /me` — đồng bộ/trả về user hiện tại
- Workspaces: `GET/POST /workspaces`, `GET/PATCH /workspaces/:id`, CRUD thành viên dưới `/workspaces/:id/members`
- Folders: `GET/POST /workspaces/:id/folders`, `PATCH/DELETE /folders/:id`, `POST /folders/:id/move`
- Documents: CRUD theo workspace/folder; `POST /documents/:id/duplicate`, `POST /documents/:id/move`
- Nội dung: `PATCH /documents/:id/content` (autosave body)
- Vòng đời: `POST /documents/:id/publish`
- Versions: `GET /documents/:id/versions`, `GET /documents/:id/versions/:version`, `POST /documents/:id/versions/:version/restore`
- Files: `POST /files/presign` (browser upload thẳng lên MinIO), sau đó `POST /files/complete` để lưu metadata; `GET /files/:id` lấy URL tải có kiểm tra quyền
- ACL document: `GET/PUT /documents/:id/members`, `PATCH /documents/:id` cho `is_private`
- Audit: `GET /workspaces/:id/audit-logs` (Admin/Owner)

### Định dạng lỗi

JSON thống nhất: `{ "code": string, "message": string, "details"?: unknown }` map với HTTP status. Exception filter toàn cục NestJS; gắn correlation/request id trên response và log.

## 6. Khả năng editor (MVP)

Các block/tính năng hỗ trợ:

- Heading, paragraph, bold/italic/strike, link
- Bullet / ordered list, checklist
- Table
- Code block
- Callout
- Ảnh (upload → MinIO)
- Sơ đồ Mermaid (render phía client)
- Paste Markdown

Tạm hoãn: đính kèm file phong phú ngoài ảnh, embed card sâu, OCR, con trỏ cộng tác.

## 7. Bảo mật

- Không lưu mật khẩu trong app; Keycloak là IdP
- NestJS: AuthGuard → PermissionGuard trên mọi route ghi và route đọc nhạy cảm
- CORS allowlist; Helmet; rate limit API cơ bản
- Bucket MinIO private; presigned URL thời hạn ngắn; allowlist mime/size khi upload
- Log có cấu trúc (pino); không bao giờ log access token hoặc bí mật tài liệu thô
- `.env` / `.env.example` cho mọi secret và URL service; không commit secret vào git

## 8. Hạ tầng (local)

Các service Docker Compose:

- `postgres` (image có pgvector)
- `redis`
- `keycloak` (+ import realm tùy chọn cho client/user demo)
- `minio` (+ khởi tạo bucket)
- `api` (NestJS)
- `web` (Next.js)

OpenSearch **không** được khởi động trong compose của MVP.

## 9. Chiến lược kiểm thử (MVP)

- **Unit:** giải quyền permission; chuyển trạng thái publish/restore
- **Integration:** CRUD document + chặn theo auth trên Postgres (testcontainers hoặc compose test profile)
- **Frontend:** Vitest tập trung autosave/debounce và một số lệnh editor quan trọng
- E2E đầy đủ và load test để sau

## 10. Thứ tự giao hàng (vertical slices)

1. Monorepo + Compose + `.env.example` + tooling (TypeScript strict, ESLint, Prettier)
2. Auth E2E: đăng nhập Keycloak → JWT → `GET /me` + đồng bộ user
3. Workspaces + thành viên
4. Folders + documents CRUD (gồm duplicate/move/soft-delete)
5. Editor Tiptap + autosave + draft/publish
6. Lịch sử phiên bản + restore
7. Upload ảnh qua MinIO
8. ACL cấp document + cờ private + ghi/đọc audit log
9. Hoàn thiện Swagger, seed data, README “chạy local”

## 11. Định hướng tương lai (không làm ngay, nhưng thiết kế tương thích)

- Worker BullMQ và hàng đợi Redis gắn cạnh module `files` mà không cần viết lại schema
- Indexer OpenSearch sau này consume sự kiện publish document
- Cột/bảng `pgvector` cho embedding khi tới giai đoạn AI
- WebSocket gateway cho presence/collab mà không đổi mô hình nội dung REST (quyết định Yjs/CRDT để phase Collaboration)
- Có thể thêm Entra ID làm OIDC provider thứ hai sau abstraction validate JWT hiện tại

## 12. Non-goals rõ ràng của MVP này

- Manifest Kubernetes production
- Multi-region HA
- Quét virus / OCR
- Chat AI
- Sửa tài liệu đa người realtime
- Search UI dựa trên OpenSearch (lọc title đơn giản bằng SQL chấp nhận được cho điều hướng MVP)
