# Task: Registration Flow (Pengelola & Penghuni)

Full-stack module. Hand this whole file to Claude Code together with `CLAUDE.md`.

## Important correction from an earlier version of this task

- **This is a dedicated public page** (`/register`), reachable by anyone, not something under `/admin`.
- **Use the Laravel starter kit's existing auth scaffolding as the foundation** — it already ships with register, login, and forgot-password. Do not build a parallel auth system. This task **extends** the starter kit's registration controller/flow with extra steps (role, location, area/unit assignment) rather than replacing it.
- **No email verification gate.** After registering, the person goes straight to login — no "check your email" step blocking access. If the starter kit ships with the `verified` middleware enabled by default, **turn it off** for this flow; don't leave it active out of habit.

## What this does, in one paragraph

Anyone lands on `/register`, picks whether they're a resident (Penghuni) or a manager (Pengelola), finds their residential complex (Google Places or manual entry), finishes the starter kit's normal account fields, and is redirected to log in immediately — no verification wait. After logging in, they land on their dashboard, which then guides them toward the next meaningful action depending on their role and situation. This is a second on-ramp alongside the existing invite-link flow (`task_resident_registration.md`) — both coexist.

## Full flow

### Step 1 — Role picker
`/register` opens with two cards: **"Saya Penghuni"** / **"Saya Pengurus (RT/Pengelola)"**. This choice determines which steps follow — store it in the registration session/wizard state, don't ask again later.

### Step 2 — Location
Same screen design for both roles:
- Google Places Autocomplete search
- Link below it: *"Perumahan saya tidak muncul di sini"* → manual entry: Provinsi (dropdown) → Kota/Kabupaten (dropdown, filtered by Provinsi) → Nama perumahan (text) → Alamat (text). Skip Kecamatan for v1.
- After resolving (either path), show one of these before continuing:
  - Complex has 1+ active `areas` → *"Ditemukan: [nama komplek] — sudah ada [N] RT/pengelola terdaftar di sini."*
  - Complex has 0 active `areas` (brand new, or only an `unclaimed` one exists) → *"Anda akan jadi warga pertama yang terdaftar di sini! Nanti Anda bisa ajak RT/pengurus untuk bergabung."* (Penghuni path only — Pengelola registering here is just normal, no special messaging needed)

### Step 3 — Account fields
The starter kit's normal registration form (name, email, password) — reuse it as-is, don't redesign it. This is where the `users` row actually gets created.

### Step 4 — Role-specific finish

**Pengelola:**
- Pick a sub-type first: **"RT/RW"** or **"Developer"** — two cards, shown right after choosing the Pengelola role in Step 1, not a dropdown buried later in the form. If Developer is picked, show a small note: *"Multi-project dashboard is coming soon — for now, each project registers separately."*
- Create the `areas` row (`status = 'active'`, `type` = the sub-type just picked — this is the only path where `type` is set at creation time; areas created via the unclaimed route start with `type = null` and get it set later during handover, see `task_unclaimed_area_handover.md`), linked to the resolved complex
- Create `area_members`: this user + this area + role `superadmin`, status `active` immediately (first admin, nothing to approve against)

**Penghuni:**
- Branch on how many active `areas` exist at the resolved complex:
  - **Zero** → auto-create an unclaimed shell `areas` row (`status = 'unclaimed'`, `created_by` = this user). Create `area_members` for this user (role `resident`, status `active` — no admin exists yet to approve anyone). Full detail on what happens next lives in `task_unclaimed_area_handover.md`.
  - **One** → proceed directly to unit entry against that area
  - **Two or more** → show a selector: *"Pilih RT/pengelola Anda"*, then unit entry against the chosen area
- **Unit entry** (unless the zero-areas branch applied, which skips straight to dashboard): enter unit number/block, reusing the unit-resolution logic from `task_resident_registration.md` — new unit created directly, existing unit under the same area goes to existing-resident confirmation, existing unit under a different area is blocked as a conflict
- `area_members.status` for this registration: `active` if it landed in the unclaimed branch, otherwise **always `pending_approval`** regardless of that area's `require_approval` setting — this path has no invite token to lean on for trust

### Step 5 — Redirect to login
No verification wait. The account works immediately for login purposes (whether `area_members` is `active` or `pending_approval` affects what they can *do* once logged in, not whether they *can* log in).

### Step 6 — After login, dashboard guidance
This is the moment that needs the most UX care — the dashboard should never just dump someone into an empty screen. Show contextual guidance based on their situation:

- **Pengelola, just registered** → dashboard opens with a clear prompt: *"Langkah selanjutnya: undang warga Anda"* → generate invite link (existing Invite Generation feature)
- **Penghuni, landed in an unclaimed area** → dashboard shows two clear paths, presented as two equally-weighted cards, not one buried option. See `preview_unclaimed_dashboard.html` for the exact visual treatment — status banner, two cards (one visually marked as the suggested primary path with a colored border), and the explainer box below them:
  - **"Ajak RT/Pengelola Bergabung"** — generates an invite link framed for a manager, with a short explanation: *"Setelah mereka bergabung, Anda bisa menyerahkan akses pengelola ke akun mereka."*
  - **"Ajak Warga Lain Bergabung"** — generates a normal resident invite link
  - Include a short explainer near both cards: *"Anda bisa mengundang siapa saja duluan. Nanti, akses sebagai pengelola bisa dipindahkan ke akun warga manapun kapan saja dari halaman ini."* — this sets the right expectation that the handover (`task_unclaimed_area_handover.md`) is available whenever they're ready, not a one-time forced choice right now
- **Penghuni, pending approval** → clear waiting message, not a blank/broken dashboard: *"Akun Anda sedang menunggu persetujuan dari pengurus [nama area]."*
- **Penghuni, joined an unclaimed area AND is also waiting on an existing resident to confirm their unit** → both messages need to coexist gracefully, don't let one hide the other

### Step 7 — Someone opens an invite link
Covered fully in `task_resident_registration.md` — fills in their info, submits, lands in the area admin's approval queue. Every member who joins via invite always goes through the same approval queue on the admin dashboard, regardless of how they got there.

## Backend to build

- Extend the starter kit's registration flow — add the role/location/finish steps around its existing account-creation logic rather than duplicating it. Disable the `verified` email-gate middleware for this flow if the starter kit enables it by default.
- Extend `ComplexResolverService`: support manual complex creation (nullable `google_place_id`, `source` enum `('google','manual')` on `complexes`)
- **Reuse the existing `laravolt/indonesia` package** — already installed and migrated, provides `provinces` and `cities` tables. Do not seed or build a new Wilayah table. Note: this package's primary key is a string `code`, not an auto-increment `id` — when storing the selected province/city on a manually-created `complexes` row, store `province_code` / `city_code` as strings, not bigint foreign keys like the rest of this schema.
- `RegistrationWizardController` (or extend the starter kit's controller directly — whichever fits its existing structure better):
  - `POST /register/resolve-location` — returns resolved `complex_id`, name, and active-area count/list, driving the Step 2 messaging and Step 4 branching
  - Role-specific finish logic as described in Step 4

## Frontend to build

- `resources/js/Pages/Register/SelectRole.jsx`
- `resources/js/Pages/Register/SelectLocation.jsx` — Google Places + manual fallback + the location-state messaging
- Reuse the starter kit's existing register form component for Step 3 rather than rebuilding it
- Dashboard guidance components for each of the Step 6 states — these should feel like a natural part of the dashboard (same card/shadow style as `preview_desktop_dashboard.html`), not a separate onboarding modal bolted on top

## Edge cases to test

- Manual entry with no matching Google Place — complex still created, flow completes
- Zero/one/2+ active areas at a complex — correct branch taken in each case
- Login works immediately after registration, no verification step blocks it
- Penghuni landing in unclaimed area sees both invite CTAs clearly, with the "you can switch access later" explainer visible
- Non-unclaimed Penghuni registration is always `pending_approval`, even if that area's `require_approval` is off

## Done when

- [ ] `/register` works as a standalone public page for both roles, using the starter kit's actual auth mechanics underneath
- [ ] No verification wait — registration to working login is immediate
- [ ] All location-resolution messages display at the right moment
- [ ] Zero-area complexes create an unclaimed shell instead of blocking registration
- [ ] Dashboard guidance correctly branches for every Step 6 state, and the two unclaimed-area CTAs are equally clear and well-explained
- [ ] Every joined member, regardless of path, ends up visible in the area's approval queue
