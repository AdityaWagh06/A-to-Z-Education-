const ANIMAL_AVATARS = [
    { name: 'Cat', emoji: '🐱', tone: 'from-amber-200 to-orange-300' },
    { name: 'Dog', emoji: '🐶', tone: 'from-yellow-200 to-amber-300' },
    { name: 'Fox', emoji: '🦊', tone: 'from-orange-200 to-red-300' },
    { name: 'Panda', emoji: '🐼', tone: 'from-slate-200 to-gray-300' },
    { name: 'Koala', emoji: '🐨', tone: 'from-zinc-200 to-stone-300' },
    { name: 'Rabbit', emoji: '🐰', tone: 'from-pink-200 to-rose-300' },
    { name: 'Tiger', emoji: '🐯', tone: 'from-amber-200 to-yellow-300' },
    { name: 'Bear', emoji: '🐻', tone: 'from-yellow-200 to-orange-400' },
    { name: 'Monkey', emoji: '🐵', tone: 'from-amber-200 to-yellow-400' },
    { name: 'Penguin', emoji: '🐧', tone: 'from-cyan-200 to-sky-300' },
];

const hashSeed = (value) => {
    const text = String(value || 'guest-animal');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const AnimatedAnimalAvatar = ({ user, size = 'md', className = '' }) => {
    const seed = user?._id || user?.email || user?.name || 'guest-animal';
    const index = hashSeed(seed) % ANIMAL_AVATARS.length;
    const avatar = ANIMAL_AVATARS[index];

    const sizeClass = size === 'lg'
        ? 'w-28 h-28 text-5xl'
        : size === 'sm'
            ? 'w-8 h-8 text-lg'
            : 'w-9 h-9 text-xl';

    return (
        <div
            className={`animal-avatar-float bg-gradient-to-br ${avatar.tone} ${sizeClass} rounded-full border border-white/80 shadow-sm flex items-center justify-center select-none ${className}`}
            style={{ animationDelay: `${index * 120}ms` }}
            title={`${avatar.name} Avatar`}
            aria-label={`${avatar.name} avatar`}
        >
            <span className="leading-none">{avatar.emoji}</span>
        </div>
    );
};

export default AnimatedAnimalAvatar;
