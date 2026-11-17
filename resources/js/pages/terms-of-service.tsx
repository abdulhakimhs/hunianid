import { Head, Link } from '@inertiajs/react';
import HunianLogo from '@/components/hunian-logo';
import { home } from '@/routes';

const SECTIONS: { title: string; body: React.ReactNode }[] = [
    {
        title: '1. Tentang Layanan',
        body: (
            <p>
                HunianID adalah platform pengelolaan perumahan yang membantu
                pengelola (RT/RW/pengembang) dan penghuni mengurus keanggotaan
                area, unit hunian, tagihan/iuran, visitor pass, laporan/tiket,
                dan notifikasi darurat — sebagian besar lewat WhatsApp dan
                aplikasi web. Dengan mendaftar atau menggunakan Layanan, Anda
                menyetujui Ketentuan Layanan ini.
            </p>
        ),
    },
    {
        title: '2. Pendaftaran &amp; Akun',
        body: (
            <ul className="list-disc space-y-2 pl-5">
                <li>
                    Anda harus memberikan data yang benar saat mendaftar
                    (nama, kontak, dan data hunian).
                </li>
                <li>
                    Anda bertanggung jawab menjaga kerahasiaan kata sandi dan
                    akses akun Anda.
                </li>
                <li>
                    Peran Anda (penghuni, pengelola/admin area, atau petugas
                    keamanan) menentukan fitur yang bisa Anda akses.
                    Keanggotaan di suatu area dapat memerlukan persetujuan
                    pengelola area tersebut, atau persetujuan penghuni lain di
                    unit yang sama saat Anda bergabung ke unit itu.
                </li>
            </ul>
        ),
    },
    {
        title: '3. Penggunaan yang Wajar',
        body: (
            <>
                <p>Anda setuju untuk tidak:</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>
                        Membuat visitor pass palsu atau menyalahgunakannya
                        untuk mengakses perumahan tanpa izin yang sah.
                    </li>
                    <li>
                        Menyalahgunakan tombol darurat (panic button) untuk
                        hal yang bukan keadaan darurat sungguhan.
                    </li>
                    <li>
                        Mengirim data atau pesan yang menyesatkan, melanggar
                        hukum, atau merugikan pengguna lain lewat chat
                        WhatsApp maupun aplikasi.
                    </li>
                    <li>
                        Mencoba mengakses data area atau unit yang bukan milik
                        Anda tanpa izin yang sah.
                    </li>
                </ul>
            </>
        ),
    },
    {
        title: '4. Pembayaran &amp; Tagihan',
        body: (
            <p>
                Tagihan/iuran perumahan dan biaya subscription Layanan
                diproses melalui mitra pembayaran pihak ketiga (Midtrans).
                Pengelola area bertanggung jawab atas keakuratan tagihan yang
                diterbitkan kepada penghuninya. Kebijakan pengembalian dana
                mengikuti kebijakan mitra pembayaran dan kesepakatan antara
                pengelola area dan penghuni, kecuali ditentukan lain secara
                tertulis.
            </p>
        ),
    },
    {
        title: '5. Konten Pengguna',
        body: (
            <p>
                Data yang Anda masukkan (termasuk data tamu, isi laporan/
                tiket, dan pesan WhatsApp) tetap menjadi milik Anda atau area
                tempat Anda terdaftar. Kami menggunakan data tersebut hanya
                untuk menjalankan fitur Layanan, sebagaimana dijelaskan pada
                Kebijakan Privasi.
            </p>
        ),
    },
    {
        title: '6. Batasan Tanggung Jawab',
        body: (
            <p>
                Layanan disediakan "sebagaimana adanya". Kami berupaya
                menjaga Layanan berjalan andal, namun tidak menjamin Layanan
                akan selalu bebas gangguan, termasuk gangguan pada pihak
                ketiga seperti penyedia WhatsApp, pembayaran, atau layanan AI.
                HunianID tidak bertanggung jawab atas kerugian yang timbul
                dari penyalahgunaan akun, kesalahan input data oleh pengguna,
                atau keadaan darurat yang penanganannya di luar kendali
                Layanan.
            </p>
        ),
    },
    {
        title: '7. Penghentian Akun',
        body: (
            <p>
                Kami dapat menangguhkan atau menghentikan akses akun yang
                melanggar Ketentuan Layanan ini. Anda juga dapat meminta
                penghapusan akun Anda kapan saja dengan menghubungi{' '}
                <a
                    href="mailto:halo@hunianid.com"
                    className="underline"
                >
                    halo@hunianid.com
                </a>
                .
            </p>
        ),
    },
    {
        title: '8. Hukum yang Berlaku',
        body: (
            <p>
                Ketentuan Layanan ini diatur dan ditafsirkan berdasarkan hukum
                Republik Indonesia. Setiap perselisihan yang timbul akan
                diselesaikan secara musyawarah terlebih dahulu sebelum
                menempuh jalur hukum.
            </p>
        ),
    },
    {
        title: '9. Perubahan Ketentuan',
        body: (
            <p>
                Kami dapat memperbarui Ketentuan Layanan ini dari waktu ke
                waktu. Perubahan akan tercermin pada tanggal "Terakhir
                diperbarui" di bawah halaman ini. Penggunaan Layanan setelah
                perubahan berarti Anda menyetujui ketentuan yang baru.
            </p>
        ),
    },
];

export default function TermsOfService() {
    return (
        <>
            <Head title="Ketentuan Layanan — HunianID" />
            <div className="min-h-screen bg-(--color-bg) font-sans text-(--color-ink) antialiased">
                <header className="border-b border-(--color-ink)/8">
                    <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
                        <Link href={home()}>
                            <HunianLogo className="h-7 w-auto" />
                        </Link>
                        <Link
                            href={home()}
                            className="text-sm font-medium text-(--color-ink)/70 underline hover:text-(--color-ink)"
                        >
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-3xl px-5 py-12">
                    <h1 className="font-display text-3xl font-bold">
                        Ketentuan Layanan
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
                            Pertanyaan tentang ketentuan ini?{' '}
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
