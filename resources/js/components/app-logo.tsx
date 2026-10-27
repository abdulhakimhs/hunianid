type Props = {
    /** 'dark' = navy text for light backgrounds, 'light' = white text for dark backgrounds (e.g. the sidebar). */
    variant?: 'dark' | 'light';
};

export default function AppLogo({ variant = 'dark' }: Props) {
    const src =
        variant === 'light'
            ? '/logo/hunianid-logo-text-white.png'
            : '/logo/hunianid-logo-text.png';

    return (
        <img src={src} alt="HunianID" className="h-8 w-auto object-contain" />
    );
}
