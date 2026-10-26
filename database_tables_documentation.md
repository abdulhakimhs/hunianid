# Dokumentasi Tabel Database — HunianID

Dokumen ini menjelaskan peruntukan setiap tabel di database `hunianid`. Dikelompokkan per domain fitur. Lihat migration file terkait (`database/migrations/`) untuk kolom lengkap dan tipe data presisnya.

---

## 1. Identitas & Autentikasi

### `users`
Satu baris per manusia nyata, global di seluruh sistem — **bukan** per-area atau per-unit. Email dan phone unik secara global. Tidak punya kolom `area_id` atau `role` (itu sengaja hidup di `area_members`, lihat bagian 2). Kolom penting: `profile_completed_at` (menandai wizard registrasi selesai), `last_membership_id` (membership area aktif terakhir dipakai, FK ke `area_members`). Email & password nullable karena user bisa dibuat/login lewat jalur phone-OTP atau Google OAuth tanpa password awal.

### `sessions`
Session login Laravel standar (cookie-based). Satu baris per sesi browser aktif.

### `password_reset_tokens`
Token sekali-pakai untuk flow "lupa password" bawaan Laravel starter kit.

### `passkeys`
Kredensial WebAuthn (login tanpa password, biometrik/security key) milik satu user. Satu user bisa punya banyak passkey (multi-device).

### `otp_codes`
Kode OTP (hash, bukan plaintext) untuk login via nomor WhatsApp. Dibuat per percobaan login, punya `expires_at` dan `attempts` untuk mencegah brute-force. Catatan: pengiriman WhatsApp belum terintegrasi provider resmi — kode plaintext hanya dikembalikan di response API saat environment local/testing.

### Kolom two-factor di `users`
`two_factor_secret`, `two_factor_recovery_codes`, `two_factor_confirmed_at` — infrastruktur 2FA bawaan Fortify, dipakai bareng login passkey.

---

## 2. Struktur Perumahan & Keanggotaan

### `complexes`
Lokasi fisik perumahan (alamat, koordinat, Google Place ID). **Satu complex = satu lokasi nyata.** Tidak peduli siapa yang mengelola.

### `areas`
Siapa yang mengelola suatu complex. Satu complex bisa punya lebih dari satu area (contoh: dua RT berbeda di perumahan yang sama). Kolom `type` (`rt_self_managed` / `paid_manager` / `developer`) dan `status` (termasuk `unclaimed` — area "kosong" yang terbentuk otomatis saat resident mendaftar di lokasi tanpa admin, menunggu di-klaim). `require_approval` menentukan apakah pendaftaran resident baru perlu disetujui admin.

### `roles`
Master daftar role sistem: `superadmin`, `staff`, `security`, `resident`. Statis, diisi lewat seeder/migration, bukan tabel yang berubah-ubah.

### `area_members`
Peran + status approval seseorang **di satu area tertentu**. Satu user bisa punya banyak baris di sini (beda area, atau bahkan beda role di area yang sama — misal admin RT yang juga tinggal di situ sebagai resident). Unique constraint `(area_id, user_id, role_id)` mencegah duplikasi role yang sama. `status`: `pending_approval` / `active` / `rejected` / `suspended`.

### `units`
Satu rumah/unit fisik, terikat ke `area` (siapa yang mengelola) dan `complex` (lokasinya). Unique constraint `(complex_id, normalized_address)` mencegah dua area mengklaim rumah yang sama.

### `unit_user`
Hubungan seseorang dengan satu unit spesifik — sengaja dipisah dari `area_members` karena: (a) satu rumah bisa dihuni banyak orang, (b) satu orang bisa punya banyak rumah, (c) approval-nya berbeda pemilik — `area_members` disetujui admin area, sedangkan `unit_user` baru (anggota keluarga) dikonfirmasi oleh *resident yang sudah ada* di unit itu, bukan admin. Kolom `relation`: `owner` / `tenant` / `family`.

### `invites`
Link undangan yang dibuat admin/staff untuk mempercepat pendaftaran resident/security/staff di suatu area (alternatif dari pendaftaran publik yang butuh approval). Punya `code` unik, `expires_at`, `status`.

---

## 3. Visitor Pass (Kunjungan Tamu)

### `visitor_passes`
Pass tamu yang dibuat resident untuk satu unit — dipindai security di gerbang. `token` (UUID) adalah identitas publik yang ditunjukkan ke tamu lewat link `/pass/{token}`. `status`: `pending` → `used` (dipindai masuk) → `exited` (keluar, tracked via `exited_at`/`exited_by`) atau `cancelled`. `source` membedakan dibuat manual lewat app (`manual`) atau lewat chat AI WhatsApp (`whatsapp_ai`) — `raw_input` menyimpan histori chat asli untuk audit kalau sumbernya AI.

### `whatsapp_conversations`
State machine percakapan WhatsApp untuk pembuatan visitor pass via chat bahasa natural. Satu baris per nomor telepon yang sedang/sudah ngobrol. `status` melacak di tahap mana (`collecting` → `awaiting_unit_choice` → `completed`/`abandoned`). `collected_fields` dan `history` (JSON) adalah data yang sudah terkumpul dan transkrip mentah yang dikirim ke DeepSeek untuk ekstraksi NLP.

---

## 4. Keluarga (Family Management)

### `family_chat_conversations`
State machine percakapan WhatsApp untuk mengelola anggota keluarga di satu unit (tambah/hapus anggota) — pola sama seperti `whatsapp_conversations` tapi dengan state tambahan khusus flow keluarga (`awaiting_action_choice`, `awaiting_remove_choice`, dst). `last_unit_user_id` menunjuk baris `unit_user` terakhir yang sedang diproses dalam percakapan itu.

---

## 5. Penagihan (Invoice / Tagihan)

### `invoice_categories`
Kategori tagihan custom per area (misal "Iuran Bulanan", "Keamanan", "Kebersihan") — dulunya enum tetap (`invoice_category`), sekarang bebas didefinisikan tiap area lewat tabel ini. `default_amount` jadi nilai prefill saat bikin invoice baru.

### `invoice_templates`
Aturan tagihan berulang (misal "iuran bulanan semua unit, jatuh tempo 14 hari, tanggal 1 tiap bulan"). `scope_type` + `scope_params` (JSON) menentukan siapa yang ditagih — dirancang supaya fleksibel menambah cakupan baru (misal "hanya blok tertentu") tanpa migration baru. `next_run_date` dipakai scheduler untuk tahu kapan generate invoice berikutnya.

### `invoices`
Tagihan aktual yang ditagihkan ke satu resident untuk satu unit. Bisa lahir dari template (`invoice_template_id`) atau dibuat manual (null). `invoice_number` unik **per area** (bukan global — diperbaiki 2026-10-11 setelah ada bug duplikat). `payment_proof_path` menyimpan bukti bayar yang diupload resident (disk private, tidak public URL). `broadcast_sent_at`/`reminder_sent_at` melacak notifikasi WhatsApp yang sudah terkirim supaya tidak dobel kirim.

---

## 6. Laporan/Tiket (Ticketing)

### `tickets`
Laporan/keluhan resident ke pengelola (kerusakan, keamanan, kebersihan, dll). `source` membedakan dibuat lewat web app atau chat WhatsApp AI. `priority` dan `assigned_to` (staff yang menangani) ditambahkan saat redesign jadi workflow proper. `tenant_last_read_at` vs `last_followup_at` adalah dua jam berbeda: yang pertama kapan tenant terakhir baca balasan, yang kedua kapan staff terakhir bertindak — dipakai scheduler eskalasi (`last_escalation_sent_at` menahan agar reminder eskalasi tidak terkirim berulang-ulang per hari).

### `ticket_messages`
Percakapan di dalam satu tiket (tenant ↔ staff, atau catatan sistem). `sender_type`: `tenant`/`staff`/`system`. `is_internal` menandai catatan staff yang **tidak** ditampilkan ke tenant dan tidak memicu notifikasi WhatsApp — beda dari pesan biasa yang terlihat dua arah.

### `ticket_chat_conversations`
State machine chat WhatsApp untuk membuat tiket lewat percakapan bahasa natural — pola identik dengan `whatsapp_conversations`, hanya targetnya `ticket_id` bukan `visitor_pass_id`.

---

## 7. Pengumuman (Announcements)

### `announcements`
Pengumuman yang dibuat admin/staff untuk seluruh penghuni di satu area. `send_whatsapp` menentukan apakah ikut di-broadcast ke WhatsApp (bukan cuma tampil di app), `sent_count` mencatat berapa banyak nomor berhasil dikirimi.

---

## 8. Panic Button & Notifikasi Push

### `panic_alerts`
Log tiap kali resident menekan tombol panic di tenant PWA. `reason` opsional (`medical`/`security`/`fire`/`other`) — dicatat untuk riwayat/audit, dipicu dari satu unit tertentu.

### `push_subscriptions`
Endpoint Web Push (browser) milik satu user — dipakai untuk mengirim notifikasi push real-time (misal notifikasi panic ke security/admin) tanpa WhatsApp. Satu user bisa punya beberapa device/browser terdaftar.

---

## 9. Subscription & Billing (SaaS Plan)

### `plans`
Master paket berbayar yang ditawarkan (nama, batas jumlah unit, harga bulanan/tahunan, lama trial, apakah bisa self-service checkout). Statis, dikelola lewat seeder (`2026_10_25_100006_seed_default_plans.php`).

### `subscriptions`
Status subscription **satu area** (satu-satu, `area_id` unique) terhadap satu plan. `status`: `trialing` / `active` / `past_due` / `expired` / `canceled`. `trial_ends_at` dan `current_period_ends_at` dipakai scheduler untuk tahu kapan harus downgrade/kunci akses.

### `subscription_payments`
Riwayat transaksi pembayaran subscription lewat Midtrans. `order_id` unik per transaksi, `raw_notification` menyimpan payload webhook Midtrans mentah untuk audit/debug. `snap_token` adalah token checkout yang ditampilkan ke user.

### `payment_gateway_settings`
Konfigurasi kunci API Midtrans (sandbox/production) — baris tunggal, **sengaja** dikelola manual lewat phpMyAdmin, bukan `.env`, supaya bisa diganti tanpa deploy ulang.

---

## 10. Marketing / Landing Page

### `contact_submissions`
Submission dari form kontak di landing page (calon klien baru yang tertarik, bukan user terdaftar). `plan_interest` mencatat paket yang diminati, `status` untuk tracking follow-up sales (`new`/`contacted`/`closed`).

### `notification_recipients`
Daftar email yang menerima notifikasi setiap ada `contact_submissions` baru. Baris tunggal/multi, **sengaja tanpa UI admin** — dikelola manual lewat phpMyAdmin.

---

## 11. Data Wilayah (Indonesia Region)

### `indonesia_provinces`, `indonesia_cities`, `indonesia_districts`, `indonesia_villages`
Data wilayah administratif Indonesia dari package `laravolt/indonesia` (pihak ketiga, sudah terpasang). **Jangan di-reseed atau dibuat ulang.** Primary key tabel-tabel ini adalah `code` (string), bukan auto-increment `id` — beda dari semua tabel lain di project ini. `complexes` relasinya ke `provinces`/`cities` lewat kode ini. Level `districts`/`villages` ada di package tapi sengaja tidak dipakai (skip untuk v1).

---

## 12. Infrastruktur Laravel (bawaan framework, bukan domain bisnis)

| Tabel | Fungsi |
|---|---|
| `cache`, `cache_locks` | Cache driver berbasis database |
| `jobs`, `job_batches`, `failed_jobs` | Queue job (proses background, misal kirim WhatsApp async) |
| `migrations` | Riwayat migration yang sudah dijalankan |

---

## Catatan desain yang jangan diubah sembarangan

- **`complexes` ≠ `areas`** — jangan digabung, satu lokasi fisik bisa dikelola lebih dari satu pengelola.
- **`users` tidak boleh punya kolom `area_id`/`role` langsung** — itu selalu kontekstual lewat `area_members`.
- **`area_members` vs `unit_user` punya pemilik approval yang beda** — jangan disatukan.
- **`invoice_number` unik per `area_id`, bukan global.**
- **`payment_gateway_settings`, `notification_recipients`** sengaja tidak punya UI admin — perubahan konfigurasi via phpMyAdmin langsung, ini keputusan bisnis bukan kekurangan fitur.
- **Tabel `indonesia_*`** jangan diseed ulang, primary key-nya `code` bukan `id`.
