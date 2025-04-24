import { AppError } from '../middleware/errorHandler';
import { logger } from '../util/logger';

/**
 * Response structure from Nominatim API
 */
interface NominatimResponse {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        road?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        [key: string]: string | undefined;
    };
}

/**
 * Response structure for geocoding results
 */
export interface GeocodingResult {
    latitude: number;
    longitude: number;
    displayName: string;
}

export class GeocodingService {
    private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
    private readonly userAgent = 'PhotoComp_App/1.0'; // Required by Nominatim terms of use

    /**
     * Converts an address string to latitude and longitude coordinates
     *
     * @param address The address to geocode
     * @returns Promise resolving to geocoding result with coordinates and display name
     * @throws AppError if geocoding fails or no results found
     */
    async geocodeAddress(address: string): Promise<GeocodingResult> {
        try {
            if (!address || address.trim() === '') {
                throw new AppError('Address is required', 400);
            }

            // Build URL with query parameters
            const url = new URL(this.baseUrl);
            url.searchParams.append('q', address);
            url.searchParams.append('format', 'json');
            url.searchParams.append('addressdetails', '1');
            url.searchParams.append('limit', '1');

            // Make the request to Nominatim API
            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            });

            if (!response.ok) {
                throw new AppError(`Geocoding service error: ${response.statusText}`, 500);
            }

            const data = (await response.json()) as NominatimResponse[];

            // Check if we got valid results
            if (!data || data.length === 0) {
                throw new AppError('No results found for the provided address', 404);
            }

            const result = data[0];

            // Parse latitude and longitude as floating point numbers
            const latitude = parseFloat(result.lat);
            const longitude = parseFloat(result.lon);

            if (isNaN(latitude) || isNaN(longitude)) {
                throw new AppError('Invalid coordinates received from geocoding service', 500);
            }

            logger.info(
                `Successfully geocoded address: "${address}" to lat=${latitude}, lon=${longitude}`
            );

            return {
                latitude,
                longitude,
                displayName: result.display_name,
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            logger.error('Geocoding error:', error);
            throw new AppError(`Failed to geocode address: ${(error as Error).message}`, 500);
        }
    }
}
