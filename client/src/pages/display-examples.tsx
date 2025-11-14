import { AthleteCard } from "@/components/display/AthleteCard";
import { AttemptTracker } from "@/components/display/AttemptTracker";
import { LiveTimer } from "@/components/display/LiveTimer";
import { LaneVisualization } from "@/components/display/LaneVisualization";

export default function DisplayExamples() {
  // Sample athlete data
  const sampleAthletes = [
    {
      id: '1',
      name: 'Usain Bolt',
      bibNumber: '2163',
      teamName: 'Jamaica',
      country: 'JAM',
      photoUrl: null,
    },
    {
      id: '2',
      name: 'Florence Griffith-Joyner',
      bibNumber: '569',
      teamName: 'United States',
      country: 'USA',
      photoUrl: null,
    },
    {
      id: '3',
      name: 'Michael Johnson',
      bibNumber: '1234',
      teamName: 'United States',
      country: 'USA',
      photoUrl: null,
    },
    {
      id: '4',
      name: 'Haile Gebrselassie',
      bibNumber: '777',
      teamName: 'Ethiopia',
      country: 'ETH',
      photoUrl: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--display-bg))] p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4">
            Athlete Card Examples
          </h1>
          <p className="text-[32px] text-[hsl(var(--display-muted))]">
            Stadium Display Board Components
          </p>
        </div>

        {/* Size Variants Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            Size Variants
          </h2>
          
          {/* Large Size */}
          <div className="mb-8">
            <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
              Large (Featured Athlete)
            </h3>
            <AthleteCard
              athlete={sampleAthletes[0]}
              result={{ place: 1, time: '9.58' }}
              size="large"
              data-testid="example-large"
            />
          </div>

          {/* Medium Size */}
          <div className="mb-8">
            <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
              Medium (Default Card)
            </h3>
            <AthleteCard
              athlete={sampleAthletes[1]}
              result={{ place: 2, time: '10.49' }}
              size="medium"
              data-testid="example-medium"
            />
          </div>

          {/* Small Size */}
          <div className="mb-8">
            <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
              Small (Compact List)
            </h3>
            <AthleteCard
              athlete={sampleAthletes[2]}
              result={{ place: 3, time: '19.32' }}
              size="small"
              data-testid="example-small"
            />
          </div>
        </section>

        {/* Podium Positions Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            Podium Positions (Gold/Silver/Bronze)
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <AthleteCard
              athlete={{ ...sampleAthletes[0], name: '1st Place - Gold' }}
              result={{ place: 1, time: '9.58' }}
              size="medium"
              data-testid="example-gold"
            />
            <AthleteCard
              athlete={{ ...sampleAthletes[1], name: '2nd Place - Silver' }}
              result={{ place: 2, time: '9.69' }}
              size="medium"
              data-testid="example-silver"
            />
            <AthleteCard
              athlete={{ ...sampleAthletes[2], name: '3rd Place - Bronze' }}
              result={{ place: 3, time: '9.79' }}
              size="medium"
              data-testid="example-bronze"
            />
          </div>
        </section>

        {/* Highlighted Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            Highlighted (Yellow Accent)
          </h2>
          <AthleteCard
            athlete={sampleAthletes[0]}
            result={{ place: 1, time: '9.58' }}
            size="medium"
            highlighted={true}
            data-testid="example-highlighted"
          />
        </section>

        {/* Result Types Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            Different Result Types
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Track Event - Time */}
            <div>
              <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                Track Event (Time)
              </h3>
              <AthleteCard
                athlete={{ ...sampleAthletes[0], name: 'Usain Bolt - 100m' }}
                result={{ place: 1, time: '9.58' }}
                size="medium"
                data-testid="example-time"
              />
            </div>

            {/* Field Event - Mark */}
            <div>
              <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                Field Event (Distance/Height)
              </h3>
              <AthleteCard
                athlete={{ ...sampleAthletes[1], name: 'Flo-Jo - Long Jump' }}
                result={{ place: 1, mark: '7.40m' }}
                size="medium"
                data-testid="example-mark"
              />
            </div>

            {/* Multi-Event - Points */}
            <div>
              <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                Multi-Event (Points)
              </h3>
              <AthleteCard
                athlete={{ ...sampleAthletes[2], name: 'Michael Johnson - Decathlon' }}
                result={{ place: 1, points: 8847 }}
                size="medium"
                data-testid="example-points"
              />
            </div>
          </div>
        </section>

        {/* Without Photos Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            Without Photos (Initials Fallback)
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {sampleAthletes.map((athlete, index) => (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                result={{ place: index + 1, time: `${9.5 + index * 0.1}` }}
                size="small"
                photoUrl={null}
                data-testid={`example-no-photo-${athlete.id}`}
              />
            ))}
          </div>
        </section>

        {/* No Results Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            Without Results (Pre-Event)
          </h2>
          <AthleteCard
            athlete={sampleAthletes[3]}
            size="medium"
            photoUrl={null}
            data-testid="example-no-result"
          />
        </section>

        {/* List View Section */}
        <section>
          <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
            List View (Small Cards)
          </h2>
          <div className="space-y-2">
            {sampleAthletes.map((athlete, index) => (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                result={{ place: index + 4, time: `${10.0 + index * 0.1}` }}
                size="small"
                photoUrl={null}
                data-testid={`example-list-${athlete.id}`}
              />
            ))}
          </div>
        </section>

        {/* AttemptTracker Section */}
        <section className="border-t-4 border-[hsl(var(--display-accent))] pt-12">
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4 text-center">
            Attempt Tracker Examples
          </h1>
          <p className="text-[32px] text-[hsl(var(--display-muted))] text-center mb-12">
            Field Event Attempt Tracking (Jumps & Throws)
          </p>

          {/* Size Variants */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Size Variants
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Large (Main Display Board)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="large"
                  data-testid="tracker-large"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Medium (Default)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  data-testid="tracker-medium"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Small (Compact Lists)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="small"
                  data-testid="tracker-small"
                />
              </div>
            </div>
          </div>

          {/* Attempt Patterns */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Different Attempt Patterns
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  All Successful (Perfect Round)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.30m' },
                    { result: 'made', mark: '7.45m' },
                    { result: 'made', mark: '7.52m' },
                    { result: 'made', mark: '7.61m' },
                    { result: 'made', mark: '7.73m' },
                    { result: 'made', mark: '7.81m' },
                  ]}
                  size="medium"
                  data-testid="tracker-all-made"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Mixed Results (Made, Fault, Pass)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  data-testid="tracker-mixed"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Challenging Round (Multiple Faults)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'fault' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.12m' },
                    { result: 'fault' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.23m' },
                  ]}
                  size="medium"
                  data-testid="tracker-faults"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  In Progress (3 of 6 Attempts Complete)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.55m' },
                  ]}
                  maxAttempts={6}
                  size="medium"
                  data-testid="tracker-in-progress"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Not Started (No Attempts Yet)
                </h3>
                <AttemptTracker
                  attempts={[]}
                  maxAttempts={6}
                  size="medium"
                  data-testid="tracker-empty"
                />
              </div>
            </div>
          </div>

          {/* With Marks Display */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              With Distance/Height Marks
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Long Jump - With Marks Displayed
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="large"
                  showMarks={true}
                  data-testid="tracker-with-marks"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  High Jump - With Heights
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '2.10m' },
                    { result: 'made', mark: '2.15m' },
                    { result: 'made', mark: '2.20m' },
                    { result: 'fault' },
                    { result: 'made', mark: '2.25m' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  showMarks={true}
                  data-testid="tracker-high-jump"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Shot Put - With Distances
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '19.23m' },
                    { result: 'made', mark: '19.87m' },
                    { result: 'fault' },
                    { result: 'made', mark: '20.14m' },
                    { result: 'pass' },
                    { result: 'made', mark: '20.45m' },
                  ]}
                  size="medium"
                  showMarks={true}
                  data-testid="tracker-shot-put"
                />
              </div>
            </div>
          </div>

          {/* Orientation Variants */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Orientation Variants
            </h2>
            
            <div className="grid grid-cols-2 gap-12">
              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Horizontal (Default)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  orientation="horizontal"
                  data-testid="tracker-horizontal"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Vertical (Narrow Panels)
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  orientation="vertical"
                  data-testid="tracker-vertical"
                />
              </div>
            </div>
          </div>

          {/* Field Event Types */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Different Field Event Types
            </h2>
            
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3">
                  LONG JUMP
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  showMarks={true}
                  data-testid="tracker-event-long-jump"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3">
                  TRIPLE JUMP
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '16.12m' },
                    { result: 'made', mark: '16.45m' },
                    { result: 'fault' },
                    { result: 'made', mark: '16.87m' },
                    { result: 'pass' },
                    { result: 'made', mark: '17.01m' },
                  ]}
                  size="medium"
                  showMarks={true}
                  data-testid="tracker-event-triple-jump"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3">
                  JAVELIN
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '78.23m' },
                    { result: 'fault' },
                    { result: 'made', mark: '81.45m' },
                    { result: 'made', mark: '83.12m' },
                    { result: 'pass' },
                    { result: 'made', mark: '84.67m' },
                  ]}
                  size="medium"
                  showMarks={true}
                  data-testid="tracker-event-javelin"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3">
                  POLE VAULT
                </h3>
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '5.60m' },
                    { result: 'made', mark: '5.70m' },
                    { result: 'pass' },
                    { result: 'made', mark: '5.80m' },
                    { result: 'fault' },
                    { result: 'fault' },
                  ]}
                  size="medium"
                  showMarks={true}
                  data-testid="tracker-event-pole-vault"
                />
              </div>
            </div>
          </div>

          {/* Compact Integration Example */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Compact Integration (Small Size in Lists)
            </h2>
            
            <div className="space-y-3">
              {[
                { athlete: 'Sarah Williams', mark: '7.81m', attempts: [
                  { result: 'made' as const, mark: '7.42m' },
                  { result: 'fault' as const },
                  { result: 'made' as const, mark: '7.65m' },
                  { result: 'pass' as const },
                  { result: 'made' as const, mark: '7.81m' },
                  { result: 'fault' as const },
                ]},
                { athlete: 'Emma Johnson', mark: '7.65m', attempts: [
                  { result: 'made' as const, mark: '7.45m' },
                  { result: 'made' as const, mark: '7.65m' },
                  { result: 'fault' as const },
                  { result: 'fault' as const },
                  { result: 'pass' as const },
                  { result: 'made' as const, mark: '7.52m' },
                ]},
                { athlete: 'Jessica Chen', mark: '7.52m', attempts: [
                  { result: 'fault' as const },
                  { result: 'made' as const, mark: '7.23m' },
                  { result: 'made' as const, mark: '7.52m' },
                  { result: 'pass' as const },
                  { result: 'fault' as const },
                  { result: 'made' as const, mark: '7.41m' },
                ]},
              ].map((athlete, idx) => (
                <div 
                  key={idx}
                  className="bg-[hsl(var(--display-border))] p-4 rounded-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-stadium-numbers text-[32px] font-[900] text-[hsl(var(--display-muted))]">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-fg))]">
                        {athlete.athlete}
                      </h4>
                      <p className="font-stadium-numbers text-[20px] font-[700] text-[hsl(var(--display-accent))]">
                        {athlete.mark}
                      </p>
                    </div>
                  </div>
                  <AttemptTracker
                    attempts={athlete.attempts}
                    size="small"
                    data-testid={`tracker-list-${idx}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LiveTimer Section */}
        <section className="border-t-4 border-[hsl(var(--display-accent))] pt-12">
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4 text-center">
            LiveTimer Examples
          </h1>
          <p className="text-[32px] text-[hsl(var(--display-muted))] text-center mb-12">
            Event Countdowns, Race Timing & Final Time Display
          </p>

          {/* Size Variants */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Size Variants
            </h2>
            
            <div className="space-y-8">
              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Large (Featured/Hero Timer)
                </h3>
                <LiveTimer
                  mode="static"
                  time={9580}
                  label="World Record"
                  size="large"
                  showMillis={true}
                  data-testid="timer-large"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Medium (Standard Board Display)
                </h3>
                <LiveTimer
                  mode="static"
                  time={10490}
                  label="Winning Time"
                  size="medium"
                  showMillis={true}
                  data-testid="timer-medium"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-4 rounded-md">
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Small (Compact Display)
                </h3>
                <LiveTimer
                  mode="static"
                  time={11230}
                  label="Final Time"
                  size="small"
                  showMillis={true}
                  data-testid="timer-small"
                />
              </div>
            </div>
          </div>

          {/* Mode Variants */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Timer Modes
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3 text-center">
                  COUNTDOWN
                </h3>
                <p className="text-[18px] text-[hsl(var(--display-muted))] mb-4 text-center">
                  Pre-race countdown timer
                </p>
                <LiveTimer
                  mode="countdown"
                  time={300000}
                  label="Event starts in"
                  size="medium"
                  running={false}
                  data-testid="timer-countdown-demo"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3 text-center">
                  STOPWATCH
                </h3>
                <p className="text-[18px] text-[hsl(var(--display-muted))] mb-4 text-center">
                  Live race timing (running)
                </p>
                <LiveTimer
                  mode="stopwatch"
                  time={9870}
                  label="100m Dash"
                  size="medium"
                  running={true}
                  showMillis={true}
                  data-testid="timer-stopwatch-demo"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-3 text-center">
                  STATIC
                </h3>
                <p className="text-[18px] text-[hsl(var(--display-muted))] mb-4 text-center">
                  Final time display
                </p>
                <LiveTimer
                  mode="static"
                  time={10230}
                  label="Winning Time"
                  size="medium"
                  showMillis={true}
                  data-testid="timer-static-demo"
                />
              </div>
            </div>
          </div>

          {/* Time Format Examples */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Different Time Formats
            </h2>
            
            <div className="space-y-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-3">
                  Sprint Times (&lt; 1 minute) - Seconds with Hundredths
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LiveTimer
                    mode="static"
                    time={9580}
                    label="100m - 9.58"
                    size="medium"
                    showMillis={true}
                    data-testid="timer-sprint-100m"
                  />
                  <LiveTimer
                    mode="static"
                    time={43030}
                    label="400m - 43.03"
                    size="medium"
                    showMillis={true}
                    data-testid="timer-sprint-400m"
                  />
                </div>
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-3">
                  Mid-Distance (1-60 minutes) - Minutes:Seconds.Hundredths
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LiveTimer
                    mode="static"
                    time={223130}
                    label="800m - 1:41.11"
                    size="medium"
                    showMillis={true}
                    data-testid="timer-mid-800m"
                  />
                  <LiveTimer
                    mode="static"
                    time={206170}
                    label="Mile - 3:26.00"
                    size="medium"
                    showMillis={true}
                    data-testid="timer-mid-mile"
                  />
                </div>
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-3">
                  Distance/Long Events (&gt; 1 hour) - Hours:Minutes:Seconds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LiveTimer
                    mode="static"
                    time={7545000}
                    label="Marathon - 2:05:45"
                    size="medium"
                    showMillis={false}
                    data-testid="timer-marathon"
                  />
                  <LiveTimer
                    mode="static"
                    time={12649000}
                    label="50km Race Walk - 3:30:49"
                    size="medium"
                    showMillis={false}
                    data-testid="timer-race-walk"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Warning State */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Countdown Warning State
            </h2>
            <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
              Turns red with pulse animation when less than 30 seconds remain
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Normal State (60s)
                </h3>
                <LiveTimer
                  mode="countdown"
                  time={60000}
                  label="Event starts in"
                  size="medium"
                  data-testid="timer-countdown-60s"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Warning State (25s)
                </h3>
                <LiveTimer
                  mode="countdown"
                  time={25000}
                  label="Event starts in"
                  size="medium"
                  data-testid="timer-countdown-25s"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Final Seconds (10s)
                </h3>
                <LiveTimer
                  mode="countdown"
                  time={10000}
                  label="Event starts in"
                  size="medium"
                  data-testid="timer-countdown-10s"
                />
              </div>
            </div>
          </div>

          {/* Running Indicator */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Running Indicator (Stopwatch Mode)
            </h2>
            <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
              Pulsing red dot indicates live timing in progress
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Not Running
                </h3>
                <LiveTimer
                  mode="stopwatch"
                  time={9870}
                  label="100m Dash"
                  size="medium"
                  running={false}
                  showMillis={true}
                  data-testid="timer-stopwatch-paused"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Running (Live)
                </h3>
                <LiveTimer
                  mode="stopwatch"
                  time={0}
                  label="100m Dash"
                  size="medium"
                  running={true}
                  showMillis={true}
                  data-testid="timer-stopwatch-running"
                />
              </div>
            </div>
          </div>

          {/* With and Without Labels */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Label Variants
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  With Label
                </h3>
                <LiveTimer
                  mode="static"
                  time={9580}
                  label="World Record"
                  size="medium"
                  showMillis={true}
                  data-testid="timer-with-label"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Without Label
                </h3>
                <LiveTimer
                  mode="static"
                  time={9580}
                  size="medium"
                  showMillis={true}
                  data-testid="timer-without-label"
                />
              </div>
            </div>
          </div>

          {/* Real-World Examples */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Real-World Event Examples
            </h2>
            
            <div className="space-y-6">
              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-warning))] mb-4 text-center">
                  PRE-RACE: Countdown to 100m Final
                </h3>
                <LiveTimer
                  mode="countdown"
                  time={120000}
                  label="Race starts in"
                  size="large"
                  data-testid="timer-example-pre-race"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-warning))] mb-4 text-center">
                  LIVE: 400m Race in Progress
                </h3>
                <LiveTimer
                  mode="stopwatch"
                  time={0}
                  label="Race Time"
                  size="large"
                  running={true}
                  showMillis={true}
                  data-testid="timer-example-live-race"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-warning))] mb-4 text-center">
                  POST-RACE: Official Winning Time
                </h3>
                <LiveTimer
                  mode="static"
                  time={43030}
                  label="Official Time - Gold Medal"
                  size="large"
                  showMillis={true}
                  data-testid="timer-example-post-race"
                />
              </div>
            </div>
          </div>

          {/* Milliseconds Display */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Milliseconds Display
            </h2>
            <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
              Toggle hundredths display for sprint vs distance events
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  With Hundredths (Sprint)
                </h3>
                <LiveTimer
                  mode="static"
                  time={223130}
                  label="800m Final"
                  size="medium"
                  showMillis={true}
                  data-testid="timer-with-millis"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
                <h3 className="font-stadium text-[24px] font-[600] text-[hsl(var(--display-fg))] mb-3 text-center">
                  Without Hundredths (Distance)
                </h3>
                <LiveTimer
                  mode="static"
                  time={223130}
                  label="800m Final"
                  size="medium"
                  showMillis={false}
                  data-testid="timer-without-millis"
                />
              </div>
            </div>
          </div>
        </section>

        {/* LaneVisualization Section */}
        <section className="border-t-4 border-[hsl(var(--display-accent))] pt-12">
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4 text-center">
            Lane Visualization Examples
          </h1>
          <p className="text-[32px] text-[hsl(var(--display-muted))] text-center mb-12">
            Track Race Lane Positions (Sprints, Hurdles, Relays)
          </p>

          {/* Size Variants */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Size Variants
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Expanded (Detailed with Reaction Times)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Blake, Yohan', country: 'JAM', bibNumber: '2345' }, place: 2, time: '9.69', reaction: 0.165 },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM', bibNumber: '2163' }, place: 1, time: '9.58', reaction: 0.146 },
                    { laneNumber: 5, athlete: { name: 'Gatlin, Justin', country: 'USA', bibNumber: '1234' }, place: 3, time: '9.79', reaction: 0.178 },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="expanded"
                  data-testid="lane-viz-expanded"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Standard (Default)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Blake, Yohan', country: 'JAM' }, place: 2, time: '9.69' },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, place: 1, time: '9.58' },
                    { laneNumber: 5, athlete: { name: 'Gatlin, Justin', country: 'USA' }, place: 3, time: '9.79' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-standard"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[32px] font-[600] text-[hsl(var(--display-fg))] mb-4">
                  Compact (List View)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Blake, Yohan', country: 'JAM' }, place: 2, time: '9.69' },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, place: 1, time: '9.58' },
                    { laneNumber: 5, athlete: { name: 'Gatlin, Justin', country: 'USA' }, place: 3, time: '9.79' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="compact"
                  data-testid="lane-viz-compact"
                />
              </div>
            </div>
          </div>

          {/* Race States */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Race States
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Pre-Race Lineup (No Progress, No Times)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Thompson, Elaine', country: 'JAM', bibNumber: '101' } },
                    { laneNumber: 2, athlete: { name: 'Fraser-Pryce, Shelly-Ann', country: 'JAM', bibNumber: '102' } },
                    { laneNumber: 3, athlete: { name: 'Jackson, Shericka', country: 'JAM', bibNumber: '103' } },
                    { laneNumber: 4, athlete: { name: 'Ta Lou, Marie-Josée', country: 'CIV', bibNumber: '104' } },
                    { laneNumber: 5, athlete: { name: 'Hobbs, Aleia', country: 'USA', bibNumber: '105' } },
                    { laneNumber: 6, athlete: { name: 'Asher-Smith, Dina', country: 'GBR', bibNumber: '106' } },
                  ]}
                  totalLanes={8}
                  showProgress={false}
                  showTimes={false}
                  size="standard"
                  data-testid="lane-viz-pre-race"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Mid-Race (Live with Position Markers)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Thompson, Elaine', country: 'JAM' }, position: 65 },
                    { laneNumber: 2, athlete: { name: 'Fraser-Pryce, Shelly-Ann', country: 'JAM' }, position: 72 },
                    { laneNumber: 3, athlete: { name: 'Jackson, Shericka', country: 'JAM' }, position: 68 },
                    { laneNumber: 4, athlete: { name: 'Ta Lou, Marie-Josée', country: 'CIV' }, position: 70 },
                    { laneNumber: 5, athlete: { name: 'Hobbs, Aleia', country: 'USA' }, position: 75 },
                    { laneNumber: 6, athlete: { name: 'Asher-Smith, Dina', country: 'GBR' }, position: 63 },
                  ]}
                  totalLanes={8}
                  showProgress={true}
                  showTimes={false}
                  size="standard"
                  data-testid="lane-viz-mid-race"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Post-Race Results (Final Times and Places)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Thompson, Elaine', country: 'JAM' }, place: 4, time: '10.85' },
                    { laneNumber: 2, athlete: { name: 'Fraser-Pryce, Shelly-Ann', country: 'JAM' }, place: 1, time: '10.63' },
                    { laneNumber: 3, athlete: { name: 'Jackson, Shericka', country: 'JAM' }, place: 3, time: '10.76' },
                    { laneNumber: 4, athlete: { name: 'Ta Lou, Marie-Josée', country: 'CIV' }, place: 5, time: '10.91' },
                    { laneNumber: 5, athlete: { name: 'Hobbs, Aleia', country: 'USA' }, place: 2, time: '10.72' },
                    { laneNumber: 6, athlete: { name: 'Asher-Smith, Dina', country: 'GBR' }, place: 6, time: '10.95' },
                  ]}
                  totalLanes={8}
                  showProgress={false}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-post-race"
                />
              </div>
            </div>
          </div>

          {/* Podium Highlighting */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Podium Highlighting (Gold/Silver/Bronze)
            </h2>
            
            <div className="bg-[hsl(var(--display-border))] p-6 rounded-md">
              <h3 className="font-stadium text-[24px] font-[700] text-[hsl(var(--display-warning))] mb-4">
                MEN'S 100m FINAL - WORLD CHAMPIONSHIP
              </h3>
              <LaneVisualization
                lanes={[
                  { laneNumber: 1, athlete: { name: 'Powell, Asafa', country: 'JAM' }, place: 4, time: '9.84' },
                  { laneNumber: 2, athlete: { name: 'Gay, Tyson', country: 'USA' }, place: 2, time: '9.69' },
                  { laneNumber: 3, athlete: { name: 'Thompson, Richard', country: 'TRI' }, place: 5, time: '9.89' },
                  { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, place: 1, time: '9.58' },
                  { laneNumber: 5, athlete: { name: 'Blake, Yohan', country: 'JAM' }, place: 3, time: '9.75' },
                  { laneNumber: 6, athlete: { name: 'Gatlin, Justin', country: 'USA' }, place: 6, time: '9.93' },
                  { laneNumber: 7, athlete: { name: 'Burns, Marc', country: 'TRI' }, place: 7, time: '10.01' },
                  { laneNumber: 8, athlete: { name: 'Patton, Darvis', country: 'USA' }, place: 8, time: '10.07' },
                ]}
                totalLanes={8}
                showTimes={true}
                size="standard"
                data-testid="lane-viz-podium"
              />
            </div>
          </div>

          {/* Different Lane Counts */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Different Lane Counts
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  6 Lanes (Standard Track Configuration)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Smith, John', country: 'USA' }, place: 4, time: '19.84' },
                    { laneNumber: 2, athlete: { name: 'Brown, James', country: 'GBR' }, place: 3, time: '19.72' },
                    { laneNumber: 3, athlete: { name: 'Johnson, Michael', country: 'USA' }, place: 1, time: '19.32' },
                    { laneNumber: 4, athlete: { name: 'Williams, David', country: 'JAM' }, place: 2, time: '19.58' },
                    { laneNumber: 5, athlete: { name: 'Davis, Robert', country: 'CAN' }, place: 5, time: '19.91' },
                    { laneNumber: 6, athlete: { name: 'Miller, Chris', country: 'AUS' }, place: 6, time: '20.03' },
                  ]}
                  totalLanes={6}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-6-lanes"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  8 Lanes (Olympic/Championship Standard)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Runner A', country: 'USA' }, place: 5, time: '43.84' },
                    { laneNumber: 2, athlete: { name: 'Runner B', country: 'GBR' }, place: 3, time: '43.52' },
                    { laneNumber: 3, athlete: { name: 'Runner C', country: 'JAM' }, place: 2, time: '43.45' },
                    { laneNumber: 4, athlete: { name: 'Runner D', country: 'USA' }, place: 1, time: '43.18' },
                    { laneNumber: 5, athlete: { name: 'Runner E', country: 'BAH' }, place: 4, time: '43.67' },
                    { laneNumber: 6, athlete: { name: 'Runner F', country: 'CAN' }, place: 6, time: '43.92' },
                    { laneNumber: 7, athlete: { name: 'Runner G', country: 'TRI' }, place: 7, time: '44.12' },
                    { laneNumber: 8, athlete: { name: 'Runner H', country: 'BRA' }, place: 8, time: '44.35' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-8-lanes"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  10 Lanes (Major Stadium)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Athlete 1', country: 'USA' }, place: 7, time: '10.12' },
                    { laneNumber: 2, athlete: { name: 'Athlete 2', country: 'JAM' }, place: 4, time: '9.95' },
                    { laneNumber: 3, athlete: { name: 'Athlete 3', country: 'GBR' }, place: 2, time: '9.87' },
                    { laneNumber: 4, athlete: { name: 'Athlete 4', country: 'USA' }, place: 1, time: '9.81' },
                    { laneNumber: 5, athlete: { name: 'Athlete 5', country: 'JAM' }, place: 3, time: '9.91' },
                    { laneNumber: 6, athlete: { name: 'Athlete 6', country: 'CAN' }, place: 5, time: '10.01' },
                    { laneNumber: 7, athlete: { name: 'Athlete 7', country: 'TRI' }, place: 6, time: '10.08' },
                    { laneNumber: 8, athlete: { name: 'Athlete 8', country: 'BRA' }, place: 8, time: '10.18' },
                    { laneNumber: 9, athlete: { name: 'Athlete 9', country: 'FRA' }, place: 9, time: '10.23' },
                    { laneNumber: 10, athlete: { name: 'Athlete 10', country: 'GER' }, place: 10, time: '10.31' },
                  ]}
                  totalLanes={10}
                  showTimes={true}
                  size="compact"
                  data-testid="lane-viz-10-lanes"
                />
              </div>
            </div>
          </div>

          {/* Empty Lanes */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Empty Lanes (Scratches/DNF)
            </h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Mixed - Some Empty Lanes
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 2, athlete: { name: 'Fraser-Pryce, Shelly-Ann', country: 'JAM' }, place: 1, time: '10.65' },
                    { laneNumber: 4, athlete: { name: 'Thompson, Elaine', country: 'JAM' }, place: 2, time: '10.73' },
                    { laneNumber: 5, athlete: { name: 'Jackson, Shericka', country: 'JAM' }, place: 3, time: '10.81' },
                    { laneNumber: 7, athlete: { name: 'Hobbs, Aleia', country: 'USA' }, place: 4, time: '10.92' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-empty-lanes"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Pre-Race with Scratches
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Runner A', country: 'USA', bibNumber: '101' } },
                    { laneNumber: 3, athlete: { name: 'Runner C', country: 'JAM', bibNumber: '103' } },
                    { laneNumber: 4, athlete: { name: 'Runner D', country: 'GBR', bibNumber: '104' } },
                    { laneNumber: 6, athlete: { name: 'Runner F', country: 'CAN', bibNumber: '106' } },
                    { laneNumber: 8, athlete: { name: 'Runner H', country: 'AUS', bibNumber: '108' } },
                  ]}
                  totalLanes={8}
                  showProgress={false}
                  showTimes={false}
                  size="standard"
                  data-testid="lane-viz-scratches"
                />
              </div>
            </div>
          </div>

          {/* Real-World Event Examples */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Real-World Event Examples
            </h2>
            
            <div className="space-y-6">
              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-warning))] mb-4 text-center">
                  100m DASH - OLYMPIC FINAL
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Mullings, Steve', country: 'JAM', bibNumber: '1601' }, place: 7, time: '10.00' },
                    { laneNumber: 2, athlete: { name: 'Powell, Asafa', country: 'JAM', bibNumber: '1234' }, place: 4, time: '9.91' },
                    { laneNumber: 3, athlete: { name: 'Gay, Tyson', country: 'USA', bibNumber: '2345' }, place: 2, time: '9.71' },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM', bibNumber: '2163' }, place: 1, time: '9.63' },
                    { laneNumber: 5, athlete: { name: 'Blake, Yohan', country: 'JAM', bibNumber: '3456' }, place: 3, time: '9.75' },
                    { laneNumber: 6, athlete: { name: 'Gatlin, Justin', country: 'USA', bibNumber: '4567' }, place: 5, time: '9.93' },
                    { laneNumber: 7, athlete: { name: 'Thompson, Richard', country: 'TRI', bibNumber: '5678' }, place: 6, time: '9.98' },
                    { laneNumber: 8, athlete: { name: 'Bailey, Ryan', country: 'USA', bibNumber: '6789' }, place: 8, time: '10.03' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="expanded"
                  data-testid="lane-viz-100m-final"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-warning))] mb-4 text-center">
                  200m DASH - WORLD RECORD RACE
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Spearmon, Wallace', country: 'USA' }, place: 5, time: '20.05' },
                    { laneNumber: 4, athlete: { name: 'Crawford, Shawn', country: 'USA' }, place: 2, time: '19.79' },
                    { laneNumber: 5, athlete: { name: 'Bolt, Usain', country: 'JAM' }, place: 1, time: '19.19' },
                    { laneNumber: 6, athlete: { name: 'Dix, Walter', country: 'USA' }, place: 3, time: '19.98' },
                    { laneNumber: 7, athlete: { name: 'Martina, Churandy', country: 'NED' }, place: 4, time: '20.01' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-200m-final"
                />
              </div>

              <div className="bg-[hsl(var(--display-border))] p-8 rounded-md">
                <h3 className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-warning))] mb-4 text-center">
                  400m HURDLES - CHAMPIONSHIP RACE
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Warholm, Karsten', country: 'NOR' }, place: 1, time: '46.70' },
                    { laneNumber: 2, athlete: { name: 'Benjamin, Rai', country: 'USA' }, place: 2, time: '46.89' },
                    { laneNumber: 3, athlete: { name: 'Dos Santos, Alison', country: 'BRA' }, place: 3, time: '47.08' },
                    { laneNumber: 4, athlete: { name: 'Samba, Abderrahman', country: 'QAT' }, place: 4, time: '47.12' },
                    { laneNumber: 5, athlete: { name: 'McMaster, Kyron', country: 'IVB' }, place: 5, time: '47.34' },
                    { laneNumber: 6, athlete: { name: 'Sánchez, Jaheel', country: 'JAM' }, place: 6, time: '47.81' },
                  ]}
                  totalLanes={8}
                  showTimes={true}
                  size="standard"
                  data-testid="lane-viz-400h-final"
                />
              </div>
            </div>
          </div>

          {/* Live Race Animation Concept */}
          <div className="mb-12">
            <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
              Live Race Progress States
            </h2>
            <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
              Position markers move along track as race progresses (0-100%)
            </p>
            
            <div className="space-y-8">
              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Start (10% Progress)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Blake, Yohan', country: 'JAM' }, position: 8 },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, position: 10 },
                    { laneNumber: 5, athlete: { name: 'Gatlin, Justin', country: 'USA' }, position: 9 },
                    { laneNumber: 6, athlete: { name: 'Gay, Tyson', country: 'USA' }, position: 11 },
                  ]}
                  totalLanes={8}
                  showProgress={true}
                  size="standard"
                  data-testid="lane-viz-start"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Midway (50% Progress)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Blake, Yohan', country: 'JAM' }, position: 48 },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, position: 52 },
                    { laneNumber: 5, athlete: { name: 'Gatlin, Justin', country: 'USA' }, position: 50 },
                    { laneNumber: 6, athlete: { name: 'Gay, Tyson', country: 'USA' }, position: 49 },
                  ]}
                  totalLanes={8}
                  showProgress={true}
                  size="standard"
                  data-testid="lane-viz-midway"
                />
              </div>

              <div>
                <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-muted))] mb-2">
                  Near Finish (90% Progress)
                </h3>
                <LaneVisualization
                  lanes={[
                    { laneNumber: 3, athlete: { name: 'Blake, Yohan', country: 'JAM' }, position: 88 },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, position: 92 },
                    { laneNumber: 5, athlete: { name: 'Gatlin, Justin', country: 'USA' }, position: 89 },
                    { laneNumber: 6, athlete: { name: 'Gay, Tyson', country: 'USA' }, position: 90 },
                  ]}
                  totalLanes={8}
                  showProgress={true}
                  size="standard"
                  data-testid="lane-viz-finish"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Gradient Edge Styling Examples */}
        <section className="border-t-4 border-[hsl(var(--display-accent))] pt-12">
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4 text-center">
            Gradient Edge Styling
          </h1>
          <p className="text-[32px] text-[hsl(var(--display-muted))] text-center mb-12">
            Blue gradient edges for professional stadium display aesthetic
          </p>
          
          <div className="space-y-12">
            {/* AthleteCard with gradient edge */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Athlete Cards with Blue Edges
              </h2>
              <div className="flex gap-4 flex-wrap">
                <div className="gradient-edge-blue rounded-lg p-1" data-testid="gradient-example-normal">
                  <AthleteCard
                    athlete={{
                      id: '10',
                      name: 'Bolt, Usain',
                      bibNumber: '1234',
                      teamName: 'Jamaica',
                      country: 'JAM',
                      photoUrl: null,
                    }}
                    result={{ place: 1, time: '9.58' }}
                    size="medium"
                  />
                </div>
                
                <div className="gradient-edge-blue-thick rounded-lg p-1" data-testid="gradient-example-thick">
                  <AthleteCard
                    athlete={{
                      id: '11',
                      name: 'Blake, Yohan',
                      bibNumber: '5678',
                      teamName: 'Jamaica',
                      country: 'JAM',
                      photoUrl: null,
                    }}
                    result={{ place: 2, time: '9.69' }}
                    size="medium"
                  />
                </div>
                
                <div className="gradient-edge-blue-glow rounded-lg p-1" data-testid="gradient-example-glow">
                  <AthleteCard
                    athlete={{
                      id: '12',
                      name: 'Gatlin, Justin',
                      bibNumber: '9012',
                      teamName: 'USA',
                      country: 'USA',
                      photoUrl: null,
                    }}
                    result={{ place: 3, time: '9.79' }}
                    size="medium"
                    highlighted
                  />
                </div>
              </div>
            </div>
            
            {/* LiveTimer with gradient edge */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Timer with Blue Edge
              </h2>
              <div className="gradient-edge-blue-glow rounded-lg p-4 inline-block" data-testid="gradient-timer-glow">
                <LiveTimer mode="countdown" time={45000} label="Race starts in" size="medium" />
              </div>
            </div>
            
            {/* Lane Visualization with gradient edge */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Lane Display with Blue Edge
              </h2>
              <div className="gradient-edge-blue rounded-lg p-4" data-testid="gradient-lane-viz">
                <LaneVisualization
                  lanes={[
                    { laneNumber: 1, athlete: { name: 'Smith, John', country: 'USA' }, place: 1, time: '10.05' },
                    { laneNumber: 4, athlete: { name: 'Bolt, Usain', country: 'JAM' }, place: 2, time: '10.12' },
                  ]}
                  totalLanes={6}
                  showTimes
                />
              </div>
            </div>

            {/* Different Variants Comparison */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Variant Comparison
              </h2>
              <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
                Three border variants: Normal (2px), Thick (4px), Glow (3px + shadow)
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-fg))] mb-3">
                    Normal (2px border)
                  </h3>
                  <div className="gradient-edge-blue rounded-lg p-4">
                    <div className="text-[24px] font-stadium text-[hsl(var(--display-fg))] text-center">
                      Subtle Accent
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-fg))] mb-3">
                    Thick (4px border)
                  </h3>
                  <div className="gradient-edge-blue-thick rounded-lg p-4">
                    <div className="text-[24px] font-stadium text-[hsl(var(--display-fg))] text-center">
                      More Prominent
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-stadium text-[28px] font-[600] text-[hsl(var(--display-fg))] mb-3">
                    Glow (3px + shadow)
                  </h3>
                  <div className="gradient-edge-blue-glow rounded-lg p-4">
                    <div className="text-[24px] font-stadium text-[hsl(var(--display-fg))] text-center">
                      Featured Content
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AttemptTracker with gradient edge */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Attempt Tracker with Blue Edge
              </h2>
              <div className="gradient-edge-blue-thick rounded-lg p-6" data-testid="gradient-attempt-tracker">
                <AttemptTracker
                  attempts={[
                    { result: 'made', mark: '7.42m' },
                    { result: 'fault' },
                    { result: 'made', mark: '7.65m' },
                    { result: 'pass' },
                    { result: 'made', mark: '7.81m' },
                    { result: 'fault' },
                  ]}
                  size="large"
                  showMarks={true}
                />
              </div>
            </div>

            {/* Nested Example */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Composite Layout Example
              </h2>
              <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
                Multiple components with gradient edges in a professional layout
              </p>
              
              <div className="gradient-edge-blue-thick rounded-lg p-8">
                <h3 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-warning))] mb-6 text-center">
                  MEN'S 100M - FINAL RESULTS
                </h3>
                
                <div className="space-y-4">
                  <div className="gradient-edge-blue-glow rounded-lg p-2">
                    <AthleteCard
                      athlete={{
                        id: '20',
                        name: 'Bolt, Usain',
                        bibNumber: '2163',
                        teamName: 'Jamaica',
                        country: 'JAM',
                        photoUrl: null,
                      }}
                      result={{ place: 1, time: '9.58' }}
                      size="large"
                    />
                  </div>
                  
                  <div className="gradient-edge-blue rounded-lg p-2">
                    <AthleteCard
                      athlete={{
                        id: '21',
                        name: 'Blake, Yohan',
                        bibNumber: '2164',
                        teamName: 'Jamaica',
                        country: 'JAM',
                        photoUrl: null,
                      }}
                      result={{ place: 2, time: '9.69' }}
                      size="medium"
                    />
                  </div>
                  
                  <div className="gradient-edge-blue rounded-lg p-2">
                    <AthleteCard
                      athlete={{
                        id: '22',
                        name: 'Gatlin, Justin',
                        bibNumber: '2165',
                        teamName: 'USA',
                        country: 'USA',
                        photoUrl: null,
                      }}
                      result={{ place: 3, time: '9.79' }}
                      size="medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Yellow Accent Box Examples */}
        <section className="border-t-4 border-[hsl(var(--display-accent))] pt-12">
          <h1 className="font-stadium text-[72px] font-[900] text-[hsl(var(--display-fg))] mb-4 text-center">
            Yellow Accent Highlighting
          </h1>
          <p className="text-[32px] text-[hsl(var(--display-muted))] text-center mb-12">
            Yellow accent boxes for highlighting active/current data
          </p>
          
          <div className="space-y-12">
            {/* Athlete Cards with yellow accents */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Current Competitor Highlight
              </h2>
              <div className="flex gap-4 flex-wrap">
                <AthleteCard
                  athlete={{
                    id: '30',
                    name: 'Previous',
                    teamName: 'Team A',
                    bibNumber: '100',
                    country: null,
                    photoUrl: null,
                  }}
                  result={{ place: null, mark: '7.42m' }}
                  size="medium"
                  data-testid="yellow-example-previous"
                />
                
                <div className="accent-box-yellow rounded-lg p-2" data-testid="yellow-wrapper-current">
                  <AthleteCard
                    athlete={{
                      id: '31',
                      name: 'Current Competitor',
                      teamName: 'Team B',
                      bibNumber: '101',
                      country: 'USA',
                      photoUrl: null,
                    }}
                    result={{ place: null, mark: '7.65m' }}
                    size="medium"
                    data-testid="yellow-example-current"
                  />
                </div>
                
                <AthleteCard
                  athlete={{
                    id: '32',
                    name: 'Up Next',
                    teamName: 'Team C',
                    bibNumber: '102',
                    country: null,
                    photoUrl: null,
                  }}
                  result={{ place: null, mark: null }}
                  size="medium"
                  data-testid="yellow-example-next"
                />
              </div>
            </div>
            
            {/* Live timer with yellow accent */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Active Timer (Pulsing)
              </h2>
              <div className="accent-box-yellow-pulse rounded-lg p-4 inline-block" data-testid="yellow-timer-pulse">
                <LiveTimer mode="stopwatch" time={12340} running label="Race in Progress" size="medium" showMillis />
              </div>
            </div>
            
            {/* Attempt tracker with yellow accent on current */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Current Attempt Highlight
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-stadium text-[24px] text-[hsl(var(--display-fg))] w-[300px]">Johnson, Michael</span>
                  <AttemptTracker
                    attempts={[
                      { result: 'made', mark: '7.42m' },
                      { result: 'fault' },
                      { result: 'made', mark: '7.65m' },
                    ]}
                    maxAttempts={6}
                    showMarks
                    size="medium"
                    data-testid="yellow-tracker-previous"
                  />
                </div>
                
                <div className="accent-box-yellow rounded-lg p-3" data-testid="yellow-wrapper-attempt">
                  <div className="flex items-center gap-4">
                    <span className="font-stadium text-[24px] text-[hsl(var(--display-fg))] w-[300px]">Smith, Sarah (NOW)</span>
                    <AttemptTracker
                      attempts={[
                        { result: 'made', mark: '7.21m' },
                        { result: 'pass' },
                      ]}
                      maxAttempts={6}
                      showMarks
                      size="medium"
                      data-testid="yellow-tracker-current"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Variants comparison */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Yellow Accent Variants
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="accent-box-yellow rounded-lg p-6 text-center" data-testid="yellow-variant-subtle">
                  <div className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-fg))]">Subtle</div>
                  <div className="text-[20px] text-[hsl(var(--display-muted))] mt-2">accent-box-yellow</div>
                  <div className="text-[16px] text-[hsl(var(--display-muted))] mt-4">Gentle highlighting without distraction</div>
                </div>
                
                <div className="accent-box-yellow-solid rounded-lg p-6 text-center" data-testid="yellow-variant-solid">
                  <div className="font-stadium text-[32px] font-[700]">Solid</div>
                  <div className="text-[20px] mt-2">accent-box-yellow-solid</div>
                  <div className="text-[16px] mt-4">Maximum visibility for important alerts</div>
                </div>
                
                <div className="accent-box-yellow-pulse rounded-lg p-6 text-center" data-testid="yellow-variant-pulse">
                  <div className="font-stadium text-[32px] font-[700] text-[hsl(var(--display-fg))]">Pulsing</div>
                  <div className="text-[20px] text-[hsl(var(--display-muted))] mt-2">accent-box-yellow-pulse</div>
                  <div className="text-[16px] text-[hsl(var(--display-muted))] mt-4">Animated attention for live content</div>
                </div>
              </div>
            </div>
            
            {/* Combo: Gradient + Yellow */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Combined: Yellow Gradient Edge
              </h2>
              <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
                Yellow gradient border alternative to blue edge styling
              </p>
              <div className="gradient-yellow-combo rounded-lg p-6" data-testid="yellow-gradient-combo">
                <LaneVisualization
                  lanes={[
                    { laneNumber: 4, athlete: { name: 'Current Leader', country: 'USA' }, position: 95, place: null, time: null },
                    { laneNumber: 5, athlete: { name: 'Second Place', country: 'JAM' }, position: 92, place: null, time: null },
                  ]}
                  totalLanes={6}
                  showProgress
                  data-testid="yellow-lane-viz"
                />
              </div>
            </div>

            {/* Real-world usage example */}
            <div>
              <h2 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-accent))] mb-6">
                Real-World Usage Example
              </h2>
              <p className="text-[24px] text-[hsl(var(--display-muted))] mb-6">
                Field event display showing current athlete taking attempt
              </p>
              
              <div className="gradient-edge-blue-thick rounded-lg p-8" data-testid="yellow-real-world">
                <h3 className="font-stadium text-[48px] font-[700] text-[hsl(var(--display-warning))] mb-6 text-center">
                  WOMEN'S LONG JUMP - FINAL
                </h3>
                
                <div className="space-y-4">
                  <div className="gradient-edge-blue rounded-lg p-2">
                    <AthleteCard
                      athlete={{
                        id: '40',
                        name: 'Williams, Sarah',
                        bibNumber: '245',
                        teamName: 'United States',
                        country: 'USA',
                        photoUrl: null,
                      }}
                      result={{ place: 1, mark: '7.81m' }}
                      size="medium"
                    />
                  </div>
                  
                  <div className="accent-box-yellow-pulse rounded-lg p-2">
                    <AthleteCard
                      athlete={{
                        id: '41',
                        name: 'Johnson, Emma',
                        bibNumber: '156',
                        teamName: 'Jamaica',
                        country: 'JAM',
                        photoUrl: null,
                      }}
                      result={{ place: 2, mark: '7.65m' }}
                      size="medium"
                    />
                  </div>
                  
                  <div className="gradient-edge-blue rounded-lg p-2">
                    <AthleteCard
                      athlete={{
                        id: '42',
                        name: 'Chen, Li',
                        bibNumber: '789',
                        teamName: 'China',
                        country: 'CHN',
                        photoUrl: null,
                      }}
                      result={{ place: 3, mark: '7.42m' }}
                      size="medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
