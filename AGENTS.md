# AGENTS.md

Two independently-versioned git repos forming one salamander ID app. **This root is not a git repo.**

| Repo | Role | Run commands in | Read its CLAUDE.md first |
|---|---|---|---|
| `Pan/` | Next.js 14 web app + API | `Pan/photo-gps-app/` | `Pan/CLAUDE.md` |
| `pan-py/` | FastAPI ML microservice | `pan-py/` | `pan-py/CLAUDE.md` |

## Cross-repo facts

- **`Pan/photo-gps-app/`** — all Next.js work. Commands from that dir: `npm run dev`, `npm run type-check`, `npm test -- --run`, `npx prisma generate`.
- **`pan-py/`** — all Python work. Commands from that dir: `make run`, `make check`, `make test`.
- The HTTP contract below **must** stay in sync across both repos. Changing signatures, vector dims (384), or normalization is a coordinated two-repo edit.

| `pan-py` endpoint | `Pan` caller | Purpose |
|---|---|---|
| `POST /crop-salamander` | upload & bulk-process routes | YOLO crop |
| `POST /segment-salamander` | upload & bulk-process routes | background removal |
| `POST /embed` | upload & bulk-process routes | 384-dim DINOv2 embedding |
| `POST /verify` | `/api/photos/[id]/similar` route | SIFT+RANSAC verification |

## Key gotchas

- Prisma cannot handle `vector(384)` fields — embedding is stored via raw SQL (`$executeRawUnsafe(UPDATE ... SET embedding = $1::vector)`) after the Prisma `create` call.
- If `RAILWAY_API_URL` is unset, all ML steps are silently skipped — the app does not fail.
- Client-side mutations must use `fetchWithCsrf()` from `lib/fetch-with-csrf.ts`, not bare `fetch()`.
- pan-py monkey-patches `torch.load` with `weights_only=False` in `YOLOModelBase` for PyTorch 2.6+ compatibility.
- pan-py uses `asyncio_mode = "auto"` in pytest — no `@pytest.mark.asyncio` decorator needed.
- CI for Pan runs `lint → test (--run) → type-check (--skipLibCheck, non-blocking) → build`.
- pan-py models (`.pt` files) are committed to git (under 10 MB for pre-commit).
