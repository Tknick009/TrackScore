import { cn } from "@/lib/utils";

interface GradientBoxProps {
  children: React.ReactNode;
  variant?: 'normal' | 'thick' | 'glow';
  className?: string;
}

export function GradientBox({ children, variant = 'normal', className }: GradientBoxProps) {
  return (
    <div className={cn(
      'rounded-lg',
      variant === 'normal' && 'gradient-edge-blue',
      variant === 'thick' && 'gradient-edge-blue-thick',
      variant === 'glow' && 'gradient-edge-blue-glow',
      className
    )}>
      {children}
    </div>
  );
}
