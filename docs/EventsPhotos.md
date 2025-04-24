## Photo Management

### Upload a Photo

`POST /organizations/:id/events/:eventId/photos`

This endpoint allows organization admins to upload photos to an event.

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
      "PK": "PHOTO#12345",
      "SK": "ENTITY",
      "id": "12345",
      "eventId": "event-id",
      "url": "https://presigned-url.amazonaws.com/photos/event-id/12345.jpg",
      "createdAt": "2025-04-05T14:30:00Z",
      "updatedAt": "2025-04-05T14:30:00Z",
      "uploadedBy": "user-id",
      "metadata": {
        "title": "Company Picnic",
        "description": "Team building activities",
        "size": 1024000,
        "mimeType": "image/jpeg",
        "s3Key": "photos/event-id/12345.jpg"
      },
      "GSI2PK": "EVENT#event-id",
      "GSI2SK": "PHOTO#12345"
    }
  }
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "No photo file uploaded"
}
```

```json
{
  "status": "error",
  "message": "File size limit exceeded. Maximum size is 5MB"
}
```

```json
{
  "status": "error",
  "message": "Only image files are allowed"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Only an Org Admin can perform this action. Please talk to your Admin for more information"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Photo not found: photo-id"
}
```

```json
{
  "status": "error",
  "message": "Photo does not belong to the specified event"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to delete photo: S3 deletion failed"
}
```
