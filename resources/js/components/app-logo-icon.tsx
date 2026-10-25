import { cn } from '@/lib/utils';

export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <img
            src="/logo/hunianid-icon.png"
            alt="HunianID"
            className={cn('object-contain', className)}
        />
    );
}
