import { useState, useEffect, useRef } from "react";
import { getLogoEffectStyle } from "@/lib/logoEffects";

interface SponsorEntry {
  place: string;
  name: string;
  lastName: string;
  affiliation: string;
  team: string;
  time: string;
  mark: string;
  imageUrl: string;
  logoUrl: string;
}

interface SponsorRotationProps {
  entries: SponsorEntry[];
  meetName: string;
  meetLogoUrl: string | null;
  meetLogoEffect?: string | null;
  rotationInterval: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export function SponsorRotation({
  entries,
  meetName,
  meetLogoUrl,
  meetLogoEffect,
  rotationInterval,
  primaryColor,
  secondaryColor,
}: SponsorRotationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const intervalMs = Math.max(3, rotationInterval || 8) * 1000;

  // Auto-rotation
  useEffect(() => {
    if (entries.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      // After fade-out, switch to next sponsor
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % entries.length);
        setIsTransitioning(false);
      }, 500); // 500ms fade-out duration
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [entries.length, intervalMs]);

  if (!entries || entries.length === 0) return null;

  const currentSponsor = entries[currentIndex];
  const sponsorImageUrl = currentSponsor?.imageUrl || currentSponsor?.logoUrl || '';
  const sponsorName = currentSponsor?.name || currentSponsor?.lastName || '';
  const accentColor = primaryColor || '#0088DC';
  const bgSecondary = secondaryColor || '#003366';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col relative"
      style={{
        background: '#000000',
        fontFamily: "'Barlow Semi Condensed', 'Inter', sans-serif",
      }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at center, ${accentColor}22 0%, ${bgSecondary}11 50%, #0a0a0a 100%)
          `,
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Meet logo header */}
        {meetLogoUrl && (
          <div className="flex items-center justify-center pt-6 pb-4">
            <img
              src={meetLogoUrl}
              alt={meetName || ''}
              className="h-20 object-contain"
              style={getLogoEffectStyle(meetLogoEffect)}
            />
          </div>
        )}

        {/* Thin divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Sponsor content area — centered, fills remaining space */}
        <div
          className="flex-1 flex items-center justify-center px-12"
          style={{
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <div className="flex flex-col items-center text-center max-w-[80%]">
            {/* Sponsor image/logo */}
            {sponsorImageUrl ? (
              <img
                src={sponsorImageUrl}
                alt={sponsorName}
                className="object-contain"
                style={{
                  maxWidth: '70vw',
                  maxHeight: '50vh',
                  filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
                }}
              />
            ) : (
              // No image — show sponsor name as large text
              <div
                className="text-white font-bold uppercase"
                style={{
                  fontSize: 'clamp(48px, 8vw, 120px)',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  textShadow: '2px 3px 8px rgba(0,0,0,0.4)',
                }}
              >
                {sponsorName}
              </div>
            )}

            {/* Sponsor name below image (if both exist) */}
            {sponsorImageUrl && sponsorName && (
              <div
                className="text-white/70 font-medium uppercase mt-6"
                style={{
                  fontSize: 'clamp(18px, 3vw, 42px)',
                  letterSpacing: '0.1em',
                }}
              >
                {sponsorName}
              </div>
            )}
          </div>
        </div>

        {/* Thin divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Footer with progress dots */}
        <div className="flex items-center justify-center py-4 gap-3">
          {entries.length > 1 && entries.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? 12 : 6,
                height: 6,
                backgroundColor: i === currentIndex ? accentColor : 'rgba(255,255,255,0.2)',
                borderRadius: i === currentIndex ? 3 : '50%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
