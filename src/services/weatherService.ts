import { AppError } from '../middleware/errorHandler';
import { logger } from '../util/logger';

export interface WeatherData {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    precipitation: number;
    weatherDescription: string;
}

interface WeatherApiResponse {
    daily: {
        time: string[];
        temperature_2m_max: number[];
        weathercode: number[];
        precipitation_sum: number[];
        windspeed_10m_max: number[];
    };
}

export class WeatherService {
    private baseUrl = 'https://api.open-meteo.com/v1/forecast';

    /**
     * Get weather data for a specific location and date
     * @param latitude Latitude of the location
     * @param longitude Longitude of the location
     * @param date Date in ISO format (YYYY-MM-DD)
     * @returns Weather data for the specified location and date
     */
    async getWeatherForLocation(
        latitude: number,
        longitude: number,
        date: string
    ): Promise<WeatherData> {
        try {
            // Format date to YYYY-MM-DD if it's a full ISO string
            const formattedDate = date.split('T')[0];

            const url = new URL(this.baseUrl);
            url.searchParams.append('latitude', latitude.toString());
            url.searchParams.append('longitude', longitude.toString());
            url.searchParams.append(
                'daily',
                'temperature_2m_max,weathercode,precipitation_sum,windspeed_10m_max'
            );
            url.searchParams.append('timezone', 'auto');
            url.searchParams.append('start_date', formattedDate);
            url.searchParams.append('end_date', formattedDate);

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new AppError(`Failed to fetch weather data: ${response.statusText}`, 500);
            }

            // Type the response data to match the expected structure
            const data = (await response.json()) as WeatherApiResponse;

            if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
                throw new AppError('Invalid weather data format received', 500);
            }

            const weatherCode = data.daily.weathercode[0];

            return {
                temperature: data.daily.temperature_2m_max[0],
                weatherCode: weatherCode,
                windSpeed: data.daily.windspeed_10m_max[0],
                precipitation: data.daily.precipitation_sum[0],
                weatherDescription: this.getWeatherDescription(weatherCode),
            };
        } catch (error) {
            logger.error('Error fetching weather data:', error);
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(`Failed to get weather data: ${(error as Error).message}`, 500);
        }
    }

    /**
     * Maps a WMO weather code to a human-readable description
     * @param code WMO weather code
     * @returns Human-readable weather description
     */
    private getWeatherDescription(code: number): string {
        // WMO Weather interpretation codes (WW)
        const weatherCodes: Record<number, string> = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail',
        };

        return weatherCodes[code] || 'Unknown';
    }
}
