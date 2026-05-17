import { useState, useEffect } from 'react';

interface SponsorEntry {
  url: string;
  name?: string;
}

interface SponsorRotationProps {
  entries: SponsorEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  rotationInterval?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

function getLogoEffectStyle(effect?: string | null): React.CSSProperties {
  switch (effect) {
    case 'glow':
      return { filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' };
    case 'shadow':
      return { filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))' };
    default:
      return {};
  }
}

export function SponsorRotation({
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  rotationInterval = 8,
  primaryColor,
  secondaryColor,
}: SponsorRotationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (entries.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % entries.length);
    }, rotationInterval * 1000);
    return () => clearInterval(timer);
  }, [entries.length, rotationInterval]);

  const current = entries[currentIndex];
  const accentColor = primaryColor || '#0088DC';

  if (!current) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <span className="text-white/40 text-2xl">No sponsors configured</span>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center relative"
      style={{
        background: '#000000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Background glow matching meet title displays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 120%, ${accentColor}59 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 20% 80%, ${accentColor}33 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, ${accentColor}33 0%, transparent 50%)
          `,
        }}
      />

      {/* Meet logo */}
      {meetLogoUrl && (
        <div className="absolute top-6 left-8 z-20">
          <img
            src={meetLogoUrl}
            alt={meetName || ''}
            className="h-16 object-contain"
            style={getLogoEffectStyle(meetLogoEffect)}
          />
        </div>
      )}

      {/* Sponsor image */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <img
          src={current.url}
          alt={current.name || 'Sponsor'}
          className="max-w-[80%] max-h-[70vh] object-contain"
        />
        {current.name && (
          <span className="text-white/60 text-lg mt-4">{current.name}</span>
        )}
      </div>
    </div>
  );
}
