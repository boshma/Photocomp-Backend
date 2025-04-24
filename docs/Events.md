# Event Management 

## Creating an Organization Event

`POST /organizations/:id/events`

This endpoint allows users with "ADMIN" role to create a new event for an organization. It now supports location data and automatic weather forecasts.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | `application/json` |  Yes  |

### Request Body
```json
{
  "title": "Annual Company Meetup",
  "description": "A networking event for all employees.",
  "date": "2025-05-01T18:00:00Z",
  "address": "123 Main St, Boston, MA 02108"
}
```

OR with direct coordinate specification:

```json
{
  "title": "Annual Company Meetup",
  "description": "A networking event for all employees.",
  "date": "2025-05-01T18:00:00Z",
  "location": {
    "latitude": 42.3601,
    "longitude": -71.0589,
    "name": "Boston City Hall"
  }
}
```

### Response
**201 Created**
```json
{
  "status": "success and email has been sent!",
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

**403 Forbidden (User Not Admin)**
```json
{
  "status": "error",
  "message": "Forbidden: You must be an org admin to create events."
}
```

**400 Bad Request (Validation Error)**
```json
{
  "status": "error",
  "message": "Missing required fields: title, description, or date."
}
```

## Get Organization Events

`GET /organizations/:id/events`

This endpoint retrieves all events for a specific organization that the user is a member of.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "PK": "EVENT#abcd1234",
        "SK": "ENTITY",
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
      }
    ]
  }
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Organization not found"
}
```

## Update Event's Publicity

`PATCH /organizations/:id/events/:eventId`

This endpoint allows users with "ADMIN" role to update an event's publicity status.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

### Request Body
```json
{
  "isPublic": false
}
```

### Response

**200 OK**
```json
{
    "status": "Updating Event's publicity success!",
    "data": {
        "updatedEvent": {
            "GSI2PK": "pizzahut",
            "date": "2025-04-03T19:38:42.888Z",
            "updatedAt": "2025-04-03T19:38:42.888Z",
            "createdAt": "2025-04-03T19:38:42.888Z",
            "SK": "ENTITY",
            "isPublic": false,
            "description": "We're throwing a yet another rager",
            "PK": "EVENT#29d4e4cf-d070-4341-854c-9b4c0f71bf0b",
            "id": "29d4e4cf-d070-4341-854c-9b4c0f71bf0b",
            "GSI2SK": "EVENT#29d4e4cf-d070-4341-854c-9b4c0f71bf0b",
            "title": "Pizza Party at Pizza Hut, AGAIN"
        }
    }
}
```

## Delete an Event

`DELETE /organizations/:id/events/:eventId/admin`

This endpoint allows organization admins to delete an event and all associated resources (attendance records, photos).

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response

**200 OK**
```json
{
  "status": "success",
  "message": "Event deleted successfully"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Only an Org Admin can perform this action. Please talk to your Admin for more information"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Event does not belong to this organization"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Event not found"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to delete event: [specific error message]"
}
```

## Refresh Weather Data for an Event

`POST /organizations/:id/events/:eid/weather/refresh`

This endpoint allows organization admins to refresh the weather forecast for an event.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |

### Response

**200 OK**
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

## Update Event Location Using Coordinates

`PATCH /organizations/:id/events/:eid/location`

Updates the event location using latitude and longitude, and fetches new weather data.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

### Request Body

```json
{
  "latitude": 42.3601,
  "longitude": -71.0589,
  "name": "Boston City Hall"
}
```

### Response

**200 OK**
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

## Update Event Location Using Address

`PATCH /organizations/:id/events/:eid/location/address`

Updates the event location using an address string, which is geocoded to coordinates.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type | application/json | Yes |

### Request Body

```json
{
  "address": "123 Main St, Boston, MA 02108"
}
```

### Response

**200 OK**
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

## Get All User Events
`GET /users/:userId/events`

This endpoint retrieves all events that a user is attending. It includes detailed event information such as title, description, date, weather data, and location.

### Request Headers
| Key | Value | Required |
|-----|-------|----------|
| Authorization | `Bearer <token>` | Yes |

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | The ID of the user whose events to retrieve |

### Response
**200 OK**
```json
{
  "status": "success",
  "events": [
    {
      "PK": "USER#userId",
      "SK": "EVENT#eventId",
      "id": "eventId",
      "GSI2PK": "EVENT#eventId",
      "GSI2SK": "USER#userId",
      "event": {
        "title": "Annual Company Meetup",
        "description": "A networking event for all employees.",
        "date": "2025-05-01T18:00:00Z",
        "weather": {
          "temperature": 18.5,
          "weatherCode": 1,
          "weatherDescription": "Mainly clear",
          "windSpeed": 12.3,
          "precipitation": 0.5
        },
        "location": {
          "latitude": 42.3601,
          "longitude": -71.0589,
          "name": "Boston City Hall"
        }
      }
    },
    {
      "PK": "USER#userId",
      "SK": "EVENT#eventId2",
      "id": "eventId2",
      "GSI2PK": "EVENT#eventId2",
      "GSI2SK": "USER#userId",
      "event": {
        "title": "Team Building Workshop",
        "description": "Interactive workshop for team collaboration.",
        "date": "2025-06-15T14:00:00Z",
        "weather": {
          "temperature": 22.3,
          "weatherCode": 2,
          "weatherDescription": "Partly cloudy",
          "windSpeed": 8.5,
          "precipitation": 0.0
        },
        "location": {
          "latitude": 40.7128,
          "longitude": -74.0060,
          "name": "New York City"
        }
      }
    }
  ]
}
```

**403 Forbidden (User Requesting Different User's Events)**
```json
{
  "status": "error",
  "message": "You cannot get this user's events"
}
```

**401 Unauthorized (Missing or Invalid Token)**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Failed to update event weather: Database connection failed"
}
```

