import { useState, useEffect } from "react";
import { Event, Athlete, Team } from "@shared/schema";

interface FieldEventData {
  event: Event;
  currentAthlete?: Athlete;
  currentAttempt?: number;
  currentMark?: string;
  currentMarkFeet?: string;
  currentHeight?: string;
  attempts?: string[];
  standings: Array<{
    place: number;
    athlete: Athlete;
    mark: string;
    logo?: string;
  }>;
}

interface TrackEventData {
  event: Event;
  results: Array<{
    place: number;
    athlete: Athlete;
    time: string;
    logo?: string;
  }>;
}

interface TeamScoreData {
  team: Team;
  score: number;
  logo?: string;
}

interface MasterScoreboardProps {
  trackEvent?: TrackEventData;
  fieldEvents?: FieldEventData[];
  mensTeamScores?: TeamScoreData[];
  womensTeamScores?: TeamScoreData[];
  meetLogo?: string;
}

function AthletePhoto({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [imgError, setImgError] = useState(false);
  
  if (!src || imgError) {
    return (
      <div className={`bg-gray-700 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-xs">No Photo</span>
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`object-cover ${className}`}
      onError={() => setImgError(true)}
    />
  );
}

function TeamLogo({ teamName, className = "" }: { teamName?: string; className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string>("/logos/NCAA/0.png");
  
  useEffect(() => {
    if (teamName) {
      fetch(`/api/ncaa-logo?team=${encodeURIComponent(teamName)}`)
        .then(res => res.json())
        .then(data => {
          if (data.logoPath) {
            setLogoUrl(data.logoPath);
          }
        })
        .catch(() => {});
    }
  }, [teamName]);
  
  return (
    <img 
      src={logoUrl} 
      alt={teamName || "Team"} 
      className={`object-contain ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "/logos/NCAA/0.png";
      }}
    />
  );
}

function FieldEventCard({ 
  eventName, 
  athleteName, 
  schoolName, 
  place,
  photoUrl,
  teamName
}: { 
  eventName: string;
  athleteName: string;
  schoolName: string;
  place: number | string;
  photoUrl?: string;
  teamName?: string;
}) {
  return (
    <div className="bg-black border border-gray-700 flex flex-col">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-2 py-1 text-center border-b border-gray-600">
        <span className="text-white font-bold text-sm uppercase tracking-wide">{eventName}</span>
      </div>
      <div className="flex p-2 gap-2">
        <AthletePhoto src={photoUrl} alt={athleteName} className="w-16 h-20 rounded" />
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-white font-bold text-lg leading-tight">{athleteName}</div>
          <div className="text-gray-300 text-sm">{schoolName}</div>
          <div className="text-white text-sm">Place: {place}</div>
        </div>
        <div className="flex items-center">
          <TeamLogo teamName={teamName || schoolName} className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
}

function AttemptBox({ 
  label, 
  value, 
  subValue 
}: { 
  label: string; 
  value: string; 
  subValue?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-600 p-2 text-center">
      <div className="text-gray-400 text-xs uppercase">{label}</div>
      <div className="text-white font-bold text-xl">{value}</div>
      {subValue && (
        <div className="text-cyan-400 text-sm font-mono">{subValue}</div>
      )}
    </div>
  );
}

function HeightBox({ 
  height, 
  attempts 
}: { 
  height: string; 
  attempts: string[];
}) {
  return (
    <div className="bg-gray-900 border border-gray-600 p-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-400 text-xs uppercase">Height:</span>
        <span className="text-white font-bold text-lg">{height}</span>
      </div>
      <div className="flex gap-1 justify-center">
        {attempts.map((attempt, idx) => (
          <span 
            key={idx} 
            className={`text-2xl font-bold ${
              attempt === 'O' ? 'text-green-500' : 
              attempt === 'X' ? 'text-red-500' : 
              'text-gray-500'
            }`}
          >
            {attempt}
          </span>
        ))}
      </div>
    </div>
  );
}

function StandingsList({ 
  title, 
  standings 
}: { 
  title: string; 
  standings: Array<{ place: number; name: string; mark: string; teamName?: string }>;
}) {
  return (
    <div className="bg-black border border-gray-700 flex flex-col h-full">
      <div className="bg-gray-800 px-2 py-1 text-center border-b border-gray-600">
        <span className="text-white font-bold text-xs uppercase">{title}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        {standings.map((item, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-1 px-1 py-0.5 border-b border-gray-800 text-xs"
          >
            <span className="text-yellow-400 font-bold w-4">{item.place}</span>
            <TeamLogo teamName={item.teamName} className="w-5 h-5" />
            <span className="text-white flex-1 truncate">{item.name}</span>
            <span className="text-cyan-400 font-mono">{item.mark}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamScoresList({ 
  title 
}: { 
  title: string;
}) {
  return (
    <div className="bg-black border border-gray-700 flex flex-col h-full">
      <div className="bg-gray-800 px-2 py-1 text-center border-b border-gray-600">
        <span className="text-white font-bold text-xs uppercase">{title}</span>
      </div>
      <div className="flex-1" />
    </div>
  );
}

export function MasterScoreboard({ 
  trackEvent,
  fieldEvents = [],
  mensTeamScores = [],
  womensTeamScores = []
}: MasterScoreboardProps) {
  // Demo data for display
  const demoTrackResults = [
    { place: 1, name: "Enrique Torres", time: "8:47.57", teamName: "Navy" },
    { place: 2, name: "Davia Rodriguez", time: "8:52.03", teamName: "Army" },
    { place: 3, name: "Brad Hansen", time: "8:52.75", teamName: "Air Force" },
    { place: 4, name: "Brian Henstorf", time: "8:54.38", teamName: "Navy" },
    { place: 5, name: "Paul Wellman", time: "8:54.96", teamName: "Army" },
    { place: 6, name: "Tony Trueba", time: "8:56.24", teamName: "Navy" },
    { place: 7, name: "Daniel Embaye", time: "8:57.46", teamName: "Army" },
    { place: 8, name: "Juan Pablo Miramonte", time: "8:57.67", teamName: "Air Force" },
  ];

  const demoFieldEvent1 = {
    eventName: "Men Weight Throw",
    athleteName: "Joshua Boamah",
    schoolName: "Navy",
    place: 1,
    attempt: 6,
    mark: "20.11",
    markFeet: "65-11.75"
  };

  const demoFieldEvent2 = {
    eventName: "Women High Jump",
    athleteName: "Gabriel Nwaete",
    schoolName: "Mount St. Mary's",
    place: 1,
    height: "1.80",
    attempts: ["X", "X", "O"]
  };

  const demoFieldEvent3 = {
    eventName: "Men High Jump",
    athleteName: "Benjemen Schneider",
    schoolName: "Navy",
    place: 1,
    height: "2.14",
    attempts: ["X", "X", "X"]
  };

  const demoMenWT = [
    { place: 1, name: "Boamah", mark: "20.11", teamName: "Navy" },
    { place: 2, name: "Smith", mark: "19.74", teamName: "Army" },
    { place: 3, name: "Kwatkosky", mark: "18.96", teamName: "Navy" },
    { place: 4, name: "Greene", mark: "18.46", teamName: "Air Force" },
    { place: 5, name: "Manse", mark: "15.64", teamName: "Army" },
    { place: 6, name: "Nwosu", mark: "15.42", teamName: "Navy" },
  ];

  const demoWomenWT = [
    { place: 1, name: "Ragazzini", mark: "17.96", teamName: "Bucknell" },
    { place: 2, name: "Antwi", mark: "17.72", teamName: "Navy" },
    { place: 3, name: "Nicholas", mark: "17.36", teamName: "Army" },
    { place: 4, name: "Hutchinson", mark: "16.48", teamName: "Navy" },
    { place: 5, name: "Dykstra", mark: "15.96", teamName: "Air Force" },
    { place: 6, name: "Hulstein", mark: "15.15", teamName: "Army" },
  ];

  const demoWomenHJ = [
    { place: 1, name: "Lowenstein", mark: "1.70", teamName: "Navy" },
    { place: 2, name: "Cantu", mark: "1.65", teamName: "Army" },
    { place: 3, name: "Chapman", mark: "1.65", teamName: "Air Force" },
    { place: 4, name: "Palchak", mark: "1.60", teamName: "Navy" },
    { place: 5, name: "Whaley", mark: "1.60", teamName: "Army" },
    { place: 6, name: "Sokol", mark: "1.55", teamName: "Bucknell" },
  ];

  const demoMenHJ = [
    { place: 1, name: "Schneider", mark: "2.10", teamName: "Navy" },
    { place: 2, name: "Wilson", mark: "2.05", teamName: "Navy" },
    { place: 3, name: "Estes", mark: "2.00", teamName: "Army" },
    { place: 4, name: "Bryant", mark: "2.00", teamName: "Air Force" },
    { place: 5, name: "Hernandez", mark: "1.95", teamName: "Navy" },
    { place: 6, name: "Hyatt", mark: "1.90", teamName: "Army" },
  ];

  return (
    <div className="w-full h-full bg-black text-white font-sans flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex gap-1 p-1">
        {/* Left Column - Track Results */}
        <div className="w-[45%] flex flex-col">
          <div className="bg-black px-3 py-2">
            <h1 className="text-white font-bold text-3xl tracking-tight">Boys 3000 Meter</h1>
          </div>
          <div className="flex-1 flex flex-col">
            {demoTrackResults.map((result, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 px-2 py-1 border-b border-gray-800"
                style={{
                  background: `linear-gradient(90deg, 
                    rgba(0,100,150,${0.8 - idx * 0.05}) 0%, 
                    rgba(0,80,120,${0.6 - idx * 0.05}) 100%)`
                }}
              >
                <span className="text-white font-bold text-2xl w-8 text-center">{result.place}</span>
                <TeamLogo teamName={result.teamName} className="w-8 h-8" />
                <span className="text-yellow-400 text-lg">*</span>
                <span className="text-white font-bold text-xl flex-1">{result.name}</span>
                <span className="text-yellow-400 font-bold text-2xl font-mono">{result.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Field Events */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Top Row - Two Field Event Cards */}
          <div className="flex gap-1">
            <div className="flex-1">
              <FieldEventCard 
                eventName={demoFieldEvent1.eventName}
                athleteName={demoFieldEvent1.athleteName}
                schoolName={demoFieldEvent1.schoolName}
                place={demoFieldEvent1.place}
                teamName="Navy"
              />
              <div className="flex gap-1 mt-1">
                <AttemptBox label="Attempt" value={`# ${demoFieldEvent1.attempt}`} />
                <AttemptBox 
                  label="" 
                  value={demoFieldEvent1.mark} 
                  subValue={demoFieldEvent1.markFeet}
                />
              </div>
            </div>
            <div className="flex-1">
              <FieldEventCard 
                eventName={demoFieldEvent2.eventName}
                athleteName={demoFieldEvent2.athleteName}
                schoolName={demoFieldEvent2.schoolName}
                place={demoFieldEvent2.place}
                teamName="Mount St. Mary's"
              />
              <div className="mt-1">
                <HeightBox height={demoFieldEvent2.height} attempts={demoFieldEvent2.attempts} />
              </div>
            </div>
          </div>

          {/* Middle Row - Another Field Event */}
          <div className="flex gap-1">
            <div className="flex-1">
              <FieldEventCard 
                eventName={demoFieldEvent3.eventName}
                athleteName={demoFieldEvent3.athleteName}
                schoolName={demoFieldEvent3.schoolName}
                place={demoFieldEvent3.place}
                teamName="Navy"
              />
            </div>
            <div className="flex-1 flex gap-1">
              <AttemptBox label="Attempt" value="#" />
              <HeightBox height={demoFieldEvent3.height} attempts={demoFieldEvent3.attempts} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Standings Lists */}
      <div className="h-40 flex gap-1 p-1">
        <div className="flex-1">
          <StandingsList title="Men Weight Throw" standings={demoMenWT} />
        </div>
        <div className="flex-1">
          <StandingsList title="Women Weight Throw" standings={demoWomenWT} />
        </div>
        <div className="flex-1">
          <StandingsList title="Women High Jump - Jump Off" standings={demoWomenHJ} />
        </div>
        <div className="flex-1">
          <StandingsList title="Men High Jump" standings={demoMenHJ} />
        </div>
        <div className="w-32">
          <TeamScoresList title="Men's Team Scores" />
        </div>
        <div className="w-32">
          <TeamScoresList title="Women's Team Scores" />
        </div>
      </div>
    </div>
  );
}

export default MasterScoreboard;
