# Dokumentasi Fitur HunianID

Dokumen ini merangkum **semua fitur, flow, dan logic** yang sudah dibangun di aplikasi HunianID: Web App (Admin/Pengelola), Security PWA, Tenant PWA, dan WhatsApp Bot — termasuk semua job terjadwal (scheduler/cron). Disusun dari pembacaan langsung kode per 2026-10-24 (branch `fix/invoice-payment-proof`, commit `c490874`).

> Catatan cara baca: tiap bagian punya sub-bagian **"Belum selesai / catatan"** kalau ada gap yang ditemukan di kode. Ini bukan asumsi — semua sudah diverifikasi langsung ke source code, bukan cuma dari memory/notes lama.

---

## 0. Arsitektur Singkat

- **Backend**: Laravel, tanpa queue worker — semua job terjadwal jalan sinkron lewat container `scheduler` terpisah (`docker-compose.yml`) yang nge-loop `php artisan schedule:run` tiap 60 detik.
- **Frontend**: Satu aplikasi Inertia + React (TypeScript) untuk admin, tenant, dan security — bukan 3 app terpisah. Dibedakan lewat role & layout.
- **Struktur controller aktual** (sedikit beda dari rencana awal di CLAUDE.md): tidak ada folder `Resident/`. Controller tenant-facing ada flat di `app/Http/Controllers/` (`TenantDashboardController`, `BillsController`, `TicketsController`, `FamilyController`, dst). Controller admin di `app/Http/Controllers/Admin/`, security di `app/Http/Controllers/Security/`.
- **Routing tenant**: digabung dalam `routes/admin.php` lewat grup `Route::prefix('tenant')->name('tenant.')`, bukan file routes terpisah.
- **Model data inti** (sudah final, jangan disederhanakan):
  - `Complex` = lokasi fisik (perumahan). `Area` = siapa yang mengelola (bisa lebih dari satu RT per komplek).
  - `User` = satu baris per manusia, global (tidak ada `area_id`/`role` di tabel `users`).
  - `AreaMember` = role + status approval user di SATU area tertentu (resident/staff/superadmin/security).
  - `UnitUser` (pivot `unit_user`) = hubungan user ↔ rumah (`relation`: owner/tenant/family, `status`: active/pending). Approval-nya beda pihak dari `AreaMember` — dikonfirmasi oleh penghuni aktif unit tsb, bukan admin.
  - `MembershipContext` (`app/Services/MembershipContext.php`) = resolver "area + role mana yang sedang aktif" untuk user yang login, disimpan di session (`current_membership_id`). Ini yang dipakai hampir semua controller admin/security/tenant untuk tahu konteks area aktif.

---

## 1. AUTENTIKASI (dipakai di semua app — admin, tenant, security)

Satu halaman login (`resources/js/pages/auth/login.tsx`) menyediakan 4 metode:

### 1.1 Email + Password
Bawaan Laravel Fortify/starter kit, tidak dimodifikasi. **Tidak ada gate verifikasi email** — sengaja dihilangkan supaya signup lebih gampang (keputusan produk).

### 1.2 Passkey (WebAuthn)
Juga lewat Fortify, komponen `ManagePasskeys` di halaman settings.

### 1.3 Login OTP via WhatsApp (`PhoneLoginController`)
**Hanya untuk login, tidak membuat akun baru.** Flow:
1. `POST /login/phone/request` dengan nomor HP → cari `User` by phone.
   - Tidak ketemu → balas `{registered: false}`, frontend arahkan user ke `/register?phone=...&quick=1` (mode registrasi cepat).
   - Ketemu → hapus OTP lama yang belum diverifikasi, generate kode 6 digit (`random_int`), simpan **hash**-nya (`code_hash`, bcrypt) + `expires_at` (+5 menit), kirim via WhatsApp (`WaBlastService`).
   - Kalau WA gagal terkirim → baris OTP dihapus, balas HTTP 503 (tidak ada kode "menggantung").
   - Response sukses sertakan `dev_code` (plaintext) **hanya di environment local/testing** — tidak pernah di production.
2. `POST /login/phone/verify` dengan kode → ambil OTP terbaru yang belum diverifikasi.
   - Expired → error. `attempts >= 5` → lockout, harus minta kode baru. Salah → `attempts` di-increment + error.
   - Benar → `verified_at` diisi, user login, session di-regenerate.
3. `POST /login/phone/password` — jalur alternatif login phone+password langsung (tanpa OTP), untuk yang sudah pernah set password.

Di-throttle: `throttle:otp-request` dan `throttle:otp-verify`.

### 1.4 Google OAuth (`SocialLoginController`)
- `/auth/google/redirect` → redirect ke Google via Socialite.
- `/auth/google/callback` → ambil profil Google, cocokkan email (case-insensitive) ke `User` yang sudah ada.
  - **Ketemu** → langsung login.
  - **Belum ada** → nama & email disimpan di session (`google_prefill`), redirect ke `/register`. User tetap harus memilih role/lokasi dan set password sendiri lewat wizard registrasi normal — **tidak auto-register**, supaya tidak membuat user tanpa baris `area_members` (yang akan merusak `MembershipContext`).

> ⚠️ Rute callback (`auth/google/redirect|callback`) namanya harus sama persis dengan `GOOGLE_REDIRECT_URI` di `.env` dan whitelist di Google Cloud Console — jangan diganti sembarangan.

---

## 2. REGISTRASI & ONBOARDING

### 2.1 Registrasi Publik (`RegistrationController` + `RegistrationService`)
Satu halaman `/register` untuk Pengelola maupun Penghuni, tanpa undangan.

**Flow lokasi**: Google Places (autocomplete + `place_id`) atau input manual (province/city dari tabel `laravolt/indonesia`).
- `POST /register/location/preview` — kalau pakai Google Place ID yang sudah pernah dipakai komplek lain, sistem kasih tahu berapa area/RT yang sudah ada di komplek itu (peringatan duplikat) **sebelum** submit.

**Mode deteksi** (`$mode`): `google` (dari Google OAuth prefill), `phone_quick` (dari jalur OTP-tidak-terdaftar), atau `normal`.

**Jalur Pengelola** (role=pengelola):
- Wajib pilih `sub_type`: `rt_rw` atau `developer`, dan nama area (`area_name`).
- Sistem resolve/buat `Complex` (Google: `firstOrCreate` by `google_place_id`; manual: selalu `Complex::create` baru — **tidak ada deteksi duplikat untuk komplek manual**, ini keterbatasan yang diterima).
- Buat `Area` baru (status `active`, `require_approval=true`) + `AreaMember` role `superadmin`, status langsung `active` (admin pendiri tidak perlu approval).

**Jalur Penghuni** (role=penghuni):
- Kalau komplek itu **belum punya area aktif sama sekali** → dibuatkan **area "unclaimed"** otomatis (nama "Warga baru (belum ada pengurus)"), `AreaMember` role `resident` status `active` langsung (tidak perlu approval — tidak ada admin untuk approve). Inilah growth on-ramp-nya.
- Kalau sudah ada ≥1 area aktif → auto-pilih kalau cuma satu, atau user pilih area sendiri kalau lebih dari satu. Harus isi `unit_number`. Unit di-resolve lewat `UnitResolverService`, dan `AreaMember` dibuat dengan status **`pending_approval`** (selalu pending — karena tidak ada undangan sebagai dasar kepercayaan).

**Logic duplikasi unit** (`UnitResolverService::resolve()`):
- Normalisasi `block + unit_number` → `normalized_address`.
- Unit belum ada → dibuat baru di area ini, user jadi penghuni pertama (pivot `status=active`, otomatis, tanpa konfirmasi).
- Unit sudah ada **di area yang sama**: kalau user sudah jadi residen situ → idempotent (tidak dobel). Kalau belum, dan unit itu **sudah punya** residen aktif lain → pivot `status=pending` (nunggu dikonfirmasi residen aktif unit itu, bukan admin). Kalau unit itu belum punya residen aktif → pivot `status=active` langsung.
- Unit sudah ada **di area lain** (komplek sama) → **ditolak** (`ValidationException`): "Unit ini sudah terdaftar di RT/pengelola lain...". Ini dijaga oleh unique constraint `(complex_id, normalized_address)`.

### 2.2 Konfirmasi Join Unit oleh Penghuni Lain (`UnitJoinController`)
Ini beda dari approval `AreaMember`. Kalau ada orang baru mengaku tinggal di unit yang sudah berpenghuni, **penghuni aktif unit itu sendiri** yang konfirmasi — lewat `unit/join-requests/*` — bukan admin area.

### 2.3 Registrasi Lewat Undangan (`InviteController`)
- `GET /invite/{code}` → tampilkan nama komplek + nama area (nama area disembunyikan kalau statusnya `unclaimed`), bedakan antara:
  - **Undangan Tenant** (sudah ditentukan unit + nama + phone-nya) → `isTenantInvite=true`.
  - **Undangan Resident generik** — user isi sendiri unit_number/block.
- `POST /invite/{code}/submit`: cari-atau-buat `User` by email ATAU phone (supaya user lama yang terima invite tidak dobel baris). Resolve unit via `UnitResolverService`. `AreaMember` role `resident` dibuat; **butuh approval HANYA JIKA**: bukan tenant-invite DAN area bukan `unclaimed` DAN `area.require_approval=true`. Artinya: undangan tenant & join ke area unclaimed selalu skip approval.
- Sisi admin (`InviteController` juga): hanya **satu** "Tautan Pengurus" generik aktif sekaligus (bikin baru otomatis revoke yang lama). Tab ini hilang kalau area sudah punya superadmin/staff aktif. Undangan tenant bisa dijadwalkan (`scheduled_at`) → dikirim otomatis oleh job terjadwal `invites:send-scheduled` tiap menit.

### 2.4 Handover Area Unclaimed (`AreaHandoverController`)
- Hanya **pembuat area** (`area.created_by`) yang boleh melakukan promote, dan area harus masih `unclaimed`.
- `POST admin/area/promote` dengan `area_member_id` (siapa yang dipromosikan — bisa orang lain, bukan cuma diri sendiri) dan `type` (`rt_rw`/`developer`).
- Hasilnya: `area.type` diisi, `area.status` → `active`, dan target user mendapat `AreaMember` baru role `superadmin` status `active` (kalau sudah ada, idempotent). User yang dipromosikan tetap pegang role `resident` yang lama juga — boleh dobel role di area yang sama.
- UI-nya menyatu di halaman admin "Anggota" (`/admin/members`), bukan halaman tersendiri — terbuka untuk pendiri area via role-token khusus `unclaimed_creator`.

---

## 3. HAK AKSES & ROLE (sistem gating admin)

`EnsureAdminRole` middleware adalah pusat dari semua gating. Role biasa: `superadmin`, `staff`, `security`, `resident`. Plus 2 token spesial yang dihitung on-the-fly dari `MembershipContext`:
- **`unclaimed_creator`**: resident, area-nya `unclaimed`, dan dia pembuat area itu.
- **`area_without_admin`**: resident di area mana pun yang belum punya superadmin/staff aktif (tidak harus pendiri).

Middleware ini menaruh `adminArea` dan `adminMembership` di request attributes — dipakai semua controller admin supaya tidak perlu resolve ulang. Kalau membership saat ini statusnya bukan `active`, langsung 403 walau role-nya cocok.

**Matriks akses sidebar** (dihitung di `HandleInertiaRequests::adminAccess()`):

| Token | Members/Keluarga/Security/Pengumuman/VisitorPass | Invoices | Pending Approvals | Settings | Staff Mgmt | Invites | Tickets |
|---|---|---|---|---|---|---|---|
| superadmin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| staff | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| unclaimed_creator | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| area_without_admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (saja) | ❌ |
| resident biasa | ❌ semua | | | | | | |

---

## 4. WEB ADMIN (Pengelola)

### 4.1 Dashboard Admin (`DashboardController`)
Satu controller dishare dengan tenant — bedanya berdasarkan role saat itu:
- Resident yang sudah `active` sepenuhnya diarahkan ke dashboard tenant, tidak pernah lihat dashboard admin.
- Superadmin/staff: kalau area belum pernah punya invite aktif → banner onboarding "undang orang".
- Widget nyata (dihitung `jika isPengelola`): 5 invoice terbuka (unpaid/overdue) + total, 5 tiket terbuka (status≠closed) + total, 5 visitor pass aktif (`pending` & belum lewat `valid_until`) + total. Tiap widget punya link quick-action.
- Resident mid-onboarding dapat widget kosong semua.

### 4.2 Manajemen Anggota (`MembersController`, `MemberApprovalController`, `FamiliesController`)
- **Daftar Anggota** (`/admin/members`): hanya tampilkan `AreaMember` status `active`. Setiap member dicarikan unit aktifnya. **Security yang bukan penghuni (tidak punya unit) disembunyikan dari daftar** — karena dia pekerja, bukan warga.
- **Persetujuan Pending** (`MemberApprovalController`, superadmin/staff saja): approve/reject member `pending_approval`. Tidak ada notifikasi WA terkirim saat approve/reject.
- **Keluarga** (`FamiliesController`) — **read-only** dari sisi admin. Admin cuma lihat daftar `relation=family` di semua unit area. Tambah/edit/hapus anggota keluarga adalah hak penghuni unit itu sendiri (lewat `FamilyController`, bukan panel admin).

### 4.3 Manajemen Staff & Security (`StaffController`, `SecurityController`)
Dua implementasi hampir identik:
- **Buat akun dulu, undang nanti** — dua langkah terpisah dengan sengaja (admin bisa input data banyak orang dulu, baru kirim undangan belakangan).
- `invite()`/`bulkInvite()`: kirim link klaim password via WA. Bulk invite otomatis skip yang sudah klaim password.
- Link klaim (`/security/claim/{code}`, `/staff/claim/{code}`) — publik, tidak perlu login. Set password → langsung login + jadi membership aktif.
- `update()` juga bisa set status `suspended` (status di luar set active/pending/rejected, longgar secara tipe).
- `destroy()` hapus baris `AreaMember`-nya saja, bukan `User` globalnya.
- **Asimetri gating**: Security bisa diurus oleh superadmin/staff/unclaimed_creator. **Staff hanya bisa diurus superadmin** — staff tidak bisa menambah staff lain.

### 4.4 Tagihan / Invoices (`InvoicesController` dkk, gated superadmin/staff saja — menyentuh uang)
- **Buat tagihan manual**: pilih penyewa (hanya unit dengan penghuni aktif yang jadi member area aktif), nominal, kategori (per-area), memo, jatuh tempo opsional, bisa sekaligus disimpan sebagai **template berulang**.
- **Satu invoice per penyewa**, bukan per unit — kalau satu rumah ditagih ke 2 orang, jadi 2 invoice independen.
- **Nomor invoice**: format `INV/{YYYY}/{MM}/{urutan}`, unique per-area (bukan global — ini hasil fix bug duplicate key MySQL 1062 tanggal 2026-10-11), dengan retry otomatis sampai 5x kalau race condition.
- **Template berulang** (`InvoiceTemplatesController`): `day_of_month` 1–28 (supaya valid di bulan manapun). Job harian `invoices:generate-recurring` (01:00) generate invoice baru dari semua template yang `next_run_date` ≤ hari ini, resolve ulang daftar penyewa tiap kali jalan (tidak pakai daftar penyewa yang dibekukan), lalu kirim WA broadcast lewat `InvoiceNotificationService`.
- **Flip overdue** (`invoices:flip-overdue`, 01:05): invoice `unpaid` yang lewat jatuh tempo → `overdue`, tanpa notifikasi.
- **Reminder jatuh tempo** (`invoices:send-reminders`, 08:00): dikirim sesuai `reminder_days_before_due` per-area (default 3 hari), ini **sudah berfungsi penuh**, bukan fitur yang belum dikerjakan.
- **Lunas (single)**: wajib isi tanggal bayar (divalidasi pakai tanggal hari ini **zona WIB**, karena server jalan di UTC) + wajib upload foto bukti bayar (jpg/png/webp, maks 5MB). File disimpan di disk privat lokal (`payment-proofs/{area_id}/`, nama file random, bukan nama asli) — tidak bisa diakses publik. Hanya transisi `unpaid`/`overdue` → `paid`.
- **Lunas (bulk)**: cukup satu tanggal bayar untuk sekumpulan invoice — **tanpa** upload bukti bayar.
- **Batalkan**: hanya untuk invoice yang masih `unpaid`/`overdue`.
- **Lihat Bukti Bayar**: diserve lewat endpoint yang mengecek invoice tsb milik area admin yang login, dengan header `Cache-Control: private` + `X-Content-Type-Options: nosniff`.
- **Kategori Invoice**: nama unik per-area, boleh set nominal default, bisa dinonaktifkan. Tidak bisa dihapus kalau masih dipakai invoice/template — harus nonaktifkan saja.
- ⚠️ **Catatan penting**: tidak ditemukan validasi server-side yang mencegah membuat 2 invoice untuk penyewa/kategori/periode yang sama. Hanya ada filter periode di sisi frontend (dropdown "Bulan ini/Bulan lalu/dst"), itu cuma filter tampilan, bukan validasi pembuatan. Kalau sebelumnya memory menyebut ada validasi ini, perlu dicek ulang — kemungkinan belum pernah benar-benar masuk kode, atau sempat ter-revert.

### 4.5 Tiket / Laporan (admin side, `Admin\TicketsController`)
- **Detail tiket**: seluruh riwayat aktivitas (termasuk catatan internal staff), nomor WA pelapor (untuk tombol "Chat di WhatsApp" — **ini cuma link `wa.me`, tidak otomatis kirim apa-apa**, staff yang ngetik manual), dan pilihan staff untuk assign.
- **Ubah status**: hanya bisa maju ke `in_progress` atau `closed` (tidak ada "buka ulang"). Bisa sertakan catatan + foto. Otomatis kirim **WA sungguhan** ke penyewa lewat `TicketNotificationService::notifyTenantOfStatusChange()`.
- **Kirim Update** (`sendUpdate`): kirim progress note ke penyewa **tanpa** mengubah status — dipakai kalau tiket masih `in_progress` tapi mau kasih info. Juga kirim WA sungguhan.
- **Assign**: validasi target harus superadmin/staff aktif di area ini. Tidak ada notifikasi WA saat assign.
- **Set Prioritas** (low/medium/high): tidak ada notifikasi.
- **Catatan internal** (`addNote`): selalu `is_internal=true`, tidak pernah terlihat/terkirim ke penyewa.
- **Eskalasi otomatis**: job harian `tickets:send-escalation-reminders` (09:00). Per-area, kalau tiket (bukan `closed`) tidak ada follow-up selama lebih dari `ticketEscalationDays()` (default 7 hari), kirim WA ke staff yang di-assign (kalau ada) atau broadcast ke semua admin area. Reminder ini **berulang** setiap window habis, bukan sekali saja, sampai ada follow-up.

### 4.6 Pengumuman / Announcements
CRUD standar per-area. `send_whatsapp` (default aktif) memicu broadcast WA ke seluruh member area via `AnnouncementNotificationService`. **Hanya saat create** yang trigger broadcast — edit setelahnya tidak kirim ulang WA.

### 4.7 Visitor Pass (sisi admin)
Admin **hanya bisa melihat** (read-only) — tidak ada create/edit/delete dari panel admin. Pembuatan pass murni lewat chat WhatsApp AI (lihat bagian 6). Status ditampilkan dihitung real-time: `used`/`cancelled` langsung dari kolom DB, selain itu kalau `valid_until` sudah lewat → `expired`, kalau belum → `pending`. Tidak ada job terjadwal yang mem-flip status pass yang expired — murni dihitung saat dibaca.

### 4.8 Settings (gated superadmin/staff)
4 form independen per-area:
1. Template pesan undangan WA generik (placeholder `{nama}`/`{komplek}`/`{unit}`/`{link}`).
2. Template pesan undangan klaim Security.
3. `reminder_days_before_due` (1–30 hari, default 3).
4. `ticket_escalation_days` (1–30 hari, default 7).

> Catatan: Staff tidak punya template pesan undangan custom seperti Security — kemungkinan gap konsistensi, perlu dicek dengan tim kalau memang disengaja.

### 4.9 Shell Panel Admin
Sudah dibangun sebelumnya (sidebar, layout, routing) — **tidak dibangun ulang**, cuma diisi konten. Sidebar dikelompokkan: Utama / Warga / Staf & Keamanan / Komunikasi / Keuangan / Lainnya, tiap grup/menu difilter sesuai matriks akses di bagian 3.

---

## 5. SECURITY PWA (Satpam)

Role `security` selalu dipasangkan dengan area tertentu via `AreaMember`. Middleware `admin.role:security` mengisi `adminArea`/`adminMembership`.

### 5.1 Scan Visitor Pass (`Security\ScanController`, halaman `/security/scan`)
- UI kamera (`qr-scanner` npm package, kamera belakang diprioritaskan) + fallback input kode manual.
- `extractToken()` membersihkan input: kalau yang di-scan adalah URL lengkap `/pass/{token}`, diambil token-nya saja, lalu dilowercase — ini fix bug nyata dari testing sebelumnya.
- **Verifikasi** (`/security/scan/verify`): cari pass hanya di area milik satpam ini (tidak bisa lihat pass komplek lain). Hasil: `invalid` (tidak ketemu/`cancelled`), `used` (tampilkan info tamu + jam masuk — bukan status final, satpam bisa scan lagi untuk catat keluar), `expired` (status masih `pending` tapi `valid_until` sudah lewat), atau `valid`.
- **Konfirmasi Masuk** (`/security/scan/confirm`): ubah status jadi `used`, catat `used_at`/`used_by`. Hanya berhasil kalau pass masih `pending` dan belum expired.
- **Catat Keluar** (`/security/scan/exit`): ubah status jadi `exited`, catat `exited_at`/`exited_by`. Hanya berhasil kalau pass sedang `used`. **(Fitur baru, ditambahkan 2026-10-18 — belum pernah dites manual on-device.)**
- Tombol "Izinkan Masuk" muncul di status `valid`, "Catat Keluar" di status `used`, torch/senter toggle kalau device support.

### 5.2 Dashboard & Riwayat Security
- `Security\DashboardController`: statistik hari ini (jumlah scan, pending, total pass dibuat), 5 aktivitas terbaru.
- `Security\HistoryController` (`/security/history`): sampai 200 pass non-pending/non-expired untuk histori.

### 5.3 Akun & Profil Security
- Klaim akun lewat link WA (`/security/claim/{code}`) — admin sudah buat akunnya, satpam set password sendiri. Setelah berhasil klaim, langsung ditawari install PWA.
- Profil (`security/profile.tsx`): edit nama, ganti password, logout, dan **"Ganti Kompleks"** — kalau satpam punya >1 membership security aktif (jaga di beberapa komplek), bisa pindah konteks area aktif.

### 5.4 PWA Setup
- Manifest: nama "HunianID", `start_url`/`scope` = `/`, standalone, warna sesuai design system, ikon 192/512 + maskable.
- ⚠️ Ada bug historis yang sudah di-fix: tanpa manifest key yang benar, `vite-plugin-pwa` diam-diam fallback ke manifest placeholder (`scope=/build/`, tanpa ikon) yang gagal lolos installability check Chrome **tanpa error apapun** — sekarang sudah diperbaiki dan didokumentasikan di komentar `vite.config.ts`.
- Tidak ada offline-queue scan — ini PWA installable standar, bukan offline-first app.

### 5.5 ⚠️ Fitur Panic Alert — BARU UI, BELUM BERFUNGSI
Ditemukan di kode (tidak tercatat di memory lama):
- `panic-alert-overlay.tsx` — overlay fullscreen dengan efek bunyi sirine (Web Audio API) + getar HP, muncul di dashboard satpam kalau ada `activeAlert`.
- Komentar di kode sendiri eksplisit: fungsi konfirmasi pakai `setTimeout` dummy, "ganti dengan panggilan POST /security/alerts/:id/acknowledge yang asli begitu backend-nya ada" — **backend-nya memang belum ada sama sekali** (tidak ada route, controller, tabel).
- Pasangan di sisi tenant (`/panic`, halaman `tenant/panic.tsx`) juga **cuma mockup statis** — tombol panic tenant simulasi kirim + auto-acknowledge 8 detik, tanpa controller/route backend sama sekali.
- **Kesimpulan: fitur panic alert murni prototype tampilan, belum ada mekanisme real-time (tidak ada broadcast/websocket/polling), belum ada tabel data, belum ada endpoint acknowledge.** Perlu diinfokan ke tim kalau ada asumsi fitur ini sudah jalan.

---

## 6. TENANT PWA (Penghuni)

### 6.1 Dashboard Tenant (`TenantDashboardController`, `/tenant`)
Data nyata: nama + unit aktif, tagihan belum lunas/terdekat (jumlah + jatuh tempo), flag `isFirstTimeTenant` (belum pernah ada invoice/visitor pass) yang menukar kartu tagihan jadi kartu onboarding. 3 ubin: Tagihan, Tamu (visitor pass), Tiket. Tombol panic merah mengambang (lihat 5.5 — belum fungsional). Ubin "Fasilitas" sengaja belum dibangun.

### 6.2 Tagihan / Bills (`BillsController`, `/tenant/bills`)
Lihat semua invoice miliknya (kecuali cancelled), tab Belum Lunas vs Riwayat. **Tidak ada aksi bayar/upload bukti dari sisi penyewa** — itu sengaja hanya hak admin. Penyewa cuma bisa "Lihat Bukti" untuk invoice yang sudah lunas dan punya foto bukti, diakses dengan pengecekan kepemilikan ketat.

### 6.3 Tiket / Laporan (tenant side)
- Lapor masalah: wajib ada unit aktif, isi subjek/kategori/deskripsi + foto opsional (maks 5MB), notifikasi WA otomatis ke semua admin area.
- Halaman detail: **stepper status** Dilaporkan → Diproses → Selesai, riwayat aktivitas (catatan internal staff disaring, tidak tampil), flag "ada update belum dibaca".
- Penyewa bisa **menutup tiketnya sendiri**, dengan konfirmasi bottom-sheet.

### 6.4 Kelola Keluarga (`FamilyService` + `FamilyController`)
- Tambah anggota: normalisasi nomor HP, cari-atau-buat `User`, buat baris `unit_user` dengan `relation=family, status=active`.
- **Penjagaan kepemilikan**: hanya penghuni aktif unit itu yang boleh tambah/ubah/hapus anggota keluarganya — kalau bukan, dapat error 403/404 (`FamilyOwnershipException`). Ini beda dari approval `area_members`.
- Hapus anggota keluarga: **hanya memutus hubungan ke unit**, baris `User` globalnya tetap ada.
- Service ini **dishare dengan flow WhatsApp** ("keluarga") — satu logic, dua pintu masuk.

### 6.5 ⚠️ Buat Visitor Pass dari Dalam App — MASIH DUMMY
`/tenant/visitor-pass` (`tenant/visitor-pass.tsx`) adalah **halaman statis murni**, tidak ada controller/route backend sama sekali. Tombol buat/batal/share pass semuanya cuma mengubah state lokal React dengan `setTimeout` palsu — komentar di kode sendiri bilang "Dummy create — ganti dengan POST /tenant/visitor-pass yang asli". UI QR-share-nya sudah lengkap (pakai library `qrcode`, share ke WA), tapi belum nyambung ke backend apapun. **Satu-satunya jalur pembuatan visitor pass yang benar-benar jalan adalah lewat chat WhatsApp AI** (bagian 7).

### 6.6 Halaman Unit & Lainnya
- `/tenant/unit`: ringkasan keluarga (ambil 3 + total), tapi `unit.type` (Pemilik/Penyewa) dan kontak pengelola masih **data hardcode**, belum nyambung database.
- Pengumuman tenant (`AnnouncementsController::index`): sudah nyambung data asli, ambil pengumuman dari semua area unit aktif user.
- Profil (`/tenant/profile`): data asli (nama/unit/phone), ganti role/area aktif, toggle notifikasi push, logout asli. Dua baris menu ("Ubah kata sandi", "Bantuan") **belum ada handler apapun** — tombol mati.
- Settings (`/settings/profile`, `/settings/security`): sudah didesain ulang, pakai komponen Fortify asli (ganti password, 2FA, passkey).

### 6.7 Landing di Area Unclaimed
Satu-satunya pemicu di sisi tenant adalah kartu "Belum ada pengurus di {area}" di dashboard generik (bukan dashboard khusus tenant) yang menawarkan 2 link undangan (jadi pengelola/jadi warga lain). Aksi promote sebenarnya terjadi di halaman admin "Anggota" yang terbuka untuk pendiri area — tidak ada halaman `/tenant/...` khusus untuk ini.

---

## 7. WHATSAPP BOT

Satu nomor WhatsApp, satu webhook masuk (`POST webhooks/wablas/incoming`, dijaga shared secret `?key=`, **bukan** signature header — Wablas tidak menandatangani payload). Ada **3 flow AI chat** yang berbagi webhook ini, dirutekan oleh `WablasMessageRouter`:

**Urutan prioritas routing**: lanjutkan percakapan yang sedang aktif untuk nomor itu (cek urutan: keluarga → tiket → visitor-pass); kalau tidak ada yang aktif, baru dirutekan berdasarkan keyword — `"keluarga"` → flow keluarga, `"lapor"` → flow tiket/laporan, selain itu → default ke flow visitor pass.

### 7.1 Buat Visitor Pass via Chat (`VisitorPassChatService`)
1. Normalisasi nomor pengirim, cari `User`. **Tidak terdaftar → disuruh daftar dulu**, flow berhenti.
2. Load/buat baris `WhatsappConversation` (status: `collecting`/`awaiting_unit_choice`/`completed`). Kalau percakapan lama **"stale"** (tidak ada pesan >2 jam) → direset otomatis.
3. Kapan saja user ketik `"mulai ulang"`/`"batal"`/`"reset"` (case-insensitive) → direset, mulai dari nol.
4. Kalau status sudah `completed`, otomatis reset diam-diam untuk mulai pass baru.
5. **Penentuan unit**: cari unit aktif user.
   - 0 unit aktif → disuruh daftar sebagai penghuni dulu, berhenti.
   - 1 unit → otomatis dipilih, tidak ditanya.
   - >1 unit → kirim daftar bernomor, status jadi `awaiting_unit_choice`; balasan harus angka valid, kalau tidak dikenali → kirim ulang daftarnya dengan pesan "tidak mengerti pilihan Anda".
6. Setelah unit jelas, tiap balasan user dikirim ke **DeepSeek** (`DeepSeekService::converse`) dengan system prompt Bahasa Indonesia yang memaksa output JSON ketat: `{"action":"ask","message":"..."}` atau `{"action":"complete","guest_name":...,"vehicle_info":...,"purpose":...}`. Prompt ini melarang DeepSeek menanyakan ulang field yang sudah terjawab, dan melarang mengada-ada data.
   - Kalau DeepSeek gagal dipanggil atau hasilnya bukan JSON valid → balas generik "sistem sedang sibuk", state tidak berubah (jadi aman untuk dicoba ulang).
   - Kalau DeepSeek bilang `complete` tapi ternyata ada field kosong (sistem tidak percaya buta ke output AI) → dianggap belum lengkap, kirim pertanyaan ulang, **tidak** langsung finalisasi.
7. **Finalisasi** (dalam DB transaction): buat `VisitorPass` (`status=pending`, `valid_from=sekarang`, `valid_until=akhir hari ini`, `source=whatsapp_ai`, `raw_input`=seluruh riwayat chat untuk audit), tandai percakapan `completed`, balas dengan link publik `/pass/{token}` + jam berlaku (format Indonesia).

### 7.2 Kelola Keluarga via Chat (`FamilyChatService`, keyword `"keluarga"`)
Flow AI chat paralel, logic inti-nya (tambah/hapus anggota) **memakai service yang sama** (`FamilyService`) dengan fitur app tenant di bagian 6.4 — jadi satu sumber kebenaran, dua pintu masuk (app & WA).

### 7.3 Lapor Masalah via Chat (`TicketChatService`, keyword `"lapor"`)
Flow AI chat ketiga untuk bikin tiket langsung dari WhatsApp. Saat tiket selesai dibuat lewat chat ini, tetap memicu `TicketNotificationService::notifyAdminsOfNewTicket()` — admin area dapat WA notifikasi, sama seperti tiket yang dibuat lewat app.

### 7.4 Login OTP via WhatsApp
Sudah dijelaskan di bagian 1.3 — pengiriman kodenya juga lewat `WaBlastService`, jalur terpisah dari ketiga flow chat AI di atas (ini bukan percakapan, cuma kirim satu pesan kode).

### 7.5 Notifikasi Tiket via WA — Mana yang Benar-Benar Otomatis
Semua lewat satu titik: `TicketNotificationService`, dan **keempatnya benar-benar kirim WA otomatis** (bukan sekadar link):
- Tiket baru dibuat → WA ke semua admin area.
- Status diubah (Diproses/Selesai) → WA ke penyewa.
- "Kirim Update" (tanpa ubah status) → WA ke penyewa.
- Eskalasi (job terjadwal) → WA ke staff assign / semua admin area.

Sebaliknya, tombol **"Chat di WhatsApp"** di halaman detail tiket admin itu **cuma link `wa.me`** biasa — membuka WhatsApp staff untuk mengetik manual, tidak otomatis mengirim apapun. Pola link manual yang sama juga dipakai di beberapa halaman share-undangan lain (invites, security invites, staff invites) — bukan khusus tiket.

### 7.6 WaBlastService — Pengirim WA Tunggal
- Satu-satunya method publik: `send($phone, $message)` — **hanya pesan teks**, belum ada pengiriman media/template.
- Kalau token belum dikonfigurasi: di environment local/testing tetap dianggap sukses (biar dev flow tidak mandek), di production betulan gagal.
- Base URL Wablas **per akun** (misalnya `https://tegal.wablas.com`), bukan `wablas.com` generik — salah host akan gagal diam-diam dengan pesan "token invalid or device expired". Ini belum didokumentasikan sebagai komentar di kode, hanya catatan tim — sebaiknya ditambahkan sebagai komentar di `config/services.php`.
- Semua fitur WA di app (OTP, 3 flow chat AI, notifikasi tiket/invoice/pengumuman) **lewat satu class ini** — titik integrasi tunggal.

### 7.7 Testing Lokal
Webhook harus bisa diakses dari internet publik — perlu tunnel (cloudflared/ngrok) yang diarahkan ke dev server Laravel, lalu URL publik tunnel + `?key={secret}` didaftarkan sebagai webhook URL di dashboard Wablas.

---

## 8. SEMUA JOB TERJADWAL (Scheduler)

Didefinisikan di `bootstrap/app.php` (`withSchedule()`, gaya Laravel 11+, tidak ada `Kernel.php`). Dijalankan oleh container `scheduler` terpisah yang nge-loop `schedule:run` tiap 60 detik (bukan cron sistem).

| Command | Jadwal | Fungsi |
|---|---|---|
| `invites:send-scheduled` | Tiap menit | Kirim undangan tenant yang dijadwalkan (`scheduled_at` sudah lewat) |
| `invoices:generate-recurring` | Harian 01:00 | Generate invoice dari template berulang yang jatuh gilirannya, lalu WA broadcast ke penyewa |
| `invoices:flip-overdue` | Harian 01:05 | Flip invoice `unpaid` yang lewat jatuh tempo → `overdue` |
| `invoices:send-reminders` | Harian 08:00 | Kirim reminder WA jatuh tempo sesuai setting per-area |
| `tickets:send-escalation-reminders` | Harian 09:00 | Nag WA untuk tiket yang mangkrak lebih dari N hari (setting per-area), berulang tiap window |

Semua pakai `withoutOverlapping()` supaya tidak dobel jalan kalau run sebelumnya belum selesai. Tidak ada queue worker — semua jalan sinkron di proses yang sama.

---

## 9. RINGKASAN GAP / HAL YANG BELUM SELESAI

Daftar ini murni temuan dari membaca kode langsung (2026-10-24), bukan asumsi:

1. **Panic Alert (satpam & tenant)** — UI/animasi sudah ada di kedua sisi, tapi **tidak ada backend sama sekali** (tidak ada route, controller, tabel, mekanisme real-time). Statusnya prototype tampilan.
2. **Buat Visitor Pass dari dalam Tenant PWA** — halaman `/tenant/visitor-pass` masih 100% dummy/statis, belum nyambung backend. Jalur yang benar-benar jalan hanya via WhatsApp AI.
3. **Validasi duplikat invoice per-periode** — tidak ditemukan di kode manapun (controller/service/migration). Hanya ada filter periode kosmetik di frontend. Perlu dikonfirmasi apakah ini memang belum pernah dibangun atau pernah ter-revert.
4. **Exit flow visitor pass** (`/security/scan/exit`, catat jam keluar tamu) — baru ditambahkan 2026-10-18, belum pernah dites manual di device asli.
5. **Halaman `/tenant/unit`** — info `unit.type` (Pemilik/Penyewa) dan kontak pengelola masih hardcode, belum ambil data asli.
6. **Profil Tenant** — menu "Ubah kata sandi" dan "Bantuan" belum ada handler/aksi.
7. **Template pesan undangan Staff** — tidak ada opsi custom seperti Security punya di halaman Settings (kemungkinan gap konsistensi, bukan bug).
8. **Test `SecurityScanTest.php`** — tidak bisa jalan di SQLite lokal karena ada statement `MODIFY` enum yang MySQL-only di migration.
9. **Base URL Wablas per-akun** — gotcha penting (bukan `wablas.com` generik) belum ditulis sebagai komentar di `config/services.php`, cuma catatan tim eksternal.

---

*Dokumen ini disusun dari pembacaan kode langsung per 2026-10-24 di branch `fix/invoice-payment-proof` (commit `c490874`). Kalau ada perubahan kode setelah tanggal ini, mohon diperbarui.*
