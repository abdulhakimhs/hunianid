# Project Memory — Housing/Perumahan Management SaaS

Read this before starting any task. It summarizes decisions already made — don't re-derive or contradict these without flagging it back to the team first.

## Stack

- **Backend:** Laravel (latest stable)
- **Frontend:** React via Inertia.js, written in **TypeScript** (`.tsx`) — NOT a separate REST API for in-app pages. Controllers return `Inertia::render()` directly.
- **Database:** MySQL
- **Auth:** Laravel starter kit (register, login, forgot-password) as the foundation — extended, not replaced. We do NOT gate login behind email verification — dropped to reduce signup friction for growth. `/register` is a dedicated public page, not an admin-only route. Login now supports four methods (see `app/Http/Controllers/Auth/`): email+password, passkey (WebAuthn via Fortify), phone/WhatsApp OTP, and Google OAuth (Socialite).
  - **Phone/WhatsApp OTP login** (`PhoneLoginController`) — reverses the earlier "no OTP" decision. Login-only (does not create accounts — unregistered phone numbers are told to register). WhatsApp delivery is NOT wired up yet; `otp_codes.code_hash` is generated and stored normally, but the plaintext code is only ever returned in the API response outside production (`app()->environment(['local','testing'])`), for manual testing until a WA Business API provider (Twilio/Meta Cloud API) is integrated. Don't ship the `dev_code` response field to production.
  - **Google OAuth login** (`SocialLoginController`, routes at `auth/google/redirect|callback` — path matches the pre-existing `GOOGLE_REDIRECT_URI` env value / Google Cloud Console whitelist, don't rename without updating both) — an existing account (matched by email) logs in directly. A brand-new Google email is NOT auto-registered (would create a user with no `area_members` row, breaking `MembershipContext`); instead the profile is stashed in session and the person is sent through the normal `/register` wizard with name/email pre-filled, still choosing role/location and setting a password like any other signup.
- **Admin panel:** No Filament. RT/Manager admin screens are the same Inertia+React app as residents, gated by role — not a separate stack.
- **PWA:** vite-plugin-pwa, no native mobile app planned.

## Architectural principle: full-stack tasks, not split by layer

Because of Inertia, a controller and its matching React page are built together as one task — do not split "backend" and "frontend" into separate tickets for in-app features. Pure backend-only work (webhooks, AI services, migrations) is the only exception.

## Folder structure

See `folder_structure.md` for the full layout. Key points:
- `app/Http/Controllers/{Auth,Resident,Admin,Api}/` — split by audience, not by REST resource
- `app/Services/` — business logic (complex resolution, duplicate validation) lives here, not in controllers, so both the web form and the future WhatsApp bot can reuse it
- Only ONE Blade file exists: `resources/views/app.blade.php` — an empty shell. Everything else is React.
- `resources/js/Pages/` mirrors the controller split above

## Existing region data — already installed, DO NOT reseed

Indonesian province/city dropdown data comes from the `laravolt/indonesia` package, already installed and migrated. Query its `provinces` and `cities` tables directly — do not seed or build a new region table. This package's primary key is a string `code`, not an auto-increment `id`, which is different from every other table in this project — keep that in mind when relating it to `complexes.province_code` / `city_code`. Kecamatan-level data exists in the package but is intentionally unused (skipped for v1, see `task_public_registration.md`).

## Existing admin panel shell — already built, DO NOT rebuild

The admin panel layout already exists: sidebar, navigation, and routing are in place, along with two specific pages already built — `dashboard.tsx` and `units-map.tsx`. **Before starting any admin-related task, locate this existing structure first and extend/reuse it — do not scaffold a new admin layout, sidebar, or routing setup from scratch.** Tasks like the Admin Dashboard Shell described earlier are now really about *filling content into* this existing shell, not building the shell itself.

**Important convention correction:** the existing admin pages use `.tsx` (TypeScript), not `.jsx`. Earlier task files in this project (written before this shell existed) reference `.jsx` filenames for new pages — treat every such reference as `.tsx` instead, and write all new React components in TypeScript to stay consistent with what's already built. If a task file says `Login.jsx`, build `Login.tsx`.

If you can't find the existing admin folder structure, stop and ask rather than guessing a new one into existence.

**Reminder for whoever starts the session:** attach the actual existing files (`dashboard.tsx`, `units-map.tsx`, the sidebar/layout component, the routes file) directly into the conversation when kicking off an admin-related task — don't rely on this description alone. Claude Code working from a real file is far more accurate than working from a text summary of one.

## Design system

Full brief in `landing_page_design_brief.md`. Reference mockups: `preview_desktop_dashboard.html`, `preview_mobile_screens.html`, `preview_unclaimed_dashboard.html`, `icon_assets.html` — open these in a browser, don't guess the style from description alone.

- **Palette:** `--bg #F3FBF9` (light mint-white canvas), `--ink #142033` (text/dark chrome), `--sky #2FC2E8` (AI-powered features only), `--mint #1FCB82` (human/community activity), `--coral #FF6B57` (alerts only, sparing)
- **Depth:** real shadows and elevation, NOT flat — `--shadow-md: 0 8px 24px rgba(20,32,51,0.08), 0 2px 6px rgba(20,32,51,0.05)`. Cards use large rounded corners (16-20px).
- **Color meaning is deliberate:** sky blue = AI-powered moment (visitor pass NL parsing, auto-categorization). Mint = human/community outcome (approvals, payments, active status). Don't use these interchangeably.
- **Copy language:** all user-facing text is Bahasa Indonesia, plain and formal-but-warm register — not stiff bureaucratic language, not slang. See `landing_page_design_brief.md` copy principles.

## Database model — the parts that are easy to get wrong

Full schema in `database_design_phase1.md` / `database_design_phase1.sql`. The model went through a real redesign — these rules exist for specific reasons, don't simplify them away:

- **`complexes` = physical location. `areas` = who manages it.** One complex can have multiple areas (e.g. two RTs in the same perumahan). Never merge these.
- **`users` = one row per real human, globally.** No `area_id` or `role` on `users` — those are contextual and live in `area_members`. A person's phone/email is globally unique; they don't get a new `users` row for every area or unit they're connected to.
- **`area_members`** = a person's role + approval status within ONE specific area. A person can have several rows here (different areas, or even multiple roles within the same area — e.g. an RT admin who also lives there).
- **`unit_user`** = a person's link to a specific house. Separate from `area_members` on purpose — a house can have multiple residents, a person can own multiple houses, and these two relationships have different approval owners (area admin approves area membership; an *existing resident* of a unit confirms someone joining *their specific house*, not the admin).
- **Duplicate prevention:** `(complex_id, normalized_address)` unique on `units` blocks two areas claiming the same house. `(area_id, user_id, role_id)` unique on `area_members` blocks the same role-in-same-area twice, while still allowing the same person to hold roles across different areas.
- **`areas.status` includes `'unclaimed'`** — a shell area created when a resident registers at a complex with no admin yet. See `task_unclaimed_area_handover.md`.

## Current registration flows (all coexist)

1. **Public registration** (`task_public_registration.md`) — no invite needed, works for both Pengelola and Penghuni, Google Places or manual location entry. Penghuni path always requires admin approval (no invite to lean on for trust) — UNLESS it lands in an unclaimed area, in which case approval is skipped since there's no admin yet.
2. **Invite-link registration** (`task_resident_registration.md`) — RT-generated link, faster path once an area already exists and is claimed.
3. **Unclaimed area → handover** (`task_unclaimed_area_handover.md`) — the growth on-ramp: residents join first, later promote one of themselves to admin.

## Visitor Pass creation via WhatsApp AI chat

A resident can create a visitor pass entirely by chatting in free-text Bahasa Indonesia on WhatsApp — no need to open the app. This is the "AI-powered moment" referenced in the design system's sky-blue color rule.

- **Inbound webhook:** Wablas posts incoming WhatsApp messages to `POST webhooks/wablas/incoming` (`routes/webhooks.php` → `WablasWebhookController`). Guarded by a shared secret passed as `?key=...` (`WABLAST_WEBHOOK_SECRET`), not a signature header — Wablas doesn't sign payloads.
- **Orchestration:** `VisitorPassChatService` owns the whole conversation state machine — resolves the sender's `User` by phone (unregistered numbers are told to register, mirroring the phone-OTP login behavior), figures out which `unit` the pass is for (auto-picked if the resident has exactly one active unit, otherwise asks them to pick from a numbered list), then hands free-text turns to DeepSeek to extract `guest_name` / `vehicle_info` / `purpose`. Users can say "mulai ulang" / "batal" / "reset" at any point to restart.
- **State:** persisted per phone number in the `whatsapp_conversations` table (`WhatsappConversation` model) — `status` (`collecting` / `awaiting_unit_choice` / `completed`), `collected_fields`, and `history` (the raw message turns sent to DeepSeek). Stale conversations (see `isStale()`) auto-reset rather than resuming a dead thread.
- **NL extraction:** `DeepSeekService::converse()` calls DeepSeek's chat-completions API (`DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` in `.env`) with a system prompt constraining it to strict JSON output (`{"action":"ask",...}` or `{"action":"complete",...}`) — it only asks about fields still missing, never re-asks an answered one, and never invents data.
- **On completion:** creates a `VisitorPass` (`source: 'whatsapp_ai'`, `raw_input` stores the full chat history as JSON for audit) and replies on WhatsApp with a public QR link (`/pass/{token}`) the resident forwards to their guest, who shows it to security. Outbound replies go through `WaBlastService`, same as OTP delivery.
- **Wablas base URL gotcha:** the device's actual API host is per-account (e.g. `https://tegal.wablas.com`), not the generic `wablas.com` — check the Wablas dashboard, wrong host silently 400s with "token invalid or device expired" (see comment in `config/services.php`).
- **Local testing:** the webhook needs a public URL, so local dev requires an HTTP tunnel (cloudflared/ngrok) pointed at the Laravel dev server, with the tunnel's public URL + secret registered as the incoming-webhook URL in the Wablas dashboard.

## Known open decisions (don't silently resolve these — ask)

- Whether the duplicate-complex notice should name the existing area (privacy tradeoff)
- Whether rejected `area_members` can retry via a new registration
- Manually-entered complexes (no Google Place ID) have no automatic duplicate detection — accepted limitation for now

## Task files reference

Execute roughly in this order: `task_public_registration.md` (covers both Pengelola and Penghuni registration, including the RT/RW-vs-Developer sub-picker) → `task_unclaimed_area_handover.md` → `task_invite_generation.md` → `task_resident_registration.md` → Admin Dashboard Shell → feature tasks (Visitor Pass, Bills, etc. as they're written).
