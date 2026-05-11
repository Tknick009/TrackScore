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

export function SponsorRotation({
  entries,
  meetName,
  meetLogoUrl,
  rotationInterval = 8,
  primaryColor,
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
  if (!current) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <span className="text-white/40 text-2xl">No sponsors configured</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black relative">
      {meetLogoUrl && (
        <img src={meetLogoUrl} alt="" className="absolute top-4 left-4 h-10 object-contain opacity-50" />
      )}
      <img
        src={current.url}
        alt={current.name || 'Sponsor'}
        className="max-w-[80%] max-h-[70%] object-contain"
      />
      {current.name && (
        <span className="text-white/60 text-lg mt-4">{current.name}</span>
      )}
    </div>
  );
}
