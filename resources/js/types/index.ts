export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Area, Complex } from './auth';

export type Unit = {
    id: number;
    area: Area;
    complex: Complex;
    unit_number: string;
    block?: string;
    normalized_address: string;
    status: 'active' | 'inactive';
    created_at?: string;
    updated_at?: string;
};
