import { Athlete } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface AthleteListProps {
  athletes: Athlete[];
}

export function AthleteList({ athletes }: AthleteListProps) {
  if (athletes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No athletes added yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Athletes ({athletes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {athletes.map((athlete) => (
            <div
              key={athlete.id}
              className="flex items-center justify-between p-3 rounded-md border hover-elevate"
              data-testid={`row-athlete-${athlete.id}`}
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" data-testid={`badge-bib-${athlete.id}`}>
                  #{athlete.bib}
                </Badge>
                <div>
                  <p className="font-medium" data-testid={`text-athlete-name-${athlete.id}`}>
                    {athlete.name}
                  </p>
                  {athlete.team && (
                    <p className="text-sm text-muted-foreground">
                      {athlete.team}
                    </p>
                  )}
                </div>
              </div>
              {athlete.country && (
                <img
                  src={`https://flagcdn.com/24x18/${athlete.country}.png`}
                  srcSet={`https://flagcdn.com/48x36/${athlete.country}.png 2x`}
                  alt={`${athlete.country} flag`}
                  className="w-6 h-auto"
                  data-testid={`img-flag-${athlete.id}`}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
