# Organization Photos Endpoints

## Get All Organization Photos

`GET /organizations/:id/photos`

This endpoint retrieves all photos across all events for an organization that the user is a member of. It provides a comprehensive view of all photos with their associated event information and supports specifying a preferred image size for display.

### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "medium" | Preferred image size to use: "thumbnail", "medium", "large", or "original" |

### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-1",
        "eventId": "event-1",
        "url": "https://presigned-url.example.com/photo1.jpg",
        "urls": {
          "original": "https://presigned-url.example.com/photo1.jpg",
          "thumbnail": "https://presigned-url.example.com/photo1_thumbnail.jpg",
          "medium": "https://presigned-url.example.com/photo1_medium.jpg",
          "large": "https://presigned-url.example.com/photo1_large.jpg"
        },
        "displayUrl": "https://presigned-url.example.com/photo1_medium.jpg",
        "availableSizes": ["original", "thumbnail", "medium", "large"],
        "dimensions": {
          "width": 3000,
          "height": 2000
        },
        "uploadedBy": "user-id",
        "createdAt": "2025-04-01T15:30:00Z",
        "updatedAt": "2025-04-01T15:30:00Z",
        "metadata": {
          "title": "Company Picnic",
          "description": "Team building activities"
        },
        "event": {
          "id": "event-1",
          "title": "Annual Company Picnic",
          "date": "2025-04-01T12:00:00Z"
        }
      },
      {
        "id": "photo-2",
        "eventId": "event-2",
        "url": "https://presigned-url.example.com/photo2.jpg",
        "urls": {
          "original": "https://presigned-url.example.com/photo2.jpg",
          "thumbnail": "https://presigned-url.example.com/photo2_thumbnail.jpg",
          "medium": "https://presigned-url.example.com/photo2_medium.jpg",
          "large": "https://presigned-url.example.com/photo2_large.jpg"
        },
        "displayUrl": "https://presigned-url.example.com/photo2_medium.jpg",
        "availableSizes": ["original", "thumbnail", "medium", "large"],
        "dimensions": {
          "width": 4000,
          "height": 3000
        },
        "uploadedBy": "user-id",
        "createdAt": "2025-04-02T10:15:00Z",
        "updatedAt": "2025-04-02T10:15:00Z",
        "metadata": {
          "title": "Office Party",
          "description": "Celebrating company achievements"
        },
        "event": {
          "id": "event-2",
          "title": "Quarterly Review Party",
          "date": "2025-04-02T17:30:00Z"
        }
      }
    ],
    "count": 2,
    "preferredSize": "medium"
  }
}
```

### Key Response Elements

| Field | Description |
|-------|-------------|
| displayUrl | The URL for the preferred size specified in the request |
| availableSizes | Array of available size options for each photo |
| dimensions | Width and height of the original photo in pixels |
| event | Information about the event the photo belongs to |

### Error Responses

| Status Code | Message | Description |
|-------------|---------|-------------|
| 403 | "You are not a member of this organization" | User is not authorized to access organization photos |
| 404 | "Organization not found" | The requested organization does not exist |
| 500 | "Failed to get organization photos" | Server error during photo retrieval |

