<?php

namespace App\Services;

use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class QrCodeService
{
    public function svg(string $data, int $size = 240): string
    {
        $renderer = new ImageRenderer(new RendererStyle($size), new SvgImageBackEnd());

        return (new Writer($renderer))->writeString($data);
    }
}
