import { Head } from '@inertiajs/react';
import { Building2, Check, CheckCircle2, Home, Loader2, MapPin, Navigation, Search, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { GoogleIcon } from '@/components/google-icon';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ApiValidationError, postJson } from '@/lib/api';
import { loadGoogleMaps } from '@/lib/google-maps';
import { login } from '@/routes';

type Role = 'penghuni' | 'pengelola';
type SubType = 'rt_rw' | 'developer';
type Area = { id: number; name: string };
type Region = { code: string; name: string };
type StepKey = 'akun' | 'peran' | 'lokasi' | 'unit';

type LocationState = {
    mode: 'google' | 'manual';
    place_id?: string;
    location_name: string;
    formatted_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    province_code?: string;
    city_code?: string;
    address?: string;
    active_areas: Area[];
    active_areas_count: number;
};

type GooglePrefill = { name: string; email: string };
type QuickPhonePrefill = { phone: string };
type Props = {
    passwordRules: string;
    googlePrefill?: GooglePrefill | null;
    quickPhonePrefill?: QuickPhonePrefill | null;
};

const STEP_LABEL: Record<StepKey, string> = { akun: 'Akun', peran: 'Peran', lokasi: 'Lokasi', unit: 'Unit' };

// Wizard state lives only in React state until the final submit (no half-created
// accounts); mirrored into sessionStorage so a stray reload doesn't wipe progress.
// Password fields are excluded on purpose — never park plaintext credentials in storage.
const STORAGE_KEY = 'hunianid_register_wizard';

type Persisted = {
    step: number;
    role: Role | null;
    subType: SubType | null;
    location: LocationState | null;
    areaName: string;
    name: string;
    email: string;
    phone: string;
    areaId: string;
    unitNumber: string;
    block: string;
};

function loadPersisted(): Partial<Persisted> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);

        return raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
    } catch {
        return {};
    }
}

function clearPersisted() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

export default function Register({ passwordRules, googlePrefill, quickPhonePrefill }: Props) {
    // Google sign-up still asks for phone (Google doesn't provide it) and hides the
    // password fields. Phone-quick sign-up (triggered from an unregistered OTP login
    // attempt) skips Akun entirely — name/email/password are collected later, on the
    // dashboard's "complete profile" nudge.
    const mode: 'normal' | 'google' | 'phone_quick' = googlePrefill ? 'google' : quickPhonePrefill ? 'phone_quick' : 'normal';

    // A prefill means this visit was triggered by an explicit external action (a Google
    // sign-in or a phone login attempt) — any leftover progress from an earlier,
    // unrelated wizard session shouldn't be mixed in (and would otherwise silently win
    // over the prefill, since an empty persisted string isn't `null`/`undefined`).
    const [initial] = useState(() => (googlePrefill || quickPhonePrefill ? {} : loadPersisted()));

    const [step, setStep] = useState(initial.step ?? 1);

    const [role, setRole] = useState<Role | null>(initial.role ?? null);
    const [subType, setSubType] = useState<SubType | null>(initial.subType ?? null);
    const [location, setLocation] = useState<LocationState | null>(initial.location ?? null);
    const [areaName, setAreaName] = useState(initial.areaName ?? '');

    const [name, setName] = useState(initial.name ?? googlePrefill?.name ?? '');
    const [email, setEmail] = useState(initial.email ?? googlePrefill?.email ?? '');
    const [phone, setPhone] = useState(initial.phone ?? quickPhonePrefill?.phone ?? '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const [areaId, setAreaId] = useState(initial.areaId ?? '');
    const [unitNumber, setUnitNumber] = useState(initial.unitNumber ?? '');
    const [block, setBlock] = useState(initial.block ?? '');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, role, subType, location, areaName, name, email, phone, areaId, unitNumber, block }));
        } catch {
            // ignore — persistence is a nice-to-have, not a requirement
        }
    }, [step, role, subType, location, areaName, name, email, phone, areaId, unitNumber, block]);

    const needsUnitStep = role === 'penghuni' && (location?.active_areas_count ?? 0) > 0;
    const activeSteps: StepKey[] = [
        ...(mode === 'phone_quick' ? [] : (['akun'] as StepKey[])),
        'peran',
        'lokasi',
        ...(needsUnitStep ? (['unit'] as StepKey[]) : []),
    ];
    const currentStepKey = activeSteps[step - 1];
    const totalSteps = activeSteps.length;

    function goToStep(key: StepKey) {
        const index = activeSteps.indexOf(key);

        if (index >= 0) {
            setStep(index + 1);
        }
    }

    function submitAll(extra: Record<string, string | undefined> = {}) {
        if (!role || !location) {
            return;
        }

        setSubmitting(true);
        setErrors({});
        setFormError(null);

        // Plain fetch, not Inertia's router — a failed submission should never look
        // like a page navigation.
        postJson<{ redirect: string }>('/register/complete', {
            role,
            sub_type: role === 'pengelola' ? (subType ?? undefined) : undefined,
            area_name: role === 'pengelola' ? areaName : undefined,
            location_mode: location.mode,
            place_id: location.place_id,
            location_name: location.location_name,
            formatted_address: location.formatted_address ?? undefined,
            latitude: location.latitude ?? undefined,
            longitude: location.longitude ?? undefined,
            province_code: location.province_code,
            city_code: location.city_code,
            address: location.address,
            name: mode === 'phone_quick' ? undefined : name,
            email: mode === 'phone_quick' ? undefined : email,
            password: mode === 'normal' ? password : undefined,
            password_confirmation: mode === 'normal' ? passwordConfirmation : undefined,
            phone: phone || undefined,
            auth_provider: mode === 'normal' ? undefined : mode,
            ...extra,
        }, { showOverlay: false })
            .then((data) => {
                clearPersisted();
                // Hard redirect, not router.visit() — the account-creation call went
                // through plain fetch, outside Inertia's router, so its client-side
                // state never tracked this page.
                window.location.href = data.redirect;
            })
            .catch((error: unknown) => {
                if (error instanceof ApiValidationError) {
                    // A validation error can send the wizard back to an earlier step
                    // than the user was on — surface a banner so that jump doesn't look
                    // like a silent reset.
                    setErrors(error.errors);
                    goToStep(earliestErroredStep(error.errors, activeSteps));
                    setFormError('Ada bagian yang perlu diperiksa kembali — silakan lengkapi ulang sesuai catatan di bawah.');
                } else {
                    setFormError('Terjadi kesalahan. Silakan coba lagi.');
                }

                setSubmitting(false);
            });
    }

    function handleAccountContinue() {
        const next: Record<string, string> = {};

        if (!name) {
            next.name = 'Nama wajib diisi.';
        }

        if (!email) {
            next.email = 'Email wajib diisi.';
        }

        if (!phone) {
            next.phone = 'No. HP wajib diisi.';
        }

        if (mode === 'normal') {
            if (!password) {
                next.password = 'Kata sandi wajib diisi.';
            } else if (password !== passwordConfirmation) {
                next.password_confirmation = 'Konfirmasi kata sandi tidak sama.';
            }
        }

        if (Object.keys(next).length > 0) {
            setErrors(next);

            return;
        }

        setErrors({});
        goToStep('peran');
    }

    function handleUnitSubmit() {
        const next: Record<string, string> = {};

        if ((location?.active_areas_count ?? 0) > 1 && !areaId) {
            next.area_id = 'Pilih RT/pengelola Anda.';
        }

        if (!unitNumber) {
            next.unit_number = 'Nomor rumah/unit wajib diisi.';
        }

        if (Object.keys(next).length > 0) {
            setErrors(next);

            return;
        }

        setErrors({});
        submitAll({
            area_id: areaId || (location?.active_areas[0] ? String(location.active_areas[0].id) : undefined),
            unit_number: unitNumber,
            block: block || undefined,
        });
    }

    return (
        <>
            <Head title="Daftar" />
            <div className="flex flex-col gap-6">
                <WizardSteps steps={activeSteps} step={step} onStepClick={(n) => n < step && setStep(n)} />

                {mode === 'phone_quick' && currentStepKey === 'peran' && (
                    <p className="rounded-xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-3 py-2 text-sm text-[color:var(--color-sky-deep)]">
                        No. HP <span className="font-semibold">{quickPhonePrefill?.phone}</span> belum terdaftar. Yuk lanjutkan dengan proses pendaftaran dulu — kamu berperan sebagai apa?
                    </p>
                )}

                {formError && (
                    <p className="rounded-xl border border-[color:var(--color-coral)]/25 bg-[color:var(--color-coral)]/10 px-3 py-2 text-sm text-[color:var(--color-coral)]">
                        {formError}
                    </p>
                )}

                {currentStepKey === 'akun' && (
                    <AccountStep
                        passwordRules={passwordRules}
                        mode={mode}
                        name={name}
                        email={email}
                        phone={phone}
                        password={password}
                        passwordConfirmation={passwordConfirmation}
                        errors={errors}
                        onChange={{ name: setName, email: setEmail, phone: setPhone, password: setPassword, passwordConfirmation: setPasswordConfirmation }}
                        onContinue={handleAccountContinue}
                    />
                )}

                {currentStepKey === 'peran' && (
                    <RoleStep
                        role={role}
                        subType={subType}
                        errors={errors}
                        onSelectRole={(r) => {
                            setRole(r);
                            setSubType(null);
                        }}
                        onSelectSubType={setSubType}
                        onContinue={() => goToStep('lokasi')}
                    />
                )}

                {currentStepKey === 'lokasi' && role && (
                    <LocationStep
                        role={role}
                        location={location}
                        onResolved={setLocation}
                        areaName={areaName}
                        onAreaNameChange={setAreaName}
                        areaNameError={errors.area_name}
                        onContinue={() => {
                            if (role === 'pengelola' && !areaName.trim()) {
                                setErrors({ area_name: 'Nama RT/RW wajib diisi.' });

                                return;
                            }

                            setErrors({});

                            if (needsUnitStep) {
                                goToStep('unit');
                            } else {
                                submitAll();
                            }
                        }}
                        submitting={submitting && !needsUnitStep}
                        isFinalStep={!needsUnitStep}
                    />
                )}

                {currentStepKey === 'unit' && location && (
                    <UnitStep
                        areas={location.active_areas}
                        areaId={areaId}
                        unitNumber={unitNumber}
                        block={block}
                        errors={errors}
                        submitting={submitting}
                        onChange={{ areaId: setAreaId, unitNumber: setUnitNumber, block: setBlock }}
                        onSubmit={handleUnitSubmit}
                    />
                )}
            </div>
        </>
    );
}

function earliestErroredStep(errors: Record<string, string>, activeSteps: StepKey[]): StepKey {
    const stepOfField: Record<string, StepKey> = {
        name: 'akun',
        email: 'akun',
        password: 'akun',
        password_confirmation: 'akun',
        phone: 'akun',
        role: 'peran',
        sub_type: 'peran',
        location_mode: 'lokasi',
        place_id: 'lokasi',
        location_name: 'lokasi',
        province_code: 'lokasi',
        city_code: 'lokasi',
        address: 'lokasi',
        area_name: 'lokasi',
        area_id: 'unit',
        unit_number: 'unit',
        block: 'unit',
    };

    const indices = Object.keys(errors)
        .map((field) => activeSteps.indexOf(stepOfField[field] ?? 'peran'))
        .filter((i) => i >= 0);

    const earliest = indices.length > 0 ? Math.min(...indices) : 0;

    return activeSteps[earliest];
}

function WizardSteps({ steps, step, onStepClick }: { steps: StepKey[]; step: number; onStepClick: (n: number) => void }) {
    const total = steps.length;

    return (
        <div className="flex w-full items-start">
            {steps.map((key, i) => {
                const n = i + 1;
                const clickable = n < step;

                return (
                    <div key={key} className="flex flex-1 items-center last:flex-none">
                        <button
                            type="button"
                            disabled={!clickable}
                            onClick={() => onStepClick(n)}
                            className={`flex flex-col items-center gap-1.5 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                    n < step
                                        ? `bg-[color:var(--color-mint)] text-white ${clickable ? 'hover:bg-[color:var(--color-mint-deep)]' : ''}`
                                        : n === step
                                          ? 'bg-[color:var(--color-sky-deep)] text-white shadow-[0_0_0_4px_rgba(26,163,201,0.15)]'
                                          : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink)]/35'
                                }`}
                            >
                                {n < step ? <Check className="h-4 w-4" /> : n}
                            </div>
                            <span
                                className={`text-[11px] font-medium whitespace-nowrap ${
                                    n === step ? 'text-[color:var(--color-ink)]' : clickable ? 'text-[color:var(--color-ink)]/60' : 'text-[color:var(--color-ink)]/40'
                                }`}
                            >
                                {STEP_LABEL[key]}
                            </span>
                        </button>
                        {n < total && (
                            <div className={`mx-1.5 mb-4.5 h-0.5 flex-1 rounded-full transition-colors ${n < step ? 'bg-[color:var(--color-mint)]' : 'bg-[color:var(--color-ink)]/10'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const ROLE_OPTIONS: Array<{ value: Role; icon: typeof Home; title: string; desc: string }> = [
    { value: 'penghuni', icon: Home, title: 'Saya Penghuni', desc: 'Tinggal di sebuah rumah dan ingin bergabung dengan perumahan saya.' },
    { value: 'pengelola', icon: Building2, title: 'Saya Pengurus (RT/Pengelola)', desc: 'Mengelola RT atau properti dan ingin mendaftarkannya.' },
];

const SUB_TYPE_OPTIONS: Array<{ value: SubType; label: string }> = [
    { value: 'rt_rw', label: 'RT/RW' },
    { value: 'developer', label: 'Developer' },
];

function RoleStep({
    role,
    subType,
    errors,
    onSelectRole,
    onSelectSubType,
    onContinue,
}: {
    role: Role | null;
    subType: SubType | null;
    errors: Record<string, string>;
    onSelectRole: (r: Role) => void;
    onSelectSubType: (s: SubType) => void;
    onContinue: () => void;
}) {
    const canContinue = role === 'penghuni' || (role === 'pengelola' && subType !== null);

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Pilih peran Anda</h1>
                <p className="text-sm text-[color:var(--color-ink)]/55">Peran menentukan langkah pendaftaran berikutnya</p>
            </div>

            <div className="flex flex-col gap-2">
                {ROLE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelectRole(option.value)}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                            role === option.value ? 'border-[color:var(--color-sky-deep)] bg-[color:var(--color-sky)]/8' : 'border-[color:var(--color-ink)]/10 hover:bg-[color:var(--color-bg)]'
                        }`}
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-ink)]/5 text-[color:var(--color-ink)]/70">
                            <option.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-[color:var(--color-ink)]">{option.title}</span>
                            <span className="block text-xs text-[color:var(--color-ink)]/55">{option.desc}</span>
                        </span>
                        <span
                            className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                                role === option.value ? 'border-[color:var(--color-sky-deep)] bg-[color:var(--color-sky-deep)]' : 'border-[color:var(--color-ink)]/20'
                            }`}
                        />
                    </button>
                ))}
            </div>

            <InputError message={errors.role} />

            {role === 'pengelola' && (
                <div className="flex flex-col gap-2 duration-150 animate-in fade-in">
                    <span className="text-xs font-medium text-[color:var(--color-ink)]/50">Jenis pengelola</span>
                    <div className="flex gap-2">
                        {SUB_TYPE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onSelectSubType(option.value)}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                    subType === option.value
                                        ? 'border-[color:var(--color-sky-deep)] bg-[color:var(--color-sky)]/8 text-[color:var(--color-sky-deep)]'
                                        : 'border-[color:var(--color-ink)]/10 text-[color:var(--color-ink)]/70 hover:bg-[color:var(--color-bg)]'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <InputError message={errors.sub_type} />
                    {subType === 'developer' && (
                        <p className="text-xs text-[color:var(--color-ink)]/50">
                            Dashboard multi-proyek akan segera hadir — untuk saat ini setiap proyek didaftarkan terpisah.
                        </p>
                    )}
                </div>
            )}

            <Button type="button" className="w-full" disabled={!canContinue} onClick={onContinue}>
                Lanjutkan
            </Button>
        </div>
    );
}

function LocationStep({
    role,
    location,
    onResolved,
    areaName,
    onAreaNameChange,
    areaNameError,
    onContinue,
    submitting,
    isFinalStep,
}: {
    role: Role;
    location: LocationState | null;
    onResolved: (l: LocationState) => void;
    areaName: string;
    onAreaNameChange: (v: string) => void;
    areaNameError?: string;
    onContinue: () => void;
    submitting: boolean;
    isFinalStep: boolean;
}) {
    const [showManual, setShowManual] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [mapsReady, setMapsReady] = useState(false);
    const [mapsError, setMapsError] = useState(false);
    const [candidate, setCandidate] = useState<LocationState | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const [provinces, setProvinces] = useState<Region[]>([]);
    const [cities, setCities] = useState<Region[]>([]);
    const [provinceCode, setProvinceCode] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualAddress, setManualAddress] = useState('');

    useEffect(() => {
        if (!showManual || provinces.length > 0) {
            return;
        }

        fetch('/register/regions/provinces')
            .then((r) => r.json())
            .then(setProvinces)
            .catch(() => setProvinces([]));
    }, [showManual, provinces.length]);

    useEffect(() => {
        if (!provinceCode) {
            return;
        }

        fetch(`/register/regions/cities?province_code=${provinceCode}`)
            .then((r) => r.json())
            .then(setCities)
            .catch(() => setCities([]));
    }, [provinceCode]);

    useEffect(() => {
        if (location) {
            return;
        }

        let cancelled = false;

        loadGoogleMaps()
            .then(() => {
                if (cancelled || !searchRef.current) {
                    return;
                }

                setMapsReady(true);

                const autocomplete = new google.maps.places.Autocomplete(searchRef.current, {
                    fields: ['place_id', 'name', 'formatted_address', 'geometry'],
                    types: ['establishment', 'geocode'],
                    componentRestrictions: { country: 'id' },
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();

                    if (!place?.place_id) {
                        return;
                    }

                    setPreviewing(true);

                    postJson<{ active_areas: Area[]; active_areas_count: number }>('/register/location/preview', {
                        place_id: place.place_id,
                    }, { showOverlay: false })
                        .then((preview) => {
                            // Don't resolve immediately — show it on a map first so the
                            // user can confirm (or drag the pin to correct it).
                            setCandidate({
                                mode: 'google',
                                place_id: place.place_id,
                                location_name: place.name ?? place.formatted_address ?? '',
                                formatted_address: place.formatted_address ?? null,
                                latitude: place.geometry?.location?.lat() ?? null,
                                longitude: place.geometry?.location?.lng() ?? null,
                                active_areas: preview.active_areas,
                                active_areas_count: preview.active_areas_count,
                            });
                        })
                        .finally(() => setPreviewing(false));
                });
            })
            .catch(() => setMapsError(true));

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    function submitManual() {
        if (!provinceCode || !cityCode || !manualName) {
            return;
        }

        onResolved({
            mode: 'manual',
            location_name: manualName,
            address: manualAddress,
            province_code: provinceCode,
            city_code: cityCode,
            active_areas: [],
            active_areas_count: 0,
        });
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Temukan perumahan Anda</h1>
                <p className="text-sm text-[color:var(--color-ink)]/55">Cari lewat Google Maps atau isi manual jika tidak ditemukan</p>
            </div>

            {!location && !candidate && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="location-search">Cari perumahan Anda</Label>
                        <div className="relative">
                            {mapsReady ? (
                                <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink)]/40" />
                            ) : (
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[color:var(--color-ink)]/40" />
                            )}
                            <Input
                                id="location-search"
                                ref={searchRef}
                                placeholder={mapsReady ? 'Ketik nama perumahan atau alamat...' : 'Memuat pencarian lokasi...'}
                                className="pl-9"
                                disabled={(!mapsReady && !mapsError) || previewing}
                                autoFocus
                            />
                            {(!mapsReady && !mapsError) || previewing ? (
                                <Loader2 className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--color-ink)]/30" />
                            ) : null}
                        </div>
                        {mapsError && (
                            <p className="text-sm text-[color:var(--color-coral)]">Pencarian peta sedang tidak tersedia. Silakan isi manual di bawah.</p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowManual((v) => !v)}
                        className="text-left text-sm font-medium text-[color:var(--color-sky-deep)] underline-offset-2 hover:underline"
                    >
                        Perumahan saya tidak muncul di sini
                    </button>

                    {showManual && (
                        <div className="grid gap-3 rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-bg)]/60 p-4 duration-150 animate-in fade-in">
                            <div className="grid gap-2">
                                <Label>Provinsi</Label>
                                <Select
                                    value={provinceCode}
                                    onValueChange={(v) => {
                                        setProvinceCode(v);
                                        setCityCode('');
                                        setCities([]);
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-[color:var(--color-surface)]">
                                        <SelectValue placeholder="Pilih provinsi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {provinces.map((p) => (
                                            <SelectItem key={p.code} value={p.code}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Kota/Kabupaten</Label>
                                <Select value={cityCode} onValueChange={setCityCode} disabled={!provinceCode}>
                                    <SelectTrigger className="w-full bg-[color:var(--color-surface)]">
                                        <SelectValue placeholder="Pilih kota/kabupaten" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cities.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="manual-name">Nama perumahan</Label>
                                <Input id="manual-name" className="bg-[color:var(--color-surface)]" value={manualName} onChange={(e) => setManualName(e.target.value)} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="manual-address">Alamat</Label>
                                <Input id="manual-address" className="bg-[color:var(--color-surface)]" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} />
                            </div>

                            <Button type="button" disabled={!provinceCode || !cityCode || !manualName} onClick={submitManual}>
                                Gunakan alamat ini
                            </Button>
                        </div>
                    )}
                </>
            )}

            {!location && candidate && (
                <MapConfirm
                    candidate={candidate}
                    onConfirm={(confirmed) => {
                        setCandidate(null);
                        onResolved(confirmed);
                    }}
                    onReject={() => setCandidate(null)}
                />
            )}

            {location && (
                <div className="flex flex-col gap-4 duration-150 animate-in fade-in">
                    <div className="rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-bg)] p-4">
                        <div className="flex items-start gap-2.5">
                            {location.active_areas_count > 0 ? (
                                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[color:var(--color-mint-deep)]" />
                            ) : (
                                <Sparkles className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[color:var(--color-sky-deep)]" />
                            )}
                            <div>
                                {location.active_areas_count > 0 ? (
                                    <p className="text-sm text-[color:var(--color-ink)]">
                                        Ditemukan: <span className="font-semibold">{location.location_name}</span> — sudah ada {location.active_areas_count} RT/pengelola
                                        terdaftar di sini.
                                    </p>
                                ) : role === 'penghuni' ? (
                                    <p className="text-sm text-[color:var(--color-ink)]">
                                        Anda akan jadi warga pertama yang terdaftar di <span className="font-semibold">{location.location_name}</span>! Nanti Anda bisa ajak
                                        RT/pengurus untuk bergabung.
                                    </p>
                                ) : (
                                    <p className="text-sm text-[color:var(--color-ink)]">
                                        <span className="font-semibold">{location.location_name}</span> siap didaftarkan.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {role === 'pengelola' && (
                        <div className="grid gap-2">
                            <Label htmlFor="area-name">Nama RT/RW Anda</Label>
                            <Input
                                id="area-name"
                                value={areaName}
                                onChange={(e) => onAreaNameChange(e.target.value)}
                                placeholder="Misal: RT 05, RW 10"
                                autoFocus
                            />
                            <InputError message={areaNameError} />
                        </div>
                    )}

                    <Button type="button" className="w-full" disabled={submitting || (role === 'pengelola' && !areaName.trim())} onClick={onContinue}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isFinalStep ? 'Buat akun' : 'Lanjutkan'}
                    </Button>

                    <button
                        type="button"
                        onClick={() => onResolved(null as unknown as LocationState)}
                        className="text-center text-sm text-[color:var(--color-ink)]/50 underline-offset-2 hover:underline"
                    >
                        Cari lokasi lain
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Shows the resolved location on a map before it's accepted — the marker is
 * draggable, so a slightly-off Google result can be nudged onto the right spot
 * instead of forcing another search.
 */
function MapConfirm({
    candidate,
    onConfirm,
    onReject,
}: {
    candidate: LocationState;
    onConfirm: (l: LocationState) => void;
    onReject: () => void;
}) {
    const mapDivRef = useRef<HTMLDivElement>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const [position, setPosition] = useState({ lat: candidate.latitude ?? 0, lng: candidate.longitude ?? 0 });
    const [adjusted, setAdjusted] = useState(false);

    useEffect(() => {
        if (!mapDivRef.current || candidate.latitude == null || candidate.longitude == null) {
            return;
        }

        const center = { lat: candidate.latitude, lng: candidate.longitude };

        const map = new google.maps.Map(mapDivRef.current, {
            center,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: true,
        });

        const marker = new google.maps.Marker({
            position: center,
            map,
            draggable: true,
        });

        markerRef.current = marker;

        marker.addListener('dragend', () => {
            const pos = marker.getPosition();

            if (!pos) {
                return;
            }

            setPosition({ lat: pos.lat(), lng: pos.lng() });
            setAdjusted(true);
        });

        return () => {
            google.maps.event.clearInstanceListeners(marker);
            marker.setMap(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidate.place_id]);

    return (
        <div className="flex flex-col gap-4 duration-150 animate-in fade-in">
            <div>
                <p className="text-sm font-medium text-[color:var(--color-ink)]">{candidate.location_name}</p>
                {candidate.formatted_address && <p className="text-xs text-[color:var(--color-ink)]/50">{candidate.formatted_address}</p>}
            </div>

            <div ref={mapDivRef} className="h-56 w-full overflow-hidden rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-bg)]" />

            <div className="flex items-start gap-2 rounded-xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-3 py-2 text-xs text-[color:var(--color-sky-deep)]">
                <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                    {adjusted
                        ? 'Titik lokasi sudah disesuaikan.'
                        : 'Geser pin di peta jika titik lokasinya kurang tepat.'}
                </span>
            </div>

            <p className="text-sm text-[color:var(--color-ink)]/70">Apakah ini lokasi perumahan Anda?</p>

            <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onReject}>
                    Cari lokasi lain
                </Button>
                <Button
                    type="button"
                    className="flex-1"
                    onClick={() => onConfirm({ ...candidate, latitude: position.lat, longitude: position.lng })}
                >
                    Ya, ini lokasinya
                </Button>
            </div>
        </div>
    );
}

function AccountStep({
    passwordRules,
    mode,
    name,
    email,
    phone,
    password,
    passwordConfirmation,
    errors,
    onChange,
    onContinue,
}: {
    passwordRules: string;
    mode: 'normal' | 'google' | 'phone_quick';
    name: string;
    email: string;
    phone: string;
    password: string;
    passwordConfirmation: string;
    errors: Record<string, string>;
    onChange: {
        name: (v: string) => void;
        email: (v: string) => void;
        phone: (v: string) => void;
        password: (v: string) => void;
        passwordConfirmation: (v: string) => void;
    };
    onContinue: () => void;
}) {
    const hidePassword = mode === 'google';

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Buat akun Anda</h1>
                <p className="text-sm text-[color:var(--color-ink)]/55">Lengkapi data berikut untuk memulai pendaftaran</p>
            </div>

            {hidePassword && (
                <p className="rounded-xl border border-[color:var(--color-sky)]/25 bg-[color:var(--color-sky)]/10 px-3 py-2 text-sm text-[color:var(--color-sky-deep)]">
                    Nama dan email sudah terisi dari akun Google Anda. Lengkapi no. HP untuk melanjutkan — Anda akan masuk dengan akun Google ini, tanpa kata sandi.
                </p>
            )}

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nama lengkap</Label>
                    <Input id="name" value={name} onChange={(e) => onChange.name(e.target.value)} autoFocus />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => onChange.email(e.target.value)} />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="phone">No. HP</Label>
                    <Input id="phone" type="tel" required value={phone} onChange={(e) => onChange.phone(e.target.value)} />
                    <InputError message={errors.phone} />
                </div>

                {!hidePassword && (
                    <>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Kata sandi</Label>
                            <PasswordInput
                                id="password"
                                value={password}
                                onChange={(e) => onChange.password(e.target.value)}
                                passwordrules={passwordRules}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">Konfirmasi kata sandi</Label>
                            <PasswordInput
                                id="password_confirmation"
                                value={passwordConfirmation}
                                onChange={(e) => onChange.passwordConfirmation(e.target.value)}
                                passwordrules={passwordRules}
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>
                    </>
                )}
            </div>

            <Button type="button" className="w-full" onClick={onContinue}>
                Lanjutkan
            </Button>

            {mode === 'normal' && (
                <>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[color:var(--color-ink)]/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[color:var(--color-surface)] px-2 text-[color:var(--color-ink)]/40">atau</span>
                        </div>
                    </div>

                    <a href="/auth/google/redirect" className="block">
                        <Button type="button" variant="outline" className="w-full">
                            <GoogleIcon />
                            Daftar dengan Google
                        </Button>
                    </a>
                </>
            )}

            <p className="text-center text-sm text-[color:var(--color-ink)]/55">
                Sudah punya akun? <TextLink href={login()}>Masuk</TextLink>
            </p>
        </div>
    );
}

function UnitStep({
    areas,
    areaId,
    unitNumber,
    block,
    errors,
    submitting,
    onChange,
    onSubmit,
}: {
    areas: Area[];
    areaId: string;
    unitNumber: string;
    block: string;
    errors: Record<string, string>;
    submitting: boolean;
    onChange: { areaId: (v: string) => void; unitNumber: (v: string) => void; block: (v: string) => void };
    onSubmit: () => void;
}) {
    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="font-display text-lg font-semibold text-[color:var(--color-ink)]">Satu langkah lagi</h1>
                <p className="text-sm text-[color:var(--color-ink)]/55">Masukkan rumah/unit Anda supaya kami bisa menghubungkannya dengan RT/pengelola yang tepat</p>
            </div>

            <div className="grid gap-4">
                {areas.length > 1 && (
                    <div className="grid gap-2">
                        <Label>Pilih RT/pengelola Anda</Label>
                        <Select value={areaId} onValueChange={onChange.areaId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Pilih RT/pengelola" />
                            </SelectTrigger>
                            <SelectContent>
                                {areas.map((a) => (
                                    <SelectItem key={a.id} value={String(a.id)}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.area_id} />
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="block">Blok (opsional)</Label>
                    <Input id="block" value={block} onChange={(e) => onChange.block(e.target.value)} placeholder="Blok A" />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="unit_number">Nomor rumah/unit</Label>
                    <Input id="unit_number" value={unitNumber} onChange={(e) => onChange.unitNumber(e.target.value)} placeholder="No. 12" autoFocus />
                    <InputError message={errors.unit_number} />
                </div>
            </div>

            <Button type="button" className="w-full" disabled={submitting} onClick={onSubmit}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Selesai
            </Button>
        </div>
    );
}
