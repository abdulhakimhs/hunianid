import { Head } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    Search,
    Users,
    X,
} from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

type UnitStatus = 'occupied' | 'available' | 'pending';

type Unit = {
    id: number;
    name: string;
    block: string;
    owner: string;
    status: UnitStatus;
    lat: number;
    lng: number;
    note: string;
};

const units: Unit[] = [
    {
        id: 1,
        name: 'A-12',
        block: 'Blok A',
        owner: 'Budi Santoso',
        status: 'occupied',
        lat: -6.1349,
        lng: 106.7548,
        note: 'Sudah terdaftar, tagihan bulan ini belum lunas.',
    },
    {
        id: 2,
        name: 'B-04',
        block: 'Blok B',
        owner: 'Tina Wijaya',
        status: 'available',
        lat: -6.1354,
        lng: 106.7562,
        note: 'Rumah kosong, siap dihubungi pemilik baru.',
    },
    {
        id: 3,
        name: 'C-09',
        block: 'Blok C',
        owner: 'Rizky Ardi',
        status: 'pending',
        lat: -6.1345,
        lng: 106.7554,
        note: 'Ada permintaan perubahan data pemilik.',
    },
    {
        id: 4,
        name: 'D-02',
        block: 'Blok D',
        owner: 'Maya Putri',
        status: 'occupied',
        lat: -6.1358,
        lng: 106.7543,
        note: 'Pemilik aktif, sering memakai fitur visitor pass.',
    },
    {
        id: 5,
        name: 'E-07',
        block: 'Blok E',
        owner: 'Dewi Lestari',
        status: 'available',
        lat: -6.1342,
        lng: 106.7567,
        note: 'Unit kosong, bisa dipantau untuk onboarding baru.',
    },
];

const filters: Array<{ label: string; value: 'all' | UnitStatus }> = [
    { label: 'Semua', value: 'all' },
    { label: 'Terisi', value: 'occupied' },
    { label: 'Kosong', value: 'available' },
    { label: 'Butuh tindak lanjut', value: 'pending' },
];

const statusStyles: Record<UnitStatus, string> = {
    occupied: 'border-[color:var(--color-mint)]/25 bg-[color:var(--color-mint)]/12 text-[color:var(--color-mint-deep)]',
    available: 'border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/12 text-[color:var(--color-sky-deep)]',
    pending: 'border-[color:var(--color-coral)]/25 bg-[color:var(--color-coral)]/12 text-[color:var(--color-coral)]',
};

const markerIcon = (status: UnitStatus) => {
    const color =
        status === 'occupied'
            ? '#14a869'
            : status === 'available'
              ? '#1aa3c9'
              : '#ff6b57';

    return new L.DivIcon({
        className: 'custom-pin',
        html: `<div style="background:${color};width:16px;height:16px;border-radius:999px;border:2px solid white;box-shadow:0 4px 10px rgba(20,32,51,0.2)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
};

export default function UnitsMapPage() {
    const [selectedStatus, setSelectedStatus] = useState<'all' | UnitStatus>('all');
    const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    const filteredUnits = useMemo(() => {
        if (selectedStatus === 'all') {
            return units;
        }

        return units.filter((unit) => unit.status === selectedStatus);
    }, [selectedStatus]);

    const selectedUnit = selectedUnitId === null ? null : units.find((unit) => unit.id === selectedUnitId) ?? null;

    return (
        <>
            <Head title="Peta Unit / Rumah" />
            <div className="relative mx-1 my-1 flex h-[calc(100vh-5rem)] flex-1 overflow-hidden rounded border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] shadow-elevated">
                <div className="absolute left-4 top-4 z-[1000] flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--color-ink)]/10 bg-[color:var(--color-surface)]/90 px-3 py-2 shadow-lg backdrop-blur">
                    <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] px-2.5 py-1.5 text-sm text-[color:var(--color-ink)]/70">
                        <Search className="h-4 w-4" />
                        <span>Perumahan Taman Grisenda</span>
                    </div>
                    {filters.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => setSelectedStatus(filter.value)}
                            className={`rounded-full border px-2.5 py-1.5 text-sm font-medium transition ${selectedStatus === filter.value ? 'border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/12 text-[color:var(--color-sky-deep)]' : 'border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] text-[color:var(--color-ink)]/70'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                <div className="absolute inset-0 overflow-hidden rounded">
                    <MapContainer
                        center={[-6.1351, 106.7559]}
                        zoom={17}
                        scrollWheelZoom
                        className="h-full w-full"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {filteredUnits.map((unit) => (
                            <Marker
                                key={unit.id}
                                position={[unit.lat, unit.lng]}
                                icon={markerIcon(unit.status)}
                                eventHandlers={{ click: () => setSelectedUnitId(unit.id) }}
                            >
                                <Popup>
                                    <div className="min-w-[180px]">
                                        <p className="font-semibold text-[color:var(--color-ink)]">{unit.name}</p>
                                        <p className="mt-1 text-sm text-[color:var(--color-ink)]/70">{unit.block}</p>
                                        <p className="mt-2 text-sm text-[color:var(--color-ink)]/70">{unit.owner}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <div
                    className={`absolute inset-y-0 right-0 z-[1100] flex w-full max-w-[22rem] justify-end p-3 transition-all duration-300 sm:p-4 ${selectedUnit ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'}`}
                >
                    <div
                        className="pointer-events-auto flex h-full w-full cursor-default flex-col rounded-[1.5rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] p-4 shadow-[0_24px_80px_rgba(20,32,51,0.22)] sm:p-5"
                        onMouseDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        {selectedUnit ? (
                            <>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-sky-deep)]">
                                            Unit terpilih
                                        </p>
                                        <h2 className="mt-2 font-display text-xl font-semibold text-[color:var(--color-ink)]">
                                            {selectedUnit.name}
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Close selected unit"
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onTouchStart={(event) => event.stopPropagation()}
                                        // onClickCapture={(event) => event.stopPropagation()}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setSelectedUnitId(null);
                                        }}
                                        className="rounded-full border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)] p-2 text-[color:var(--color-ink)]/70"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className={`mt-4 inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[selectedUnit.status]}`}>
                                    {selectedUnit.status === 'occupied' ? 'Terisi' : selectedUnit.status === 'available' ? 'Kosong' : 'Perlu tindak lanjut'}
                                </div>

                                {selectedAction ? (
                                    <div className="mt-4 rounded-[1.25rem] border border-[color:var(--color-sky)]/20 bg-[color:var(--color-sky)]/10 p-3 text-sm text-[color:var(--color-sky-deep)]">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">Aksi dipilih</p>
                                        <p className="mt-1 font-medium">{selectedAction}</p>
                                    </div>
                                ) : null}

                                <div className="mt-5 space-y-3 rounded-[1.25rem] border border-[color:var(--color-ink)]/8 bg-[color:var(--color-bg)]/70 p-4 text-sm text-[color:var(--color-ink)]/70">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                                        <span>{selectedUnit.block}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-[color:var(--color-mint-deep)]" />
                                        <span>{selectedUnit.owner}</span>
                                    </div>
                                    <p className="leading-relaxed">{selectedUnit.note}</p>
                                </div>

                                <div className="mt-5 grid gap-2">
                                    {[
                                        'Lihat detail rumah',
                                        'Buat tagihan',
                                        'Buat tiket / komplain',
                                        'Undang pemilik',
                                    ].map((action) => (
                                        <button
                                            key={action}
                                            type="button"
                                            onMouseDown={(event) => event.stopPropagation()}
                                            onPointerDown={(event) => event.stopPropagation()}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                setSelectedAction(action);
                                            }}
                                            className="flex items-center justify-between rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-surface)] px-3 py-3 text-left text-sm font-medium text-[color:var(--color-ink)]/75"
                                        >
                                            <span>{action}</span>
                                            <ArrowUpRight className="h-4 w-4 text-[color:var(--color-sky-deep)]" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center text-center text-sm text-[color:var(--color-ink)]/60">
                                Klik salah satu pin untuk melihat detail unit.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
