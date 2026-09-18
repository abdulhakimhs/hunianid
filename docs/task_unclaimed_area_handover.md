# Task: Unclaimed Area & Admin Handover Flow

Full-stack module. Depends on `task_public_registration.md` (Penghuni branch) and the existing Invite Generation feature.

## What this does

Handles the second half of the growth flow: once a resident has registered into an unclaimed area (creation logic is fully specified in `task_public_registration.md`, Penghuni path, zero-area branch — don't duplicate that logic here), this task builds the dual-CTA dashboard guidance and the actual mechanism to hand over admin control.

## How it works

**Recap of the starting state (already built by `task_public_registration.md`):** an `areas` row with `status = 'unclaimed'` and `created_by` pointing to the resident who triggered it. That resident is an active `area_members` row with role `resident`. Their dashboard already shows the two invite CTAs described in `task_public_registration.md` Step 6 ("Ajak RT/Pengelola Bergabung" and "Ajak Warga Lain Bergabung") — this task builds what happens after someone accepts either invite.

**This is not a one-time forced choice.** The `created_by` resident can invite anyone first, in any order, and the option to hand over admin access stays available on their dashboard indefinitely — not just as a first-run prompt. Make sure the promote action is a persistent, easy-to-find dashboard feature (e.g. always visible from the members list for as long as the area is unclaimed), not something that only appears once and then disappears.

**Promoting someone to admin ("menyerahkan akses pengelola"):** only the original `created_by` resident sees this action, available on any active member of that same area. Triggering it asks one more thing first — since `areas.type` is `null` for an unclaimed area (nobody had picked RT/RW vs Developer yet), the person doing the promotion picks it now: **"RT/RW"** or **"Developer"**. Then:
- Sets `areas.type` to the chosen value
- Adds a new `area_members` row for the promoted person: same `area_id`, role `superadmin` (they keep their existing `resident` row too, if they have one — same pattern as an admin who also lives there)
- Flips `areas.status` from `unclaimed` to `active`
- Once active, normal rules resume — new residents joining from this point follow the area's actual `require_approval` setting, invite links behave normally

**Confirmation dialog copy matters here** — this is a real, meaningful handover of control, and the person doing it may not be technical. Be explicit about what's about to happen, e.g.: *"[Nama] akan menjadi pengurus resmi [nama area]. Mereka akan bisa mengelola warga, tagihan, dan pengaturan lainnya. Anda tetap terdaftar sebagai warga seperti biasa."*

**Not handled in this task (flag, don't build):** residents who joined during the unclaimed phase are not retroactively re-reviewed once a real admin takes over — they stay as they are. If that turns out to matter, it's a separate task later.

## Backend to build

- Migration for `'unclaimed'` status and `areas.created_by` is owned by `task_public_registration.md` — if that task hasn't run yet, do it first, don't duplicate the migration here
- `AreaHandoverController`:
  - `POST /admin/area/promote` — only callable by the area's `created_by` user, targets another `area_members` row in the same area, creates the `superadmin` role row and flips area status

## Frontend to build

- The two dashboard CTA cards themselves are built in `task_public_registration.md` — this task builds what they lead to
- `resources/js/Pages/Admin/Members/Index.jsx` — extend the members list so the `created_by` user sees a persistent "Jadikan Pengurus" action next to any active member, for as long as the area is unclaimed. Confirmation dialog with the explicit copy described above.

## Edge cases to test

- Someone who is NOT the `created_by` user cannot see or trigger the promote action, even via direct request
- The promote action stays available on the dashboard across multiple visits, not just immediately after registration
- Promoting a member who already has other roles in the area just adds the superadmin row, doesn't remove their existing role
- Area with `status = unclaimed` never shows up as a duplicate-manager notice during other people's registration (it's not really "claimed" yet)
- Second resident joining an unclaimed area also goes straight to active (still no admin to approve them) — approval only kicks in after the area becomes active

## Done when

- [ ] Resident registering at a brand-new complex successfully creates an unclaimed area and lands active, no approval blocker
- [ ] The promote action is persistent and easy to find, not a one-time prompt that disappears
- [ ] Only the original creator can promote someone to admin
- [ ] Confirmation dialog clearly explains what's about to happen in plain language
- [ ] Promotion correctly flips area status and grants the role without disturbing the person's existing membership
