import { MapPin, Navigation } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/google-maps';

type Props = {
    center: { lat: number; lng: number };
    value: { lat: number; lng: number } | null;
    onChange: (position: { lat: number; lng: number }) => void;
};

function toLatLngLiteral(
    pos: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | google.maps.LatLngAltitudeLiteral,
): { lat: number; lng: number } {
    return {
        lat: typeof pos.lat === 'function' ? pos.lat() : pos.lat,
        lng: typeof pos.lng === 'function' ? pos.lng() : pos.lng,
    };
}

/**
 * Small pin-picker embedded in the unit create/edit dialog — lets an admin mark
 * exactly where a house sits (click or drag), feeding the units map's real
 * coordinates. Mirrors `MapConfirm` in auth/register.tsx but adds click-to-place
 * since here we're starting from the complex's center, not an already-geocoded point.
 */
export function UnitPinPicker({ center, value, onChange }: Props) {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const [ready, setReady] = useState(false);
    const [adjusted, setAdjusted] = useState(value !== null);

    useEffect(() => {
        let cancelled = false;

        loadGoogleMaps().then((google) => {
            if (cancelled || !mapDivRef.current) {
                return;
            }

            const startPosition = value ?? center;

            const map = new google.maps.Map(mapDivRef.current, {
                center: startPosition,
                zoom: 18,
                mapId: 'DEMO_MAP_ID',
                disableDefaultUI: true,
                zoomControl: true,
                clickableIcons: false,
            });

            mapRef.current = map;

            const pin = document.createElement('div');
            pin.innerHTML =
                '<svg width="28" height="28" viewBox="0 0 24 24" fill="#1FCB82" stroke="white" stroke-width="1.5"><path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 6.6 11.4 7.3 12a1 1 0 0 0 1.4 0c.7-.6 7.3-6.6 7.3-12 0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>';

            const marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: startPosition,
                content: pin,
                gmpDraggable: true,
            });

            markerRef.current = marker;

            marker.addListener('dragend', () => {
                const pos = marker.position;

                if (!pos) {
                    return;
                }

                const position = toLatLngLiteral(pos);
                setAdjusted(true);
                onChange(position);
            });

            map.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (!e.latLng) {
                    return;
                }

                const position = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                marker.position = position;
                setAdjusted(true);
                onChange(position);
            });

            setReady(true);
        });

        return () => {
            cancelled = true;

            if (markerRef.current) {
                markerRef.current.map = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="grid gap-2">
            <label className="text-sm font-medium text-(--color-ink)">
                Lokasi di Peta
            </label>

            <div
                ref={mapDivRef}
                className="h-48 w-full overflow-hidden rounded-xl border border-(--color-ink)/10 bg-(--color-bg)"
            />

            <div className="flex items-start gap-2 rounded-xl border border-(--color-sky)/25 bg-(--color-sky)/10 px-3 py-2 text-xs text-(--color-sky-deep)">
                {adjusted ? (
                    <>
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Titik rumah sudah ditandai.</span>
                    </>
                ) : (
                    <>
                        <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                            Klik atau geser pin untuk menandai lokasi rumah ini
                            (opsional, bisa diisi nanti).
                        </span>
                    </>
                )}
            </div>

            {!ready && (
                <p className="text-xs text-(--color-ink)/40">Memuat peta…</p>
            )}
        </div>
    );
}
