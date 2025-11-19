import { storage } from './storage';
import { nanoid } from 'nanoid';
import type { WeatherReading } from '@shared/schema';

const activePollers = new Map<string, NodeJS.Timeout>();
const inflightRequests = new Map<string, boolean>(); // Track in-flight API calls

export async function startWeatherPolling(meetId: string, broadcastFn: (data: any) => void) {
  // Stop existing poller if any
  stopWeatherPolling(meetId);
  
  const config = await storage.getWeatherConfig(meetId);
  if (!config) {
    console.log(`No weather config for meet ${meetId}`);
    return;
  }
  
  const poll = async () => {
    // Skip if already polling
    if (inflightRequests.get(meetId)) {
      console.log(`Skipping weather poll for meet ${meetId} - request already in flight`);
      return;
    }
    
    inflightRequests.set(meetId, true);
    
    try {
      const reading = await fetchWeatherData(config);
      await storage.addWeatherReading(reading);
      
      // Broadcast update
      broadcastFn({
        type: 'weather_update',
        meetId,
        reading
      });
      
      console.log(`Weather updated for meet ${meetId}: ${reading.temperatureC}°C, wind ${reading.windSpeedMs}m/s`);
    } catch (error) {
      console.error(`Weather polling error for meet ${meetId}:`, error);
    } finally {
      inflightRequests.delete(meetId);
    }
  };
  
  // Immediate first poll
  poll();
  
  // Set up interval
  const interval = setInterval(poll, config.pollingIntervalSec * 1000);
  activePollers.set(meetId, interval);
}

export function stopWeatherPolling(meetId: string) {
  const interval = activePollers.get(meetId);
  if (interval) {
    clearInterval(interval);
    activePollers.delete(meetId);
    inflightRequests.delete(meetId); // Clean up in-flight tracking
    console.log(`Stopped weather polling for meet ${meetId}`);
  }
}

async function fetchWeatherData(config: any): Promise<WeatherReading> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${config.latitude}&lon=${config.longitude}&appid=${config.apiKey}&units=${config.units}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenWeatherMap API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    id: nanoid(),
    meetId: config.meetId,
    provider: config.provider,
    observedAt: new Date(),
    temperatureC: config.units === 'metric' ? data.main.temp : (data.main.temp - 32) * 5 / 9,
    windSpeedMs: config.units === 'metric' ? data.wind.speed : data.wind.speed * 0.44704,
    windDirectionDeg: data.wind.deg || 0,
    humidityPct: data.main.humidity,
    pressureHPa: data.main.pressure,
    precipitationMm: data.rain?.['1h'] || null,
    rawData: data
  };
}
