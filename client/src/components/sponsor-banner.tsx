import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { SelectSponsor } from "@shared/schema";

interface SponsorBannerProps {
  meetId: string;
  zoneName?: string;
  dwellMs?: number;
}

export function SponsorBanner({ meetId, zoneName = "footer", dwellMs = 5000 }: SponsorBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const { data: sponsors } = useQuery<SelectSponsor[]>({
    queryKey: ["/api/meets", meetId, "rotation-sponsors"],
    refetchInterval: 30000
  });
  
  const activeSponsors = sponsors?.filter(s => s.isActive && s.logoUrl);
  
  useEffect(() => {
    if (!activeSponsors || activeSponsors.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeSponsors.length);
    }, dwellMs);
    
    return () => clearInterval(interval);
  }, [activeSponsors, dwellMs]);
  
  if (!activeSponsors || activeSponsors.length === 0) return null;
  
  const currentSponsor = activeSponsors[currentIndex];
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-background/95">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSponsor.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex items-center justify-center p-4"
        >
          <img
            src={currentSponsor.logoUrl || ""}
            alt={currentSponsor.name}
            className="max-w-full max-h-full object-contain"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
