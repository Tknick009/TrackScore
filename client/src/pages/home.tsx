import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Monitor, Settings } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-foreground">
            TrackField Scoreboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real-time track and field scoreboard system with centralized control
            and multi-display broadcasting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                Control Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage all track and field events, record results, and broadcast
                live to display boards
              </p>
              <Link href="/control">
                <Button className="w-full" size="lg" data-testid="button-go-to-control">
                  Open Control Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Monitor className="w-6 h-6 text-primary" />
                Display Board
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Full-screen scoreboard optimized for video boards showing live
                event results
              </p>
              <Link href="/display">
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  data-testid="button-go-to-display"
                >
                  Open Display Board
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-primary">1.</span>
                <span>
                  Use the <strong>Control Dashboard</strong> on one computer to
                  create events, add athletes, and record results
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary">2.</span>
                <span>
                  Open the <strong>Display Board</strong> on multiple computers
                  connected to video boards
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-primary">3.</span>
                <span>
                  Results automatically broadcast in real-time to all display
                  boards via WebSocket
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
