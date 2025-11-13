export function getTeamColor(teamName?: string): string {
  if (!teamName) return 'hsl(var(--display-accent))';
  
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 75%, 55%)`;
}

export function getPodiumColor(position: number): string {
  if (position === 1) return "#FFD700";
  if (position === 2) return "#C0C0C0";
  if (position === 3) return "#CD7F32";
  return "hsl(var(--display-muted))";
}
