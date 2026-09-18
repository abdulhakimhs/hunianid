<?php

namespace App\Support;

class PhoneNumber
{
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? $phone;

        return str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;
    }

    public static function lookupVariants(string $phone): array
    {
        $normalized = self::normalize($phone);
        $local = str_starts_with($normalized, '62') ? '0'.substr($normalized, 2) : $normalized;

        return array_unique([$normalized, $local]);
    }
}
