# Photo Tagging Feature Documentation

## Overview

The Photo Tagging feature allows organization members to tag other members in event photos. This feature enhances the social aspect of the PhotoComp platform by allowing users to identify who appears in photos and makes it easier for users to find photos they're in.

## Data Models

### Tag Model

| Property | Type | Description |
|----------|------|-------------|
| PK | string | Primary key: `TAG#<UserID>` |
| SK | string | Static value: `"ENTITY"` |
| id | string | Unique identifier for the tag (UUID) |
| userId | string | ID of the user who is tagged |
| photoId | string | ID of the photo where the user is tagged |
| eventId | string | ID of the event the photo belongs to |
| taggedBy | string | ID of the user who created the tag |
| taggedAt | string | ISO timestamp when the tag was created |
| GSI1PK | string | GSI partition key for photo lookups: `PHOTO#<PhotoID>` |
| GSI1SK | string | GSI sort key for photo lookups: `TAG#<UserID>` |

## API Endpoints

### Get all users tagged in a photo

`GET /organizations/:id/events/:eventId/photos/:photoId/tags`

This endpoint retrieves all users tagged in a specific photo.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "tags": [
      {
        "tag": {
          "id": "tag-id-1",
          "userId": "user-id-1",
          "photoId": "photo-id",
          "eventId": "event-id",
          "taggedBy": "admin-user-id",
          "taggedAt": "2025-04-01T12:34:56.789Z"
        },
        "user": {
          "id": "user-id-1",
          "email": "user1@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      {
        "tag": {
          "id": "tag-id-2",
          "userId": "user-id-2",
          "photoId": "photo-id",
          "eventId": "event-id",
          "taggedBy": "admin-user-id",
          "taggedAt": "2025-04-01T12:34:56.789Z"
        },
        "user": {
          "id": "user-id-2",
          "email": "user2@example.com",
          "firstName": "Jane",
          "lastName": "Smith"
        }
      }
    ]
  }
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Photo not found"
}
```

### Tag users in a photo

`POST /organizations/:id/events/:eventId/photos/:photoId/tags`

This endpoint allows organization admins to tag multiple users in a photo. Only users who are attending the event can be tagged.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |
| Content-Type | application/json | Yes |

#### Request Body

```json
{
  "userIds": ["user-id-1", "user-id-2", "user-id-3"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| userIds | array | Yes | Array of user IDs to tag in the photo |

#### Response

**201 Created**
```json
{
  "status": "success and email has been sent!",
  "message": "Tagged 3 users in photo",
  "data": {
    "tags": [
      {
        "id": "tag-id-1",
        "userId": "user-id-1",
        "photoId": "photo-id",
        "eventId": "event-id",
        "taggedBy": "admin-user-id",
        "taggedAt": "2025-04-01T12:34:56.789Z"
      },
      {
        "id": "tag-id-2",
        "userId": "user-id-2",
        "photoId": "photo-id",
        "eventId": "event-id",
        "taggedBy": "admin-user-id",
        "taggedAt": "2025-04-01T12:34:56.789Z"
      },
      {
        "id": "tag-id-3",
        "userId": "user-id-3",
        "photoId": "photo-id",
        "eventId": "event-id",
        "taggedBy": "admin-user-id",
        "taggedAt": "2025-04-01T12:34:56.789Z"
      }
    ]
  }
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "A list of user IDs is required"
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
  "message": "Photo not found"
}
```

```json
{
  "status": "error",
  "message": "Photo does not belong to the specified event"
}
```

### Remove a tag (untag a user from a photo)

`DELETE /organizations/:id/events/:eventId/photos/:photoId/tags/:userId`

This endpoint allows organization admins to remove a tag (untag a user from a photo).

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
  "status": "success",
  "message": "User untagged from photo successfully"
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
  "message": "User is not tagged in this photo"
}
```

### Get all photos a user is tagged in

`GET /users/:userId/tagged-photos`

This endpoint allows users to retrieve all photos they are tagged in. Users can only view their own tagged photos.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-id-1",
        "eventId": "event-id-1",
        "url": "https://presigned-url.example.com/photo1.jpg",
        "uploadedBy": "admin-user-id",
        "createdAt": "2025-04-01T12:34:56.789Z",
        "metadata": {
          "title": "Team Photo",
          "description": "Annual company picnic"
        }
      },
      {
        "id": "photo-id-2",
        "eventId": "event-id-2",
        "url": "https://presigned-url.example.com/photo2.jpg",
        "uploadedBy": "admin-user-id",
        "createdAt": "2025-04-02T12:34:56.789Z",
        "metadata": {
          "title": "Award Ceremony",
          "description": "Employee recognition event"
        }
      }
    ],
    "count": 2
  }
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "You can only view your own tagged photos"
}
```

## Implementation Details

### Tagging Logic

1. When tagging users in a photo:
   - Only organization admins can tag users
   - Only users who are attending the event can be tagged
   - Users can be tagged in multiple photos
   - The same user cannot be tagged twice in the same photo

2. The system validates:
   - That the photo exists and belongs to the specified event
   - That the users being tagged exist and are attending the event
   - That the users aren't already tagged in the photo

3. When retrieving tagged photos for a user:
   - Pre-signed URLs are refreshed to ensure they're valid
   - Users can only view their own tagged photos

### Security Considerations

- Access control ensures only organization admins can tag users
- Users can only view their own tagged photos
- The system prevents duplicate tags for the same user in the same photo
- Tags are associated with both the user and the photo, enabling efficient queries in both directions

## Error Handling

The tag system includes robust error handling for various scenarios:

- Photo not found or doesn't belong to the specified event
- User not found or not attending the event
- Duplicate tag attempts
- Unauthorized access attempts
- Database errors