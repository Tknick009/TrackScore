import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Meet } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Palette, Type, Image, Settings, Loader2 } from "lucide-react";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}

function ColorPicker({ label, value, onChange, testId }: ColorPickerProps) {
  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
    const sDecimal = s / 100;
    const lDecimal = l / 100;
    
    const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lDecimal - c / 2;
    
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToHSL = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const hexValue = hslToHex(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(hexToHSL(e.target.value))}
          className="w-16 h-10 p-1 cursor-pointer"
          data-testid={testId}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="H S% L%"
          className="flex-1 font-mono text-sm"
          data-testid={`${testId}-text`}
        />
      </div>
    </div>
  );
}

const FONT_OPTIONS = [
  { value: "Barlow Semi Condensed", label: "Barlow Semi Condensed (Default Stadium)" },
  { value: "Bebas Neue", label: "Bebas Neue (Bold Display)" },
  { value: "Roboto", label: "Roboto (Clean Sans)" },
  { value: "Roboto Condensed", label: "Roboto Condensed (Compact)" },
  { value: "Inter", label: "Inter (Modern Sans)" },
  { value: "Oswald", label: "Oswald (Strong Display)" },
  { value: "Montserrat", label: "Montserrat (Geometric)" },
  { value: "system-ui", label: "System Default" },
];

export default function DisplayCustomizePage() {
  const [selectedMeetId, setSelectedMeetId] = useState<string | null>(null);
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);
  const [themeData, setThemeData] = useState({
    accentColor: "165 95% 50%",
    bgColor: "220 15% 8%",
    bgElevatedColor: "220 15% 12%",
    bgBorderColor: "220 15% 18%",
    fgColor: "0 0% 95%",
    mutedColor: "0 0% 60%",
    headingFont: "Barlow Semi Condensed",
    bodyFont: "Roboto",
    numbersFont: "Barlow Semi Condensed",
    logoUrl: "",
    showTeamColors: true,
    showReactionTimes: true,
    showSplits: true,
  });

  const { toast } = useToast();

  // Save theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMeetId) throw new Error("No meet selected");
      
      const themePayload = {
        name: "Custom Theme",
        isDefault: true,
        accentColor: themeData.accentColor,
        bgColor: themeData.bgColor,
        bgElevatedColor: themeData.bgElevatedColor,
        bgBorderColor: themeData.bgBorderColor,
        fgColor: themeData.fgColor,
        mutedColor: themeData.mutedColor,
        headingFont: themeData.headingFont,
        bodyFont: themeData.bodyFont,
        numbersFont: themeData.numbersFont,
        logoUrl: themeData.logoUrl || null,
        sponsorLogos: null,
        features: {
          showTeamColors: themeData.showTeamColors,
          showReactionTimes: themeData.showReactionTimes,
          showSplits: themeData.showSplits,
        },
      };

      // Upsert: PATCH existing or POST new
      if (currentThemeId) {
        const response = await apiRequest("PATCH", `/api/themes/${currentThemeId}`, themePayload);
        return await response.json();
      } else {
        const response = await apiRequest("POST", `/api/meets/${selectedMeetId}/themes`, themePayload);
        return await response.json();
      }
    },
    onSuccess: (data: any) => {
      if (!currentThemeId && data?.id) {
        setCurrentThemeId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/meets/${selectedMeetId}/themes/default`] });
      toast({
        title: "Theme saved",
        description: "Your display theme has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving theme",
        description: error.message || "Failed to save theme. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Sample event data for preview
  const sampleEvent = {
    id: "preview-event",
    name: "Women's 1500m Run",
    eventType: "1500m",
    gender: "F",
    status: "in_progress",
    round: "final",
    heat: 1,
    entries: [
      {
        id: "1",
        finalPlace: 1,
        finalTime: 247.83,
        athlete: { firstName: "Sarah", lastName: "Johnson", bibNumber: "425" },
        team: { name: "Team Alpha", abbreviation: "TMA" },
        lane: 5,
      },
      {
        id: "2",
        finalPlace: 2,
        finalTime: 248.12,
        athlete: { firstName: "Emma", lastName: "Smith", bibNumber: "312" },
        team: { name: "Team Beta", abbreviation: "TMB" },
        lane: 3,
      },
      {
        id: "3",
        finalPlace: 3,
        finalTime: 249.45,
        athlete: { firstName: "Olivia", lastName: "Davis", bibNumber: "178" },
        team: { name: "Team Gamma", abbreviation: "TMG" },
        lane: 7,
      },
    ],
  };

  const sampleMeet = {
    id: "preview-meet",
    name: "Preview Meet",
    location: "Stadium",
    logoUrl: themeData.logoUrl || undefined,
  };

  // Fetch available meets
  const { data: meets } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  // Fetch default theme for selected meet
  const { data: defaultTheme, isLoading: themeLoading, isError: themeError } = useQuery<any>({
    queryKey: selectedMeetId ? [`/api/meets/${selectedMeetId}/themes/default`] : [],
    enabled: !!selectedMeetId,
  });

  // Reset state when meet changes
  useEffect(() => {
    if (selectedMeetId) {
      setCurrentThemeId(null);
      setThemeData({
        accentColor: "165 95% 50%",
        bgColor: "220 15% 8%",
        bgElevatedColor: "220 15% 12%",
        bgBorderColor: "220 15% 18%",
        fgColor: "0 0% 95%",
        mutedColor: "0 0% 60%",
        headingFont: "Barlow Semi Condensed",
        bodyFont: "Roboto",
        numbersFont: "Barlow Semi Condensed",
        logoUrl: "",
        showTeamColors: true,
        showReactionTimes: true,
        showSplits: true,
      });
    }
  }, [selectedMeetId]);

  // Load theme data when it changes
  useEffect(() => {
    if (defaultTheme) {
      setCurrentThemeId(defaultTheme.id);
      setThemeData({
        accentColor: defaultTheme.accentColor || "165 95% 50%",
        bgColor: defaultTheme.bgColor || "220 15% 8%",
        bgElevatedColor: defaultTheme.bgElevatedColor || "220 15% 12%",
        bgBorderColor: defaultTheme.bgBorderColor || "220 15% 18%",
        fgColor: defaultTheme.fgColor || "0 0% 95%",
        mutedColor: defaultTheme.mutedColor || "0 0% 60%",
        headingFont: defaultTheme.headingFont || "Barlow Semi Condensed",
        bodyFont: defaultTheme.bodyFont || "Roboto",
        numbersFont: defaultTheme.numbersFont || "Barlow Semi Condensed",
        logoUrl: defaultTheme.logoUrl || "",
        showTeamColors: defaultTheme.features?.showTeamColors ?? true,
        showReactionTimes: defaultTheme.features?.showReactionTimes ?? true,
        showSplits: defaultTheme.features?.showSplits ?? true,
      });
    }
  }, [defaultTheme]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Display Customization</h1>
            <p className="text-muted-foreground">
              Customize colors, fonts, and branding for your display boards
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={() => saveThemeMutation.mutate()}
              disabled={!selectedMeetId || saveThemeMutation.isPending}
              data-testid="button-save"
            >
              {saveThemeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Customization form */}
        <div className="w-96 border-r overflow-y-auto p-6">
          {(themeLoading && !themeError) ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading theme...</span>
            </div>
          ) : !selectedMeetId ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select a meet to customize:</p>
              {meets?.map((meet: any) => (
                <Card
                  key={meet.id}
                  className="p-4 cursor-pointer hover-elevate"
                  onClick={() => setSelectedMeetId(meet.id)}
                  data-testid={`card-meet-${meet.id}`}
                >
                  <h3 className="font-semibold">{meet.name}</h3>
                  <p className="text-sm text-muted-foreground">{meet.location}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue="colors" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="colors" data-testid="tab-colors">
                  <Palette className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="fonts" data-testid="tab-fonts">
                  <Type className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="branding" data-testid="tab-branding">
                  <Image className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="features" data-testid="tab-features">
                  <Settings className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-6 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Accent Color</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Primary brand color used for highlights and CTAs
                  </p>
                  <ColorPicker
                    label="Accent"
                    value={themeData.accentColor}
                    onChange={(v) => setThemeData({ ...themeData, accentColor: v })}
                    testId="input-accent-color"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Background Colors</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Display board background and surface colors
                  </p>
                  <div className="space-y-4">
                    <ColorPicker
                      label="Base Background"
                      value={themeData.bgColor}
                      onChange={(v) => setThemeData({ ...themeData, bgColor: v })}
                      testId="input-bg-color"
                    />
                    <ColorPicker
                      label="Elevated Surface"
                      value={themeData.bgElevatedColor}
                      onChange={(v) => setThemeData({ ...themeData, bgElevatedColor: v })}
                      testId="input-bg-elevated-color"
                    />
                    <ColorPicker
                      label="Border"
                      value={themeData.bgBorderColor}
                      onChange={(v) => setThemeData({ ...themeData, bgBorderColor: v })}
                      testId="input-bg-border-color"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Text Colors</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Foreground and secondary text colors
                  </p>
                  <div className="space-y-4">
                    <ColorPicker
                      label="Primary Text"
                      value={themeData.fgColor}
                      onChange={(v) => setThemeData({ ...themeData, fgColor: v })}
                      testId="input-fg-color"
                    />
                    <ColorPicker
                      label="Muted Text"
                      value={themeData.mutedColor}
                      onChange={(v) => setThemeData({ ...themeData, mutedColor: v })}
                      testId="input-muted-color"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fonts" className="space-y-6 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Heading Font</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Used for event names, section headers, and titles
                  </p>
                  <Select
                    value={themeData.headingFont}
                    onValueChange={(v) => setThemeData({ ...themeData, headingFont: v })}
                  >
                    <SelectTrigger data-testid="select-heading-font">
                      <SelectValue placeholder="Select heading font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div
                    className="mt-4 p-4 bg-muted rounded-lg"
                    style={{ fontFamily: themeData.headingFont }}
                  >
                    <p className="text-2xl font-bold">Sample Heading Text</p>
                    <p className="text-lg">Event 12: Women's 1500m Run - Final</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Body Font</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Used for athlete names, team names, and general text
                  </p>
                  <Select
                    value={themeData.bodyFont}
                    onValueChange={(v) => setThemeData({ ...themeData, bodyFont: v })}
                  >
                    <SelectTrigger data-testid="select-body-font">
                      <SelectValue placeholder="Select body font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div
                    className="mt-4 p-4 bg-muted rounded-lg"
                    style={{ fontFamily: themeData.bodyFont }}
                  >
                    <p className="text-base">Sarah Johnson - Team XYZ</p>
                    <p className="text-sm text-muted-foreground">Results and athlete information</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Numbers Font</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Used for times, distances, scores, and positions
                  </p>
                  <Select
                    value={themeData.numbersFont}
                    onValueChange={(v) => setThemeData({ ...themeData, numbersFont: v })}
                  >
                    <SelectTrigger data-testid="select-numbers-font">
                      <SelectValue placeholder="Select numbers font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div
                    className="mt-4 p-4 bg-muted rounded-lg"
                    style={{ fontFamily: themeData.numbersFont }}
                  >
                    <p className="text-4xl font-bold">10.23</p>
                    <p className="text-2xl">1st Place • Lane 5</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="branding" className="space-y-6 mt-4">
                <div>
                  <h3 className="font-semibold mb-2">Meet Logo</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Logo displayed in the header of display boards
                  </p>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={themeData.logoUrl}
                      onChange={(e) => setThemeData({ ...themeData, logoUrl: e.target.value })}
                      data-testid="input-logo-url"
                    />
                  </div>
                  {themeData.logoUrl && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <img
                        src={themeData.logoUrl}
                        alt="Logo preview"
                        className="h-16 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Sponsor Logos</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Optional sponsor logos shown on display boards
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    Coming soon: Add multiple sponsor logos with custom positioning
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-6 mt-4">
                <div>
                  <h3 className="font-semibold mb-4">Display Features</h3>
                  <p className="text-xs text-muted-foreground mb-6">
                    Toggle optional data elements shown on display boards
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-team-colors" className="text-base">
                          Team Colors
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Show colored bars representing each athlete's team
                        </p>
                      </div>
                      <Switch
                        id="show-team-colors"
                        checked={themeData.showTeamColors}
                        onCheckedChange={(checked) => setThemeData({ ...themeData, showTeamColors: checked })}
                        data-testid="switch-team-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-reaction-times" className="text-base">
                          Reaction Times
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Display reaction times for sprint events (when available)
                        </p>
                      </div>
                      <Switch
                        id="show-reaction-times"
                        checked={themeData.showReactionTimes}
                        onCheckedChange={(checked) => setThemeData({ ...themeData, showReactionTimes: checked })}
                        data-testid="switch-reaction-times"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="show-splits" className="text-base">
                          Split Times
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Show intermediate split times for distance events
                        </p>
                      </div>
                      <Switch
                        id="show-splits"
                        checked={themeData.showSplits}
                        onCheckedChange={(checked) => setThemeData({ ...themeData, showSplits: checked })}
                        data-testid="switch-splits"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Advanced Options</h3>
                  <p className="text-sm text-muted-foreground italic">
                    Additional customization options coming soon
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Right panel - Live preview */}
        <div className="flex-1 bg-muted/20 overflow-y-auto p-6">
          {!selectedMeetId ? (
            <div className="text-center text-muted-foreground pt-20">
              <p>Select a meet to see preview</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Live Preview</h2>
                <p className="text-sm text-muted-foreground">
                  Changes update in real-time
                </p>
              </div>
              
              {/* Preview display board */}
              <div
                className="rounded-lg overflow-hidden shadow-2xl"
                style={{
                  ['--display-accent' as string]: themeData.accentColor,
                  ['--display-bg' as string]: themeData.bgColor,
                  ['--display-bg-elevated' as string]: themeData.bgElevatedColor,
                  ['--display-border' as string]: themeData.bgBorderColor,
                  ['--display-fg' as string]: themeData.fgColor,
                  ['--display-muted' as string]: themeData.mutedColor,
                }}
              >
                {/* Sample display board header */}
                <div 
                  className="p-6 border-b-4"
                  style={{
                    backgroundColor: `hsl(${themeData.bgElevatedColor})`,
                    borderBottomColor: `hsl(${themeData.accentColor})`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 
                        className="text-5xl font-bold leading-none mb-2"
                        style={{
                          fontFamily: themeData.headingFont,
                          color: `hsl(${themeData.fgColor})`,
                        }}
                      >
                        {sampleEvent.name}
                      </h1>
                      <div 
                        className="flex items-center gap-4 text-2xl"
                        style={{
                          fontFamily: themeData.bodyFont,
                          color: `hsl(${themeData.mutedColor})`,
                        }}
                      >
                        <span>Final</span>
                        <span>•</span>
                        <span>Heat {sampleEvent.heat}</span>
                      </div>
                    </div>
                    {themeData.logoUrl && (
                      <img
                        src={themeData.logoUrl}
                        alt="Logo"
                        className="h-16 object-contain opacity-80"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Sample results table */}
                <div 
                  className="p-6"
                  style={{
                    backgroundColor: `hsl(${themeData.bgColor})`,
                  }}
                >
                  <div className="space-y-3">
                    {sampleEvent.entries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="rounded-lg p-4 flex items-center gap-4"
                        style={{
                          backgroundColor: `hsl(${themeData.bgElevatedColor})`,
                          borderLeft: themeData.showTeamColors
                            ? `6px solid hsl(${themeData.accentColor})`
                            : 'none',
                        }}
                      >
                        <div 
                          className="text-4xl font-bold w-16 text-center"
                          style={{
                            fontFamily: themeData.numbersFont,
                            color: idx === 0 ? `hsl(${themeData.accentColor})` : `hsl(${themeData.fgColor})`,
                          }}
                        >
                          {entry.finalPlace}
                        </div>
                        <div className="flex-1">
                          <div 
                            className="text-2xl font-semibold"
                            style={{
                              fontFamily: themeData.bodyFont,
                              color: `hsl(${themeData.fgColor})`,
                            }}
                          >
                            {entry.athlete.firstName} {entry.athlete.lastName}
                          </div>
                          <div 
                            className="text-lg"
                            style={{
                              fontFamily: themeData.bodyFont,
                              color: `hsl(${themeData.mutedColor})`,
                            }}
                          >
                            {entry.team.name} • Lane {entry.lane}
                          </div>
                        </div>
                        <div 
                          className="text-4xl font-bold"
                          style={{
                            fontFamily: themeData.numbersFont,
                            color: `hsl(${themeData.fgColor})`,
                          }}
                        >
                          {Math.floor(entry.finalTime / 60)}:{(entry.finalTime % 60).toFixed(2).padStart(5, '0')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
