import { WeatherService } from '../src/services/weatherService';
import { AppError } from '../src/middleware/errorHandler';

// Properly mock fetch at the global level
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('WeatherService', () => {
    let weatherService: WeatherService;

    beforeEach(() => {
        weatherService = new WeatherService();
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    it('should get weather data for a valid location and date', async () => {
        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    daily: {
                        time: ['2025-04-15'],
                        temperature_2m_max: [18.5],
                        weathercode: [1],
                        precipitation_sum: [0.5],
                        windspeed_10m_max: [12.3],
                    },
                }),
        });

        const result = await weatherService.getWeatherForLocation(42.3601, -71.0589, '2025-04-15');

        expect(result).toEqual({
            temperature: 18.5,
            weatherCode: 1,
            windSpeed: 12.3,
            precipitation: 0.5,
            weatherDescription: 'Mainly clear',
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('api.open-meteo.com/v1/forecast')
        );
    });

    it('should handle API errors gracefully', async () => {
        // Mock API error
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
        });

        await expect(
            weatherService.getWeatherForLocation(42.3601, -71.0589, '2025-04-15')
        ).rejects.toThrow('Failed to fetch weather data');

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should return correct weather descriptions based on codes', async () => {
        // Set up the mocks BEFORE making the function calls
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        daily: {
                            time: ['2025-04-15'],
                            temperature_2m_max: [20],
                            weathercode: [0], // Clear sky
                            precipitation_sum: [0],
                            windspeed_10m_max: [5],
                        },
                    }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        daily: {
                            time: ['2025-04-15'],
                            temperature_2m_max: [15],
                            weathercode: [95], // Thunderstorm
                            precipitation_sum: [20],
                            windspeed_10m_max: [25],
                        },
                    }),
            });

        // Now make the function calls after setting up the mocks
        const clearWeather = await weatherService.getWeatherForLocation(1, 1, '2025-04-15');
        const stormWeather = await weatherService.getWeatherForLocation(1, 1, '2025-04-15');

        // Test that different weather codes map to the correct descriptions
        expect(clearWeather.weatherDescription).toBe('Clear sky');
        expect(stormWeather.weatherDescription).toBe('Thunderstorm');
    });

    it('should handle incomplete weather data gracefully', async () => {
        // Mock incomplete API response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    daily: {
                        // Empty arrays for weather data
                        time: ['2025-04-15'],
                        temperature_2m_max: [],
                        weathercode: [],
                        precipitation_sum: [],
                        windspeed_10m_max: [],
                    },
                }),
        });

        const result = await weatherService.getWeatherForLocation(42.3601, -71.0589, '2025-04-15');

        // returns undefined values with "Unknown" weather description
        expect(result).toEqual({
            temperature: undefined,
            weatherCode: undefined,
            windSpeed: undefined,
            precipitation: undefined,
            weatherDescription: 'Unknown',
        });
    });

    it('should handle network errors gracefully', async () => {
        // Mock network error
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(
            weatherService.getWeatherForLocation(42.3601, -71.0589, '2025-04-15')
        ).rejects.toThrow('Failed to get weather data');
    });

    // Add a test for completely missing daily data
    it('should throw error for missing daily data structure', async () => {
        // Mock API response with missing daily structure
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () =>
                Promise.resolve({
                    // No daily property at all
                }),
        });

        await expect(
            weatherService.getWeatherForLocation(42.3601, -71.0589, '2025-04-15')
        ).rejects.toThrow('Invalid weather data format');
    });
});
