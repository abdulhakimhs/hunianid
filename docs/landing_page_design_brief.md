# Landing Page Design Brief

Hand this whole file to Claude Code (or a designer) to build the marketing landing page. This is a content + structure + visual direction spec — not code.

## Who this page is for

Two different visitors, both need to feel spoken to:
1. **RT/community admin** — often not very technical, motivated by "this makes my job less annoying," skeptical of anything that sounds like corporate SaaS jargon
2. **Paid property manager / developer** — more business-minded, motivated by operational efficiency and looking professional to residents/board

The page has to work for both without feeling split in two. Lead with the shared pain (manual, chaotic community admin work), then branch messaging partway down.

## Design direction

**Avoid the generic AI-SaaS look, and avoid going flat.** No cream background + serif + terracotta, no near-black + neon accent, no broadsheet hairline-rule layout — but also don't default to bare, shadowless surfaces. The direct competitor in this space, AntaraWarga (antarawarga.com), uses real depth: a photographic hero banner, elevated cards with shadow, colorful grouped sections, a comparison table, a numbered "how to start" sequence. That's the right level of polish to match — a page that reads as a real, funded product, not a template.

**Direction: modern, techy SaaS — not heritage/civic.** The product's real differentiator is AI automation (natural-language visitor pass, auto-categorized complaints, WhatsApp bot) — the visual language should read as "smart, live, automated," not "community signage." Two accent colors carry distinct meaning: one signals AI-powered moments, the other signals human/community activity — this mapping is the thing that keeps the palette from feeling arbitrary.

**Palette** (name these as CSS variables):
- `--bg` `#F3FBF9` — very light, airy mint-white canvas, bright and fresh, not stark white and not warm cream
- `--ink` `#142033` — dark blue-black, used for body text and dark UI chrome (sidebar, header bands) — not the page background itself
- `--sky` `#2FC2E8` — vivid sky blue, reserved for AI-powered moments: the WA-to-QR transform, auto-categorization tags, the AI assistant touches
- `--mint` `#1FCB82` — vivid fresh green, reserved for human/community activity: active status, approvals, payments confirmed
- `--coral` `#FF6B57` — used sparingly for alerts and small emphasis only

**Depth technique:** soft, cool-toned shadows on elevated cards (stat cards, feature blocks, pricing cards) — `--shadow-md: 0 8px 24px rgba(20,32,51,0.08), 0 2px 6px rgba(20,32,51,0.05)`. Icon chips for AI-related features get a subtle two-stop gradient (`linear-gradient(135deg, #38D9F5, #2FC2E8)`) — this is the one place gradient is used deliberately, not decoratively. Rounded corners run larger than a typical enterprise dashboard (16-20px on cards) to read as consumer-friendly SaaS, not legacy enterprise software.

**Type:**
- Display face: a clean geometric-leaning grotesk with some presence — should feel like a product built in 2026, not a government portal
- Body face: a highly legible, plain sans — this audience includes non-technical readers, clarity beats personality here
- Utility/data face: a monospace face for anything showing numbers (pricing, stats, timestamps) — ties visually to the product's actual dashboards and reinforces the "precise, automated" feeling

**Signature element:** the hero should show a short looping animation or a static illustrated sequence of a WhatsApp message ("Tamu saya jam 10, nama Budi") visually transforming into a QR code, rendered in the `--sky` gradient to visually mark it as the AI moment. This is specific to the product's actual core moment, not a generic dashboard screenshot or stock photo.

## Page structure, section by section

### 1. Hero
- **Headline (ID):** "Kelola perumahan tanpa ribet catat manual"
- **Subhead (ID):** "Satu aplikasi untuk tagihan, tamu, komplain, dan lapor warga — cukup chat WhatsApp, sisanya otomatis."
- **Primary CTA:** "Daftarkan Perumahan Anda" → registration flow
- **Secondary CTA:** "Lihat Cara Kerjanya" → scrolls to section 3
- **Visual:** the WA-message-to-QR signature animation described above

### 2. The problem (before this exists)
Three short pain-point cards, written from the RT/pengelola's own frustration, not from a "we solve X" angle:
- "Buku tamu kertas ilang, ga tau siapa yang masuk kemarin"
- "Nagih IPL harus WA satu-satu, ada yang nunggak ga ketauan"
- "Komplain warga numpuk di grup WA, ilang ketimbun chat lain"
- **Visual:** simple icon-illustrations for each, in the `--hedge` or `--brick` accent, not stock photography

### 3. How it works
A short numbered sequence (this is a real process, so numbering is justified here per the design principles) — keep to 3 steps:
1. "Warga chat lewat WhatsApp" — visual: chat bubble mockup
2. "AI catat otomatis ke sistem" — visual: the data being structured (QR generated, bill logged, ticket categorized)
3. "Pengurus & satpam lihat semuanya di satu tempat" — visual: simplified dashboard glimpse

### 4. Feature showcase
Four feature blocks, each with a short benefit-first headline (not a feature name):
- **Tamu ga perlu nunggu di gerbang** (Visitor Pass) — QR + WA integration visual
- **Tagihan ga ada yang kececer** (Billing) — simple bill list mockup
- **Komplain langsung ke tukang yang benar** (Maintenance + AI) — chat-to-ticket visual
- **Warga tau info penting, ga ketimbun chat grup** (Broadcast) — notification mockup

### 5. Segment split — "Untuk RT" vs "Untuk Pengelola/Developer"
Two side-by-side (or stacked on mobile) panels, same visual weight, different copy:
- **RT panel:** focus on "ga perlu jadi jago teknologi," approval control, low cost
- **Pengelola/Developer panel:** focus on multi-unit oversight, professional image to residents, audit trail
- **Visual:** two distinct small illustrations — a house/gate icon for RT, a building/cluster icon for developer — keep them visually related (same illustration style) so it doesn't feel like two different products

### 6. Trust section
Since this is a new product without a long client list yet, be honest rather than fabricate social proof:
- Either: "Dibangun bareng RT dan pengelola perumahan asli" with a short founder note, or leave this section out entirely until there's real testimonial content
- Do not use placeholder fake logos or invented testimonial quotes

### 7. Pricing
Keep this simple and low-pressure given pricing likely varies by unit count:
- One clear line: "Harga menyesuaikan jumlah unit — mulai gratis untuk RT kecil"
- CTA: "Hubungi Kami" or "Cek Harga" rather than a full pricing table, since the actual tiers aren't finalized yet

### 8. FAQ
4-5 short questions anticipating real objections:
- "Warga saya gaptek, gimana?" → answer emphasizes WA-first, no app download required for basic use
- "Data kami aman ga?" → answer in plain terms, no jargon
- "Berapa lama setup-nya?" → set honest expectations
- "Bisa buat 2 RT dalam 1 komplek?" → yes, this is literally a supported use case, worth highlighting

### 9. Final CTA + footer
Repeat the primary CTA once more, simple footer with contact, no filler links to pages that don't exist yet.

## Copy principles

Write every headline and button from the reader's side, not the system's side — "Daftarkan Perumahan Anda," not "Mulai Onboarding." Avoid English SaaS jargon where a plain Indonesian phrase says it better ("catat otomatis" over "auto-generate"). Every claim on this page should map to something the product actually does today — don't promise the multi-project dashboard or CCTV integration, since those aren't built yet.

## Reference mockups (already built)

Three standalone HTML previews exist alongside this brief:
- `preview_desktop_dashboard.html` and `preview_mobile_screens.html` — establish the palette, depth, type, and component style (cards, icon chips, stat blocks)
- `icon_assets.html` — the 3 pain-point icons, 3 how-it-works step icons, and 2 segment icons needed for Sections 2, 3, and 5 below, ready to copy as inline SVG

Open them directly in a browser. These are style references and ready-to-use assets — not a finished landing page.

## Image/illustration needs

Still needed — the hero sequence and feature-block visuals are the only pieces not yet built:
1. Hero: WA-message-to-QR sequence (animated or 3-frame static sequence) — use the `--sky` gradient from `icon_assets.html`'s AI-step icon as the visual cue
2. 4 feature-block mockups — once the actual app exists, these can be real screenshots styled consistently; until then, use `preview_desktop_dashboard.html` and `preview_mobile_screens.html` as the starting point for what these should look like

## Done when

- [ ] Page reads clearly for both RT and developer audiences without feeling like two unrelated pages
- [ ] No fabricated testimonials, client logos, or unbuilt-feature claims
- [ ] All copy is in Bahasa Indonesia, plain and specific, no generic SaaS phrasing
- [ ] Responsive down to mobile — this audience is likely to open the link from a WhatsApp share on a phone
- [ ] Signature hero visual is built (even as a simple 3-frame sequence, doesn't need to be a full animation for v1)

## Note for whoever runs this in Claude Code

If a UI/UX skill is installed in that Claude Code session (e.g. "UI UX Pro Max"), it will not necessarily trigger automatically just because it's installed — Claude decides relevance from the skill's own description. To be safe, **name the skill explicitly** in the prompt, e.g.: *"Build this landing page following the attached brief, and use the [skill name] skill for the implementation."* Don't assume it's applied unless it's called out directly.

