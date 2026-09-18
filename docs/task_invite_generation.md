# Task: Invite Generation

Full-stack module. Hand this whole file to Claude Code.

## What this does

Lets an area admin (superadmin or staff) generate a shareable link that residents use to join their area. This has to exist before Resident Registration can work at all — no invite, no way in.

## How it works

An admin opens the Invite management page and taps Generate. This creates one `invites` row tied to their `area_id`, with a random unique `code`. They copy the link or share it straight to WhatsApp.

Only one thing to get right here: **regenerating an invite must invalidate the old one.** If an admin taps Generate again (say, the old link leaked or they just want a fresh one), the previous `invites` row's status flips to `revoked`, and anyone who still has the old link sees a clear "this invite is no longer valid" message — not a broken form.

Only `superadmin` and `staff` roles (checked via `area_members`) can generate or revoke invites — `security` and `resident` roles should never see this page.

## Backend to build

- `InviteController` (`app/Http/Controllers/Admin/`):
  - `POST /admin/invites` — creates a new `invites` row for the admin's active area, revokes any previously active one for that area first
  - `GET /admin/invites` — returns the currently active invite (if any) for display
  - `POST /admin/invites/{invite}/revoke` — manually revoke without generating a new one
- Role check middleware (reusing whatever gate is already built for admin-only routes) applied to all of the above

## Frontend to build

- `resources/js/Pages/Admin/Invite/Index.tsx` — shows the current active invite link (or a "no active invite yet" state), Copy button, Share-to-WhatsApp button, Regenerate button with a confirmation dialog since it invalidates the old one

## Edge cases to test

- Opening an old, revoked invite link shows a clear "no longer valid" message, not a crash or blank form
- A `security` or `resident` role hitting `/admin/invites` directly via URL is blocked
- Regenerating twice in a row correctly revokes the previous one each time, never leaves two active invites for the same area

## Done when

- [ ] Admin can generate, copy, and share an invite link
- [ ] Regenerating correctly revokes the old link — old link shows a clear error, doesn't silently still work
- [ ] Non-admin roles cannot access invite generation, even via direct URL
