# Weather Service for Events

## Overview

The PhotoComp API now includes weather forecasting capabilities for events. This feature allows event organizers to automatically fetch and display weather forecasts for their events based on location data.

## Features

- **Automatic Weather Data**: When creating an event with location information, weather data is automatically fetched
- **Address Geocoding**: Events can be created with just an address string, which will be geocoded to coordinates
- **Weather Updates**: Weather data can be refreshed as the event date approaches
- **Location Management**: Event locations can be updated with either coordinates or addresses

## Weather Data Model

Weather data is stored with events and includes:

| Property | Type | Description |
|----------|------|-------------|
| temperature | number | Maximum temperature for the event date in °C |
| weatherCode | number | WMO weather code indicating conditions |
| windSpeed | number | Maximum wind speed in km/h |
| precipitation | number | Precipitation amount in mm |
| weatherDescription | string | Human-readable description of weather conditions |

## Event Location Model

Events can now include location data:

| Property | Type | Description |
|----------|------|-------------|
| location.name | string | Optional display name for the location |
| location.latitude | number | Latitude coordinate |
| location.longitude | number | Longitude coordinate |

## API Endpoints

### Create an Event with Weather Data

`POST /organizations/:id/events`

This endpoint now supports creating events with location data and automatically fetches weather forecasts.

#### Request Body


#### Response

```json
{
  "status": "success",
  "data": {
    "userEvent": {
      "PK": "USER#userId",
      "SK": "EVENT#eventId",
      "GSI2PK": "EVENT#eventId",
      "GSI2SK": "USER#userId"
    },
    "event": {
      "PK": "EVENT#abcd1234",
      "SK": "ENTITY",
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "description": "A networking event for all employees.",
      "isPublic": true,
      "date": "2025-05-01T18:00:00Z",
      "createdAt": "2025-04-01T15:30:00Z",
      "updatedAt": "2025-04-01T15:30:00Z",
      "location": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "name": "Boston City Hall"
      },
      "weather": {
        "temperature": 18.5,
        "weatherCode": 1,
        "weatherDescription": "Mainly clear",
        "windSpeed": 12.3,
        "precipitation": 0.5
      },
      "GSI2PK": "ORG#xyz987",
      "GSI2SK": "EVENT#abcd1234"
    },
    "geocoding": {
      "providedAddress": "123 Main St, Boston, MA 02108",
      "resolvedCoordinates": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "formattedAddress": "Boston City Hall, 1 City Hall Square, Boston, MA 02203, USA"
      }
    }
  }
}
```

### Refresh Weather Data for an Event

`POST /organizations/:id/events/:eid/weather/refresh`

Refreshes the weather forecast for an event as the date approaches.

#### Response

```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "weather": {
        "temperature": 19.2,
        "weatherCode": 2,
        "weatherDescription": "Partly cloudy",
        "windSpeed": 10.5,
        "precipitation": 0
      }
    }
  }
}
```

### Update Event Location Using Coordinates

`PATCH /organizations/:id/events/:eid/location`

Updates the event location using latitude and longitude, and fetches new weather data.

#### Request Body

```json
{
  "latitude": 42.3601,
  "longitude": -71.0589,
  "name": "Boston City Hall"
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "location": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "name": "Boston City Hall"
      },
      "weather": {
        "temperature": 18.5,
        "weatherCode": 1,
        "weatherDescription": "Mainly clear",
        "windSpeed": 12.3,
        "precipitation": 0.5
      }
    }
  }
}
```

### Update Event Location Using Address

`PATCH /organizations/:id/events/:eid/location/address`

Updates the event location using an address string, which is geocoded to coordinates.

#### Request Body

```json
{
  "address": "123 Main St, Boston, MA 02108"
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "event": {
      "id": "abcd1234",
      "title": "Annual Company Meetup",
      "location": {
        "latitude": 42.3601,
        "longitude": -71.0589,
        "name": "Boston, Massachusetts, USA"
      },
      "weather": {
        "temperature": 18.5,
        "weatherCode": 1,
        "weatherDescription": "Mainly clear",
        "windSpeed": 12.3,
        "precipitation": 0.5
      }
    },
    "geocoding": {
      "latitude": 42.3601,
      "longitude": -71.0589,
      "formattedAddress": "Boston, Massachusetts, USA"
    }
  }
}
```

## Weather Codes and Descriptions

The API uses the World Meteorological Organization (WMO) weather interpretation codes:

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45 | Fog |
| 48 | Depositing rime fog |
| 51 | Light drizzle |
| 53 | Moderate drizzle |
| 55 | Dense drizzle |
| 56 | Light freezing drizzle |
| 57 | Dense freezing drizzle |
| 61 | Slight rain |
| 63 | Moderate rain |
| 65 | Heavy rain |
| 66 | Light freezing rain |
| 67 | Heavy freezing rain |
| 71 | Slight snow fall |
| 73 | Moderate snow fall |
| 75 | Heavy snow fall |
| 77 | Snow grains |
| 80 | Slight rain showers |
| 81 | Moderate rain showers |
| 82 | Violent rain showers |
| 85 | Slight snow showers |
| 86 | Heavy snow showers |
| 95 | Thunderstorm |
| 96 | Thunderstorm with slight hail |
| 99 | Thunderstorm with heavy hail |

## Implementation Details

- Weather data is sourced from the Open-Meteo API
- Geocoding is handled by the Nominatim OpenStreetMap service
- Weather data is automatically refreshed when an event's location is updated
- All temperature values are in Celsius, wind speeds in km/h, and precipitation in mm