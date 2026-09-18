# Master Database Design — Phase 1 (Foundation)

This is the single source of truth for the database schema. Matches `database_design_phase1.sql` exactly. If the two ever disagree, the SQL file is what actually runs — treat this doc as the explanation, and update both together.

**Scope:** Multi-area foundation — physical locations, RT/manager accounts, people, roles, houses, and invites. Does not include Visitor Pass, Bills, or other feature tables (separate phase).

## The big picture

Four ideas hold this whole schema together:

1. **`complexes` is the physical place. `areas` is who manages it.** One perumahan can have 2 RTs managing different parts of it — same `complex_id`, two `areas` rows.
2. **`users` is one row per real human, globally.** Not per area, not per unit. A person verifies their phone once, ever.
3. **`area_members` is where a person's relationship to a specific area lives** — their role there, and whether that specific membership is approved. The same person can have several of these rows across different areas.
4. **`unit_user` is where a person's relationship to a specific house lives** — separate from area membership, because a house can have multiple residents and a person can have multiple houses, including across different areas.

## Migration order

`complexes` → `areas` → `users` → `roles` → `area_members` → `units` → `unit_user` → `invites`

(strict order — everything after `complexes` and `users` depends on one or both)

---

## 1. `complexes`

The physical housing complex, resolved via Google Places, or created manually if it doesn't appear in search. Anchored by `google_place_id` when available so the same real-world address is never represented twice — manually-created complexes have no such anchor and are **not** deduplicated automatically (accepted limitation, flagged in `task_public_registration.md`).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| google_place_id | string(255) | yes | null | Unique when present. Null for manually-entered complexes |
| source | enum('google', 'manual') | no | 'google' | Tracks how this complex was created |
| name | string(255) | no | — | e.g. "Perumahan Griya Asri" |
| formatted_address | string(500) | yes | null | |
| province_code | string(20) | yes | null | References `laravolt/indonesia`'s existing provinces table (string `code` PK, not bigint) — verify exact table/column name against that package's migration before adding a FK constraint |
| city_code | string(20) | yes | null | Same package, cities table |
| latitude | decimal(10,8) | yes | null | |
| longitude | decimal(11,8) | yes | null | |
| created_at / updated_at | timestamps | — | — | |

**Indexes:** unique on `google_place_id` (MySQL allows multiple NULLs, so manual entries don't conflict with each other).

---

## 2. `areas`

An RT or a paid property manager as an administrative entity. Owns the operational data (units, invites, and later bills) — not `complexes`, because two areas in the same complex must never see each other's data.

Can also exist in a **placeholder `unclaimed` state** — created automatically when a resident registers at a complex with no admin yet (see `task_public_registration.md` and `task_unclaimed_area_handover.md`). An unclaimed area has no real admin until someone is promoted.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| complex_id | bigint unsigned, FK → complexes.id | no | — | |
| name | string(255) | no | — | e.g. "RT 05 Griya Asri" |
| type | enum('rt_self_managed', 'paid_manager', 'developer') | no | 'rt_self_managed' | Cosmetic in Phase 1 — doesn't change behavior yet |
| status | enum('unclaimed', 'active', 'inactive', 'suspended') | no | 'active' | `unclaimed` = placeholder, no real admin yet |
| require_approval | boolean | no | true | If true, new area memberships need admin approval after verification (does not apply to registrations that land in an unclaimed area, or to the public-registration Penghuni path, which always requires approval regardless of this flag) |
| created_by | bigint unsigned, FK → users.id | yes | null | Who triggered this area's creation — for unclaimed areas, this is the only person with authority to promote someone to admin |
| created_at / updated_at | timestamps | — | — | |

**Indexes:** index on `complex_id`.
**FK:** `complex_id` → `complexes.id` on delete restrict, `created_by` → `users.id` on delete set null.

---

## 3. `users`

**One row per real human, full stop.** No `area_id`, no `role` here — those are contextual and live in `area_members`. This is what lets one phone number verify once and be reused across every area/unit that person is connected to.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| name | string(255) | no | — | |
| phone | string(20) | yes | null | **globally unique**. Normalized format: `62xxxxxxxxxx`, no leading `0` or `+` |
| email | string(255) | yes | null | **globally unique** |
| password | string(255) | yes | null | Only set if this person ever logs in with a password (admin-type roles); residents use OTP only |
| phone_verified_at | timestamp | yes | null | |
| email_verified_at | timestamp | yes | null | |
| created_at / updated_at | timestamps | — | — | |

**Indexes:** unique on `phone`, unique on `email`.

**Why global uniqueness works here (and didn't in the old design):** because a person now has exactly one row no matter how many areas or units they're part of, there's no scenario where the same real person legitimately needs two different `users` rows. Everything that varies by context (role, approval status, which unit) lives in the join tables below.

---

## 4. `roles`

Simple lookup table. Seeded once, not something the app creates dynamically in Phase 1.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| key_name | string(50) | no | — | **unique**. `superadmin`, `staff`, `security`, `resident` |
| label | string(100) | no | — | Display label, e.g. "Super Admin" |
| created_at / updated_at | timestamps | — | — | |

**Seed data:** superadmin, staff, security, resident — see bottom of the SQL file.

---

## 5. `area_members`

**The core fix from the original design.** Connects a real person to a specific area with a specific role. A person can have multiple rows here — one per area they're involved with, including holding two different roles within the *same* area (e.g. an RT admin who also lives there gets one row as `superadmin`, and is separately linked to a unit via `unit_user`).

Approval status lives here, not on `users`, because the same person can be `active` in one area and `pending_approval` in another simultaneously.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| area_id | bigint unsigned, FK → areas.id | no | — | |
| user_id | bigint unsigned, FK → users.id | no | — | |
| role_id | bigint unsigned, FK → roles.id | no | — | |
| status | enum('pending_approval', 'active', 'rejected', 'suspended') | no | 'pending_approval' | |
| approved_by | bigint unsigned, FK → users.id | yes | null | |
| approved_at | timestamp | yes | null | |
| created_at / updated_at | timestamps | — | — | |

**Indexes:** unique on (`area_id`, `user_id`, `role_id`) — blocks the exact same person from getting the exact same role in the exact same area twice, while still allowing different roles in the same area, or the same role across different areas.
**FK:** `area_id` → `areas.id` on delete cascade, `user_id` → `users.id` on delete cascade, `role_id` → `roles.id` on delete restrict, `approved_by` → `users.id` on delete set null.

---

## 6. `units`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| area_id | bigint unsigned, FK → areas.id | no | — | |
| complex_id | bigint unsigned, FK → complexes.id | no | — | Denormalized, used for the cross-area duplicate-unit check |
| unit_number | string(50) | no | — | |
| block | string(50) | yes | null | |
| normalized_address | string(255) | no | — | App-generated: lowercase, trimmed `block + unit_number` |
| status | enum('active', 'inactive') | no | 'active' | |
| created_at / updated_at | timestamps | — | — | |

**Indexes:** unique on (`complex_id`, `normalized_address`) — this is what blocks two *different areas* from both claiming the same physical house. It does **not** block a second person from joining the same unit within the *same* area — that's handled by `unit_user` below, not by creating a second `units` row.
**FK:** `area_id` → `areas.id`, `complex_id` → `complexes.id`, both on delete restrict.

---

## 7. `unit_user`

Links a real person to a house. Many-to-many on purpose: one house can have several residents (owner, spouse, adult kids), and one person can be linked to several houses (including across different areas — see Hakim's case below).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| unit_id | bigint unsigned, FK → units.id | no | — | |
| user_id | bigint unsigned, FK → users.id | no | — | |
| relation | enum('owner', 'renter', 'family') | no | 'owner' | |
| status | enum('pending', 'active', 'declined') | no | 'active' | See note below |
| confirmed_by | bigint unsigned, FK → users.id | yes | null | Which existing resident confirmed this join |
| confirmed_at | timestamp | yes | null | |
| created_at / updated_at | timestamps | — | — | |

**Why `status` defaults to `active`:** the common case is the *first* person registering a brand-new unit (nobody to confirm with yet) — that goes straight to `active`. It's only set to `pending` explicitly when a *second* person tries to join a unit that already has someone linked to it — in that case, an existing resident (not the RT admin — they usually can't verify family relationships) must confirm before the row becomes `active`.

**Indexes:** unique on (`unit_id`, `user_id`) — one relationship row per person per unit, no duplicates.
**FK:** `unit_id` → `units.id` on delete cascade, `user_id` → `users.id` on delete cascade, `confirmed_by` → `users.id` on delete set null.

---

## 8. `invites`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | bigint unsigned, PK, auto-increment | no | — | |
| area_id | bigint unsigned, FK → areas.id | no | — | |
| created_by | bigint unsigned, FK → users.id | no | — | |
| code | string(32) | no | — | **unique** |
| expires_at | timestamp | yes | null | null = never expires |
| status | enum('active', 'expired', 'revoked') | no | 'active' | |
| created_at / updated_at | timestamps | — | — | |

**Indexes:** unique on `code`.
**FK:** `area_id` → `areas.id` on delete cascade, `created_by` → `users.id` on delete restrict.

---

## 9. Not used — `otp_codes` removed

Earlier versions of this schema included an `otp_codes` table for phone-based OTP login. That approach was dropped in favor of Laravel's standard email + password auth (starter kit, built-in email verification) to reduce signup friction. `phone` is still stored on `users` for future WhatsApp bot use, but is not a login credential. Do not recreate this table unless OTP is reinstated as a deliberate decision.

---

## Worked example (traces through every table)

**Budi registers RT 05, and lives there himself:**
1. `complexes` — new row for "Perumahan Griya Asri" (or links to existing if the address was already registered by someone else)
2. `areas` — new row "RT 05 Griya Asri", linked to that complex
3. `users` — new row for Budi (name, phone, email)
4. `area_members` — Budi + RT 05 + role `superadmin`, status `active`
5. Budi separately registers his own unit → `units` row created → `unit_user` row links Budi to it, `status = active` (first person, nothing to confirm)

**Hakim joins via invite, registers his first house under RT 05:**
1. `users` — new row for Hakim (his phone is verified here, once)
2. `units` — new row for his house under RT 05
3. `unit_user` — links Hakim to it, `status = active`
4. `area_members` — Hakim + RT 05 + role `resident`, status `pending_approval` → becomes `active` once Budi approves

**Hakim also owns a house under RT 07 (same complex):**
1. `users` — **no new row**, Hakim is already known by his verified phone
2. `units` — new row under RT 07's `area_id`
3. `unit_user` — new link, Hakim to this second unit
4. `area_members` — a *second* row: Hakim + RT 07 + role `resident`

**Budi's wife joins his existing unit:**
1. `users` — new row for her (first time verifying)
2. `units` — **no new row** — the system recognizes "Blok A No. 5" already exists under RT 05
3. `unit_user` — new row linking her to that same unit, `status = pending`
4. Budi (the existing resident on that unit) gets a confirmation request → confirms → `status = active`

## Not yet decided (flagged, not blocking)

- Whether a `rejected` resident can retry registration via a new invite
- Whether abandoned/never-verified area registrations need a cleanup job
- Whether the "already has an area" duplicate-complex notice should reveal the existing area's name (privacy consideration)
