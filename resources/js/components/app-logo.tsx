import { cn } from '@/lib/utils';

type Props = {
    /** 'dark' = navy text for light backgrounds, 'light' = white text for dark backgrounds (e.g. the sidebar). */
    variant?: 'dark' | 'light';
    className?: string;
};

export default function AppLogo({ variant = 'dark', className }: Props) {
    const src =
        variant === 'light'
            ? '/logo/hunianid-logo-admin.png'
            : '/logo/hunianid-logo-text.png';

    return (
        <img src={src} alt="HunianID" className={cn('h-8 w-auto object-contain', className)} />
    );
}
