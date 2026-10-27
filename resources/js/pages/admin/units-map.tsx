import { Head } from '@inertiajs/react';
import { UnitsMapCore, type MapUnit } from '@/components/units-map/units-map-core';
import type { Area } from '@/types';

type Props = {
    area: Area;
    initial: {
        units: MapUnit[];
        unpinnedCount: number;
    };
};

export default function AdminUnitsMap({ area, initial }: Props) {
    const complexCenter = {
        lat: Number(area.complex?.latitude ?? 0),
        lng: Number(area.complex?.longitude ?? 0),
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-[2rem] bg-(--color-bg) p-4 sm:p-6 lg:p-8">
            <Head title="Peta Unit" />
            <div className="flex">
                <p className="font-mono text-[11px] font-semibold tracking-[0.24em] text-(--color-sky-deep) uppercase">
                    Admin · Peta Unit
                </p>
            </div>
            <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold tracking-tight text-(--color-ink) sm:text-3xl">
                    Peta {area.complex?.name}-{area.name}
                </h1>
            </div>

            <UnitsMapCore
                initialUnits={initial.units}
                initialUnpinnedCount={initial.unpinnedCount}
                complexCenter={complexCenter}
                pollUrl="/admin/units-map/data"
            />
        </div>
    );
}
