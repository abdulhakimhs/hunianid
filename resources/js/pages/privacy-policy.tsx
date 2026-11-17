import { Head } from '@inertiajs/react';
import HunianLogo from '@/components/hunian-logo';
import SiteHeader from '@/components/site-header';

const SECTIONS: { title: string; body: React.ReactNode }[] = [
    {
        title: '1. Tentang Kebijakan Ini',
        body: (
            <p>
                Kebijakan Privasi ini menjelaskan bagaimana HunianID
                mengumpulkan, menggunakan, dan melindungi data pribadi
                pengguna layanan pengelolaan perumahan HunianID ("Layanan").
                Dengan menggunakan Layanan, Anda menyetujui praktik yang
                dijelaskan di sini.
            </p>
        ),
    },
    {
        title: '2. Data yang Kami Kumpulkan',
        body: (
            <>
                <p>Kami mengumpulkan data berikut sesuai kebutuhan Layanan:</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>
                        <strong>Data akun:</strong> nama, alamat email, nomor
                        telepon/WhatsApp, dan kata sandi (disimpan dalam
                        bentuk terenkripsi, tidak pernah dalam bentuk teks
                        biasa).
                    </li>
                    <li>
                        <strong>Data profil Google:</strong> jika Anda masuk
                        menggunakan Google, kami menerima nama, email, dan
                        foto profil dari akun Google Anda.
                    </li>
                    <li>
                        <strong>Data hunian:</strong> alamat unit, lokasi
                        (koordinat) perumahan, dan status keanggotaan Anda di
                        suatu area/RT.
                    </li>
                    <li>
                        <strong>Data tamu &amp; visitor pass:</strong> nama
                        tamu, informasi kendaraan, dan tujuan kunjungan yang
                        Anda masukkan sendiri atau sampaikan lewat chat
                        WhatsApp.
                    </li>
                    <li>
                        <strong>Data pembayaran:</strong> status dan riwayat
                        tagihan/iuran, diproses melalui mitra pembayaran
                        (Midtrans). Kami tidak menyimpan nomor kartu
                        pembayaran Anda.
                    </li>
                    <li>
                        <strong>Data notifikasi darurat:</strong> token
                        perangkat untuk mengirim notifikasi push, termasuk
                        saat tombol panik diaktifkan.
                    </li>
                    <li>
                        <strong>Riwayat percakapan WhatsApp:</strong> pesan
                        yang Anda kirim ke nomor WhatsApp resmi HunianID untuk
                        membuat visitor pass atau melapor, termasuk saat
                        diproses oleh AI untuk diubah menjadi data terstruktur.
                    </li>
                </ul>
            </>
        ),
    },
    {
        title: '3. Bagaimana Kami Menggunakan Data Anda',
        body: (
            <ul className="list-disc space-y-2 pl-5">
                <li>Mengelola akun, keanggotaan area, dan unit hunian Anda.</li>
                <li>Memproses dan mengirimkan visitor pass ke tamu Anda.</li>
                <li>Mencatat dan mengingatkan tagihan/iuran perumahan.</li>
                <li>
                    Meneruskan notifikasi darurat (tombol panik) ke petugas
                    keamanan terkait, lengkap dengan data unit dan lokasi
                    Anda.
                </li>
                <li>
                    Membalas percakapan WhatsApp Anda, termasuk memakai AI
                    untuk mengenali informasi tamu dari chat bebas Anda.
                </li>
                <li>Mengirim notifikasi dan email transaksional terkait akun Anda.</li>
            </ul>
        ),
    },
    {
        title: '4. Pihak Ketiga yang Memproses Data',
        body: (
            <>
                <p>
                    Untuk menjalankan Layanan, sebagian data Anda diproses
                    oleh mitra berikut, sebatas yang diperlukan untuk fungsi
                    masing-masing:
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>
                        <strong>Google</strong> — untuk login menggunakan akun
                        Google (OAuth).
                    </li>
                    <li>
                        <strong>Wablas</strong> — untuk mengirim dan menerima
                        pesan WhatsApp (OTP login, notifikasi, visitor pass).
                    </li>
                    <li>
                        <strong>DeepSeek</strong> — untuk memproses teks chat
                        WhatsApp menjadi data terstruktur (nama tamu,
                        kendaraan, tujuan) saat Anda membuat visitor pass lewat
                        chat.
                    </li>
                    <li>
                        <strong>Midtrans</strong> — untuk memproses pembayaran
                        tagihan/subscription.
                    </li>
                    <li>
                        <strong>Resend</strong> — untuk mengirim email seperti
                        reset kata sandi dan balasan formulir kontak.
                    </li>
                </ul>
                <p className="mt-3">
                    Kami tidak menjual data pribadi Anda kepada pihak mana
                    pun.
                </p>
            </>
        ),
    },
    {
        title: '5. Penyimpanan &amp; Keamanan Data',
        body: (
            <p>
                Kata sandi disimpan dalam bentuk terenkripsi (hashed), tidak
                pernah dalam bentuk teks biasa. Akses ke data admin dibatasi
                berdasarkan peran (role) Anda di suatu area. Kami menyimpan
                data selama akun Anda aktif, dan dapat menghapusnya atas
                permintaan sesuai bagian "Hak Anda" di bawah.
            </p>
        ),
    },
    {
        title: '6. Hak Anda',
        body: (
            <p>
                Anda dapat meminta akses, koreksi, atau penghapusan data
                pribadi Anda kapan saja dengan menghubungi kami di{' '}
                <a
                    href="mailto:halo@hunianid.com"
                    className="underline"
                >
                    halo@hunianid.com
                </a>
                . Kami akan menindaklanjuti permintaan Anda dalam waktu yang
                wajar.
            </p>
        ),
    },
    {
        title: '7. Data Anak',
        body: (
            <p>
                Layanan ini ditujukan untuk pengguna dewasa (penghuni dan
                pengelola perumahan). Kami tidak secara sengaja mengumpulkan
                data pribadi anak di bawah umur tanpa persetujuan orang tua
                atau wali.
            </p>
        ),
    },
    {
        title: '8. Perubahan Kebijakan',
        body: (
            <p>
                Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke
                waktu. Perubahan akan tercermin pada tanggal "Terakhir
                diperbarui" di bawah halaman ini.
            </p>
        ),
    },
];

export default function PrivacyPolicy() {
    return (
        <>
            <Head title="Kebijakan Privasi — HunianID" />
            <div className="min-h-screen bg-(--color-bg) font-sans text-(--color-ink) antialiased">
                <SiteHeader />

                <main className="mx-auto max-w-3xl px-5 py-12">
                    <h1 className="font-display text-3xl font-bold">
                        Kebijakan Privasi
                    </h1>
                    <p className="mt-2 text-sm text-(--color-ink)/55">
                        Terakhir diperbarui: 17 November 2026
                    </p>

                    <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-(--color-ink)/80">
                        {SECTIONS.map((section) => (
                            <section key={section.title}>
                                <h2 className="mb-3 font-display text-lg font-semibold text-(--color-ink)">
                                    {section.title}
                                </h2>
                                {section.body}
                            </section>
                        ))}
                    </div>
                </main>

                <footer className="border-t border-(--color-ink)/8">
                    <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
                        <HunianLogo className="h-6 w-auto" />
                        <p className="text-sm text-(--color-ink)/55">
                            Pertanyaan tentang privasi Anda?{' '}
                            <a
                                href="mailto:halo@hunianid.com"
                                className="underline"
                            >
                                halo@hunianid.com
                            </a>
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}
