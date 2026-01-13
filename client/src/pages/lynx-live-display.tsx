import { useLynxData } from "@/contexts/LynxDataContext";

export default function LynxLiveDisplay() {
  const { page, clock, clockRunning, layoutCommand, isConnected } = useLynxData();

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden" style={{ fontFamily: "'Roboto Condensed', 'Arial Narrow', sans-serif" }}>
      <div className="h-full flex flex-col p-6">
        <header className="flex justify-between items-center mb-4 px-4">
          <div className="text-4xl font-bold">
            {page?.header?.eventName || layoutCommand || 'Waiting for data...'}
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-6xl font-mono tabular-nums ${clockRunning ? 'text-yellow-400' : 'text-white'}`}>
              {clock}
            </div>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </header>

        {page?.header?.wind && (
          <div className="text-2xl text-gray-400 px-4 mb-2">
            Wind: {page.header.wind} m/s
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {(!page || page.entries.length === 0) ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-3xl mb-2">Mode: {page?.mode || 'idle'}</p>
                <p className="text-xl">Waiting for athlete data...</p>
                <p className="text-sm mt-4 text-gray-600">
                  {isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              {page.entries.map((entry, index) => (
                <div 
                  key={entry.line ?? index}
                  className="flex items-center px-4 py-3 rounded"
                  style={{
                    background: index % 2 === 0 
                      ? 'linear-gradient(90deg, rgba(0, 100, 180, 0.6) 0%, rgba(0, 100, 180, 0.3) 70%, transparent 100%)'
                      : 'linear-gradient(90deg, rgba(0, 80, 140, 0.5) 0%, rgba(0, 80, 140, 0.2) 70%, transparent 100%)'
                  }}
                >
                  <div className="w-16 text-3xl font-black text-yellow-400">
                    {entry.place || entry.lane || '-'}
                  </div>
                  
                  <div className="w-20 text-2xl text-gray-400">
                    {entry.lane && `Ln ${entry.lane}`}
                  </div>

                  <div className="flex-1">
                    <div className="text-2xl font-bold">{entry.name || 'Unknown'}</div>
                    <div className="text-lg text-gray-400">{entry.affiliation || ''}</div>
                  </div>

                  <div className="text-right">
                    {entry.time && (
                      <div className="text-3xl font-mono tabular-nums text-yellow-400">
                        {entry.time}
                      </div>
                    )}
                    {entry.deltaTime && (
                      <div className="text-lg text-gray-400">
                        {entry.deltaTime}
                      </div>
                    )}
                    {entry.reactionTime && (
                      <div className="text-sm text-gray-500">
                        RT: {entry.reactionTime}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="text-center text-gray-600 text-sm mt-4">
          {page?.mode && <span>Mode: {page.mode}</span>}
          {page?.header?.heatNumber && <span className="ml-4">Heat {page.header.heatNumber}</span>}
          {page?.header?.roundNumber && <span className="ml-4">Round {page.header.roundNumber}</span>}
        </footer>
      </div>
    </div>
  );
}
