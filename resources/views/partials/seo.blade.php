{{-- resources/views/partials/seo.blade.php --}}
{{-- Include inside

<head> in app.blade.php: @include('partials.seo') --}}
    @php
    $isLanding = request()->is('/');
    $description = 'Aplikasi manajemen perumahan untuk RT dan pengelola: '
    .'tagihan IPL, tamu QR, komplain, dan tombol darurat. '
    .'Coba gratis 30 hari, tanpa kartu kredit.';
    $title = config('app.name'). ' - Kelola Perumahan Tanpa Ribet Catat Manual';
    $image = asset('og-image.png');
    $jsonLd = json_encode([
    '@'.'context' => 'https://schema.org',
    '@type' => 'SoftwareApplication',
    'name' => config('app.name'),
    'applicationCategory' => 'BusinessApplication',
    'operatingSystem' => 'Web',
    'inLanguage' => 'id',
    'url' => url('/'),
    'description' => $description,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    @endphp

    @if ($isLanding)
    <meta name="description" content="{{ $description }}">
    <link rel="canonical" href="{{ url('/') }}">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="{{ config('app.name') }}">
    <meta property="og:locale" content="id_ID">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta property="og:url" content="{{ url('/') }}">
    <meta property="og:image" content="{{ $image }}">
    <meta property="og:image:width" content="1352">
    <meta property="og:image:height" content="710">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $title }}">
    <meta name="twitter:description" content="{{ $description }}">
    <meta name="twitter:image" content="{{ $image }}">

    <script type="application/ld+json">
        {!! $jsonLd !!}
    </script>

    @else
    {{-- Login, dashboards, guest passes: keep out of search results. --}}
    <meta name="robots" content="noindex, nofollow">
    @endif