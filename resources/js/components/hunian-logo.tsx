import { cn } from '@/lib/utils';

export default function HunianLogo({ className }: { className?: string }) {
    return (
        <img
            src="/logo/hunianid-logo.png"
            alt="HunianID"
            className={cn('h-9 w-auto object-contain', className)}
        />
    );
}
