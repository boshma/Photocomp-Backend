# Photo Management

## Overview

The Photo Management API enables uploading, retrieving, and managing photos for events within organizations. All uploaded photos are automatically processed into multiple sizes to optimize display in different contexts.

## Data Model

### Photo Model

| Property | Type | Description |
|----------|------|-------------|
| PK | string | Primary key: `PHOTO#<ID>` |
| SK | string | Static value: `"ENTITY"` |
| id | string | Unique identifier for the photo |
| eventId | string | ID of the event the photo belongs to |
| url | string | Pre-signed URL for accessing the photo (original size) |
| urls | object | Object containing URLs for different photo sizes (thumbnail, medium, large, original) |
| createdAt | string | Timestamp when the photo was uploaded (ISO 8601) |
| updatedAt | string | Timestamp when the photo was last updated (ISO 8601) |
| uploadedBy | string | User ID of the uploader |
| metadata | object | Optional metadata (title, description, dimensions, size, etc.) |
| GSI2PK | string | Event ID (`EVENT#<ID>`) |
| GSI2SK | string | Photo ID (`PHOTO#<ID>`) |

## API Endpoints

### Upload a Photo

`POST /organizations/:id/events/:eventId/photos`

This endpoint allows organization admins to upload photos to an event. The uploaded photo is automatically processed into multiple sizes.

#### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |
| Content-Type  | `multipart/form-data` |  Yes  |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | Yes | The photo file to upload (image files only) |
| title | string | No | Title for the photo |
| description | string | No | Description of the photo |

#### Response
**201 Created**
```json
{
  "status": "success",
  "data": {
    "photo": {
      "id": "photo-123",
      "eventId": "event-456",
      "url": "https://presigned-url.amazonaws.com/photos/event-456/photo-123.jpg",
      "urls": {
        "original": "https://presigned-url.amazonaws.com/photos/event-456/photo-123.jpg",
        "thumbnail": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_thumbnail.jpg",
        "medium": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_medium.jpg",
        "large": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_large.jpg"
      },
      "createdAt": "2025-04-05T14:30:00Z",
      "updatedAt": "2025-04-05T14:30:00Z",
      "uploadedBy": "user-789",
      "metadata": {
        "title": "Company Picnic",
        "description": "Team building activities",
        "size": 1024000,
        "width": 3000,
        "height": 2000,
        "mimeType": "image/jpeg"
      }
    }
  }
}
```

### Get All Photos for an Event

`GET /organizations/:id/events/:eventId/photos`

This endpoint retrieves all photos for a specific event. Only members of the organization can access this endpoint.

#### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

#### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-123",
        "eventId": "event-456",
        "url": "https://presigned-url.amazonaws.com/photos/event-456/photo-123.jpg",
        "urls": {
          "original": "https://presigned-url.amazonaws.com/photos/event-456/photo-123.jpg",
          "thumbnail": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_thumbnail.jpg",
          "medium": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_medium.jpg",
          "large": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_large.jpg"
        },
        "createdAt": "2025-04-05T14:30:00Z",
        "uploadedBy": "user-789",
        "metadata": {
          "title": "Team Photo",
          "description": "The whole team together",
          "width": 3000,
          "height": 2000
        }
      },
      {
        "id": "photo-124",
        "eventId": "event-456",
        "url": "https://presigned-url.amazonaws.com/photos/event-456/photo-124.jpg",
        "urls": {
          "original": "https://presigned-url.amazonaws.com/photos/event-456/photo-124.jpg",
          "thumbnail": "https://presigned-url.amazonaws.com/photos/event-456/photo-124_thumbnail.jpg",
          "medium": "https://presigned-url.amazonaws.com/photos/event-456/photo-124_medium.jpg",
          "large": "https://presigned-url.amazonaws.com/photos/event-456/photo-124_large.jpg"
        },
        "createdAt": "2025-04-05T15:30:00Z",
        "uploadedBy": "user-789",
        "metadata": {
          "title": "Award Ceremony",
          "description": "Recognizing achievements",
          "width": 4000,
          "height": 3000
        }
      }
    ]
  }
}
```

### Get a Download URL for a Specific Photo

`GET /organizations/:id/events/:eventId/photos/:photoId/download`

This endpoint provides a pre-signed URL for downloading a specific photo. Users must be attending the event to access the photo download.

#### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "original" | Image size to download: "thumbnail", "medium", "large", or "original" |

#### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://download-url.amazonaws.com/photos/event-456/photo-123.jpg?Content-Disposition=attachment%3B%20filename%3D%22event-photo.jpg%22&X-Amz-Algorithm=...",
    "size": "original"
  }
}
```

### Delete a Photo

`DELETE /organizations/:id/events/:eventId/photos/:photoId`

This endpoint allows organization admins to delete a photo and all its size variants from an event.

#### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

#### Response
**200 OK**
```json
{
  "status": "success",
  "message": "Photo deleted successfully"
}
```

## Getting Organization Photos

`GET /organizations/:id/photos`

This endpoint retrieves all photos across all events for an organization, with support for specifying a preferred display size.

#### Request Headers
| Key           | Value            | Required |
|--------------|----------------|----------|
| Authorization | `Bearer <token>` |  Yes  |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "medium" | Preferred image size: "thumbnail", "medium", "large", or "original" |

#### Response
**200 OK**
```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-123",
        "eventId": "event-456",
        "url": "https://presigned-url.amazonaws.com/photos/event-456/photo-123.jpg",
        "urls": {
          "original": "https://presigned-url.amazonaws.com/photos/event-456/photo-123.jpg",
          "thumbnail": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_thumbnail.jpg",
          "medium": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_medium.jpg",
          "large": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_large.jpg"
        },
        "displayUrl": "https://presigned-url.amazonaws.com/photos/event-456/photo-123_medium.jpg",
        "availableSizes": ["original", "thumbnail", "medium", "large"],
        "dimensions": {
          "width": 3000,
          "height": 2000
        },
        "event": {
          "id": "event-456",
          "title": "Annual Company Picnic",
          "date": "2025-04-01T12:00:00Z"
        }
      }
    ],
    "count": 1,
    "preferredSize": "medium"
  }
}
```

## Error Responses

| Status Code | Message | Description |
|-------------|---------|-------------|
| 400 | "No photo file uploaded" | No file was provided in the request |
| 400 | "File size limit exceeded. Maximum size is 5MB" | Photo exceeds size limit |
| 400 | "Only image files are allowed" | File type is not a supported image format |
| 400 | "Invalid size parameter" | Requested size is not one of the supported options |
| 403 | "You do not have access to photos from this event" | User is not authorized to access event photos |
| 404 | "Photo not found" | Requested photo does not exist |
| 404 | "Photo does not belong to the specified event" | Photo ID exists but is not part of the requested event |
| 500 | "Failed to upload photo: [specific error]" | Server error during photo upload process |
| 500 | "Failed to delete photo: [specific error]" | Server error during photo deletion process |

## Image Sizing and Processing

All uploaded photos are automatically processed into multiple sizes to optimize display in different contexts:

- **Thumbnail** (200px width) - For previews and thumbnails
- **Medium** (800px width) - For gallery views
- **Large** (1600px width) - For detailed views
- **Original** - Preserved for maximum quality

For more details on image processing and sizing, see the [Image Resizing Documentation](./image-resizing-docs.md).