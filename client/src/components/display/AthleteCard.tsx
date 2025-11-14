import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AthleteCardProps {
  athlete: {
    id: string;
    name: string;
    bibNumber?: string | null;
    teamName?: string;
    country?: string | null;
  };
  result?: {
    place?: number | null;
    time?: string | null;      // For track events: "10.23"
    mark?: string | null;       // For field events: "7.42m"
    points?: number | null;     // For multi-events
  };
  photoUrl?: string | null;
  size?: 'small' | 'medium' | 'large';
  highlighted?: boolean;
  className?: string;
}

// Helper to get podium color based on place
function getPodiumColor(place: number | null | undefined): string {
  if (!place) return 'hsl(var(--display-muted))';
  switch (place) {
    case 1:
      return '#FFD700'; // Gold
    case 2:
      return '#C0C0C0'; // Silver
    case 3:
      return '#CD7F32'; // Bronze
    default:
      return 'hsl(var(--display-muted))';
  }
}

// Helper to format place with ordinal suffix
function formatPlace(place: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const v = place % 100;
  return place + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

export function AthleteCard({
  athlete,
  result,
  photoUrl,
  size = 'medium',
  highlighted = false,
  className
}: AthleteCardProps) {
  // Extract initials for avatar fallback
  const initials = athlete.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Determine if podium position
  const isPodium = result?.place && result.place <= 3;

  // Size-specific configurations
  const sizeConfig = {
    small: {
      avatarSize: 'h-[60px] w-[60px]',
      nameSize: 'text-[24px]',
      teamSize: 'text-[16px]',
      resultSize: 'text-[28px]',
      placeSize: 'text-[20px]',
      placeBadgeSize: 'w-[40px] h-[40px]',
      padding: 'p-3',
      gap: 'gap-3',
      height: 'min-h-[80px]',
    },
    medium: {
      avatarSize: 'h-[120px] w-[120px]',
      nameSize: 'text-[32px]',
      teamSize: 'text-[20px]',
      resultSize: 'text-[48px]',
      placeSize: 'text-[28px]',
      placeBadgeSize: 'w-[64px] h-[64px]',
      padding: 'p-4',
      gap: 'gap-4',
      height: 'min-h-[150px]',
    },
    large: {
      avatarSize: 'h-[200px] w-[200px]',
      nameSize: 'text-[60px]',
      teamSize: 'text-[32px]',
      resultSize: 'text-[72px]',
      placeSize: 'text-[40px]',
      placeBadgeSize: 'w-[96px] h-[96px]',
      padding: 'p-6',
      gap: 'gap-6',
      height: 'min-h-[300px]',
    },
  };

  const config = sizeConfig[size];

  return (
    <Card
      className={cn(
        'flex items-center bg-[hsl(var(--display-bg))] border-[hsl(var(--display-border))] text-[hsl(var(--display-fg))]',
        config.padding,
        config.gap,
        config.height,
        highlighted && 'border-[hsl(var(--display-warning))] border-4',
        className
      )}
      data-testid={`card-athlete-${athlete.id}`}
    >
      {/* Avatar */}
      {photoUrl !== undefined && (
        <Avatar
          className={cn(config.avatarSize, 'shrink-0')}
          data-testid={`avatar-${athlete.id}`}
        >
          {photoUrl && <AvatarImage src={photoUrl} alt={athlete.name} />}
          <AvatarFallback className="bg-[hsl(var(--display-accent))] text-[hsl(var(--display-bg))] font-stadium font-[700]">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Name and Bib */}
        <div className="flex items-center gap-3 flex-wrap">
          <h3
            className={cn(
              'font-stadium font-[700] text-[hsl(var(--display-fg))] leading-none',
              config.nameSize
            )}
            data-testid={`text-name-${athlete.id}`}
          >
            {athlete.name}
          </h3>
          {athlete.bibNumber && (
            <span
              className={cn(
                'font-stadium font-[600] text-[hsl(var(--display-muted))]',
                size === 'small' ? 'text-[18px]' : size === 'medium' ? 'text-[24px]' : 'text-[32px]'
              )}
              data-testid={`text-bib-${athlete.id}`}
            >
              #{athlete.bibNumber}
            </span>
          )}
        </div>

        {/* Team/Country */}
        {(athlete.teamName || athlete.country) && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {athlete.teamName && (
              <p
                className={cn(
                  'text-[hsl(var(--display-muted))] leading-none',
                  config.teamSize
                )}
                data-testid={`text-team-${athlete.id}`}
              >
                {athlete.teamName}
              </p>
            )}
            {athlete.country && (
              <span
                className={cn(
                  'font-stadium font-[600] text-[hsl(var(--display-accent))] uppercase',
                  size === 'small' ? 'text-[14px]' : size === 'medium' ? 'text-[18px]' : 'text-[24px]'
                )}
                data-testid={`text-country-${athlete.id}`}
              >
                {athlete.country}
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Place indicator */}
            {result.place && result.place > 0 && (
              <div
                className={cn(
                  'rounded-full flex items-center justify-center font-stadium-numbers font-[900] shrink-0',
                  config.placeBadgeSize,
                  isPodium ? 'text-[hsl(var(--display-bg))]' : 'border-2 border-[hsl(var(--display-muted))] text-[hsl(var(--display-muted))]'
                )}
                style={isPodium ? { backgroundColor: getPodiumColor(result.place) } : undefined}
                data-testid={`badge-place-${athlete.id}`}
              >
                {result.place}
              </div>
            )}

            {/* Result value */}
            <div className="flex flex-col">
              {result.place && !isPodium && (
                <p
                  className={cn(
                    'font-stadium font-[600] text-[hsl(var(--display-muted))] leading-none mb-1',
                    size === 'small' ? 'text-[14px]' : size === 'medium' ? 'text-[18px]' : 'text-[24px]'
                  )}
                  data-testid={`text-place-label-${athlete.id}`}
                >
                  {formatPlace(result.place)}
                </p>
              )}
              {result.time && (
                <div
                  className={cn(
                    'font-stadium-numbers font-[900] text-[hsl(var(--display-fg))] leading-none',
                    config.resultSize
                  )}
                  data-testid={`text-time-${athlete.id}`}
                >
                  {result.time}
                </div>
              )}
              {result.mark && (
                <div
                  className={cn(
                    'font-stadium-numbers font-[900] text-[hsl(var(--display-fg))] leading-none',
                    config.resultSize
                  )}
                  data-testid={`text-mark-${athlete.id}`}
                >
                  {result.mark}
                </div>
              )}
              {result.points && (
                <div
                  className={cn(
                    'font-stadium-numbers font-[900] text-[hsl(var(--display-accent))] leading-none',
                    config.resultSize
                  )}
                  data-testid={`text-points-${athlete.id}`}
                >
                  {result.points} pts
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
