# Task: Resident Registration via Invite

Full-stack module. Hand this whole file to Claude Code, together with `task_invite_generation.md`. Uses the same starter-kit auth mechanics as `task_public_registration.md` — no OTP, no email verification gate.

## What this does

Lets someone join an area by opening an invite link, filling in their info and account fields, and — depending on the situation — getting approved either by the area admin or by an existing resident of the same house.

## How it works

**Open the link.** Validate the invite token first, before showing any form — expired or revoked tokens show a clear error immediately.

**Fill in the form.** Name, email, password, phone, and which unit (block + unit number). Two very different things can happen here depending on whether that email/phone and that unit already exist:

- **Email or phone already exists in `users`** → this person already has an identity somewhere in the system (maybe they're a resident elsewhere, or an admin). Reuse that `users` row instead of creating a new one — they log in with their existing credentials rather than filling the account fields again.
- **Unit already exists under this same area** → don't create a duplicate `units` row. This is the "second household member" case (spouse, adult kid joining the same house). Create a `unit_user` row with `status = pending`, and send a confirmation request to whichever existing resident is already linked to that unit — not the area admin, since the admin usually can't verify family relationships and the existing resident can.
- **Unit exists but under a *different* area in the same complex** → this is the real conflict case (two RTs both claiming the same physical house). Block it with a clear message.

**No verification wait.** Same as `task_public_registration.md` — after submitting, the person can log in immediately.

**Approval.** Check `areas.require_approval` for this area:
- Off → the `area_members` row goes straight to `active`
- On → it sits at `pending_approval` until the admin reviews it in their pending-members list

Note this is a separate approval track from the unit-join confirmation above — a person can be approved into the area by the admin while still waiting on the existing resident to confirm they belong to that specific unit, or vice versa. Both have to clear before the account is fully set up, but they don't block each other.

## Backend to build

- `InviteController` additions:
  - `GET /invite/{code}` — validates token, returns area name or an error state
  - `POST /invite/{code}/submit` — runs the find-or-create-user logic (reusing the starter kit's account-creation logic where a new identity is needed), the unit resolution logic (new unit / join existing unit / conflict), and sets `area_members` status per the approval logic above
- `Admin/MemberApprovalController` (`app/Http/Controllers/Admin/`):
  - `GET /admin/members/pending` — area_members with status `pending_approval` for this area
  - `POST /admin/members/{id}/approve` / `/reject`
- `UnitJoinController` (`app/Http/Controllers/`):
  - `POST /unit/{unit}/join-requests/{request}/confirm` / `/decline` — for the existing-resident confirmation flow

## Frontend to build

- `resources/js/Pages/Invite/Show.jsx` — invalid-token state, the form (reusing starter kit account fields where a new identity is needed), duplicate/conflict messaging, then shows the right waiting-state message depending on what's still pending
- `resources/js/Pages/Admin/Members/Pending.jsx` — admin's approval queue
- `resources/js/Pages/Unit/JoinRequest.jsx` — shown to an existing resident when someone requests to join their unit

## Edge cases to test

- Expired/revoked invite → clear error, no form shown
- Same physical unit claimed under a different area → blocked with the standard conflict message
- Second household member joining an existing unit → no duplicate unit created, existing resident (not admin) gets the confirmation request
- Person who already exists in `users` (e.g. resident elsewhere) joins a new area → reuses identity, doesn't duplicate
- Area with `require_approval = off` → resident becomes active right after submitting, no pending-list entry
- Rejected area membership → account stays `rejected`, not deleted, cannot log in for that area

## Done when

- [ ] Full flow works end to end for a brand-new unit, with approval on
- [ ] Full flow works end to end for a brand-new unit, with approval off
- [ ] Second household member joining an existing unit correctly goes to the existing resident for confirmation, not the admin
- [ ] Cross-area unit conflict is blocked with a clear message
- [ ] A person who already exists elsewhere in the system is correctly recognized, not duplicated
- [ ] Rejected memberships can't log in but aren't deleted
