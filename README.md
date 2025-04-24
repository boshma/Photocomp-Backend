# PhotoComp API Documentation

This document outlines the API endpoints for the PhotoComp platform, designed for companies to share event photos with their organization members. It includes all required HTTP requests, expected responses, and details about the data models.

## Data Models

### User Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the user. |
| email | string | User's email address (used for authentication). |
| firstName | string | User's first name. |
| lastName | string | User's last name. |
| password | string | Hashed password (not returned in API responses). |
| role | string | User role: "USER", "MEMBER", or "ADMIN". |
| createdAt | timestamp | Timestamp when the user was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the user was last updated (ISO 8601). |

### Organization Model

| Property | Type | Description |
|----------|------|-------------|
| id | string (UUID) | Unique identifier for the org. |
| name | string | Organization's unique name. |
| createdBy | string | User's ID (`USER#${user.id}` or user.PK) |
| createdAt | timestamp | Timestamp when the org was created (ISO 8601). |
| updatedAt | timestamp | Timestamp when the org was last updated (ISO 8601). |
| isPublic | boolean | Returns if an org is public or not. |
| logoUrl | string | Photo URL of the org's logo (pre-signed URL for access). |
| logoS3Key | string | S3 key where the logo is stored. |
| description | string | Optional description of the organization. |
| website | string | Optional website URL. |
| contactEmail | string | Optional contact email for the organization. |

### User-Organization Model

| Property | Type | Description |
|----------|------|-------------|
| userId | string | User's ID (`USER#${user.id}` or userOrg.PK)  |
| organizationName | string | Org's name (`ORG#${org.name}` or userOrg.SK) |
| role | string | User role: "USER", "MEMBER", or "ADMIN". |
| joinedAt | timestamp | When user joined the org (ISO 8601). |

### Organization Membership Request Model

| Property       | Type                                  | Description |
|----------------|---------------------------------------|-------------|
| PK           | string                              | Primary partition key: `ORG#<NAME>` |
| SK           | string                              | Primary sort key: `REQUEST#` |
| organizationName | string                         | Name of the organization |
| userId       | string                              | ID of the user making the request |
| requestDate  | string                              | ISO timestamp of when the request was made |
| message      | string *(optional)*                 | Optional message from the user |
| status       | 'PENDING' \| 'APPROVED' \| 'DENIED' | Status of the request |
| type         | 'ORG_REQUEST'                       | Entity type identifier |
| GSI1PK       | string                              | GSI partition key for user lookups: `REQUEST#` |
| GSI1SK       | string                              | GSI sort key for user lookups: `ORG#<NAME>` |

### Event Model
| Property     | Type    | Description |
|-------------|--------|-------------|
| PK          | string | Primary key: `EVENT#<ID>` |
| SK          | string | Static value: `"ENTITY"` |
| title       | string | Event title |
| description | string | Event description |
| visibility  | string | `"PUBLIC"` or `"PRIVATE"` (default: `"PUBLIC"`) |
| date        | string | Event date (ISO 8601 format) |
| createdAt   | string | Timestamp when the event was created (ISO 8601) |
| updatedAt   | string | Timestamp when the event was last updated (ISO 8601) |
| GSI2PK      | string | Organization ID (`ORG#<ID>`) |
| GSI2SK      | string | Event ID (`EVENT#<ID>`) |

### Event User Model (Event Attendant)
| Property     | Type    | Description |
|-------------|--------|-------------|
| PK          | string | User ID: `USER#<ID>` |
| SK          | string | Event ID: `EVENT#<ID>` |
| GSI2PK      | string | Event ID (`EVENT#<ID>`) |
| GSI2SK      | string | User ID (`USER#<ID>`) |

### Photo Model
| Property     | Type    | Description |
|-------------|--------|-------------|
| PK          | string | Primary key: `PHOTO#<ID>` |
| SK          | string | Static value: `"ENTITY"` |
| id          | string | Unique identifier for the photo |
| eventId     | string | ID of the event the photo belongs to |
| url         | string | Pre-signed URL for accessing the original photo |
| urls        | object | Object containing URLs for different photo sizes (thumbnail, medium, large, original) |
| createdAt   | string | Timestamp when the photo was uploaded (ISO 8601) |
| updatedAt   | string | Timestamp when the photo was last updated (ISO 8601) |
| uploadedBy  | string | User ID of the uploader |
| metadata    | object | Photo metadata (title, description, dimensions, size, etc.) |
| GSI2PK      | string | Event ID (`EVENT#<ID>`) |
| GSI2SK      | string | Photo ID (`PHOTO#<ID>`) |

## Database Model

The system uses a single-table design in DynamoDB with the following structure:

| Component | Description |
|-----------|-------------|
| PK | Primary partition key in format [USER: USER#{id}; ORG: ORG#{NAME}; EVENT: EVENT#{id}; PHOTO: PHOTO#{id}] |
| SK | Primary sort key in format [USER/ORG/EVENT/PHOTO: ENTITY; USER-ORG: ORG#{NAME}; USER-EVENT: EVENT#{id}] |
| GSI1PK | Global Secondary Index partition key in format [USER: EMAIL#{email}; ORG: USER#{id}] |
| GSI1SK | Global Secondary Index sort key in format [USER: USER#{id}; ORG: ORG#{NAME}] |
| GSI2PK | Second Global Secondary Index partition key in format [EVENT: ORG#{name}; PHOTO: EVENT#{id}] |
| GSI2SK | Second Global Secondary Index sort key in format [EVENT: EVENT#{id}; PHOTO: PHOTO#{id}] |
| type | Item type identifier used for filtering (e.g., "USER", "ORGANIZATION", "USER_ORG", "EVENT", "PHOTO") |

## API Overview

### Auth 
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get authentication token |

---

### Guest 
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /guests | Get public organizations |
| GET | /guests/organizations/:id/events | Get public organizations events|

---

### Organization 
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations | Get all organizations for the authenticated user |
| POST | /organizations | Create a new organization |

- [ ] TODO: Implement PATCH /organization/:id  - Update org metadata
- [ ] TODO: Implement DELETE /organization/:id  - Delete the entire Org

---

### Organization Requests 
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /organizations/:id | Apply to join an organization with events |
| GET | /organizations/:id/requests | Get all pending membership requests |
| PUT | /organizations/:id/requests/:userId | Approve a membership request |
| DELETE | /organizations/:id/requests/:userId | Deny a membership request |

- [ ] TODO: Implement Notifications for acceptance into organization

---

### Organization Members 
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/:id/members | Get organization members |
| PUT | /organizations/:id/members/:userID | Update organization member |
| DELETE | /organizations/:id/members/:userID | Remove organization member |
| DELETE | /organizations/:id/members/:userID/leave | leave an organization |

---

### Organizations Events 
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/:id/events | Get organizations events|
| POST | /organizations/:id/events | Create a new organization event|
| PATCH | /organizations/:id/events/:eventId | Update an event's publicity |
| DELETE | /organizations/:id/events/:eventId/admin | Delete an event and all associated resources |

- [ ] TODO: Implement SendMemberANotification for NEW event at organization


---

### Organizations Events Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /organizations/:id/events/:eventId | Attend an event |
| DELETE | /organizations/:id/events/:eventId | Leave an event |

- [ ] TODO: Implement Admin remove member from event
- [ ] TODO: Implement Admin remove member from event

---

### Organizations Events Photos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/:id/events/:eventId/photos | Get all photos for an event |
| POST | /organizations/:id/events/:eventId/photos | Upload a photo to an event |
| DELETE | /organizations/:id/events/:eventId/photos/:photoId | Delete a photo |
| GET | /organizations/:id/events/:eventId/photos/:photoId/download?size=original | Get a download URL for a specific photo size |
| GET | /organizations/:id/photos?size=medium | Get all photos across all organization events with preferred size |

--- 

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | /api/auth/users/:userId | Delete the user account |
| GET | /users/:userId/events | Get all the user's events  |
| GET | /users/:userId/tagged-photos | Get all photos a user is tagged in|

- [ ] TODO: GET `/users/:userId` - Get all the user's information
- [ ] TODO: PUT `/users/:userId` - Update the user's information 
- [ ] TODO: GET `/users/:userId/organizations` - Get all the user's organizations 

--- 

### Organizations Events Photos Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/:id/events/:eventId/photos/:photoId/tags | Get all tagged users for photo|
| POST | /organizations/:id/events/:eventId/photos/:photoId/tags | Add multiple users to a photo|
| DELETE | /organizations/:id/events/:eventId/photos/:photoId/tags/:userId | Remove a tagged user from photo|

--- 

- [ ] TODO: Implement following endpoints 

### Organizations Events Member Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/:id/events/:eventId/attendants | Get all events attendants |
| DELETE | /organizations/:id/events/:eventId/attendants/:userId | Remove an event attendant|


### Organizations Events Photos Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/:id/events/:eventId/photos/:photoId/tags | Get all tagged users for photo|
| POST | /organizations/:id/events/:eventId/photos/:photoId/tags | Add multiple users to a photo|
| DELETE | /organizations/:id/events/:eventId/photos/:photoId/tags/:userId | Remove a tagged user from photo|
| GET | /users/:userId/tagged-photos | Get all photos a user is tagged in|

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/:userId | Get all the user's information|
| PUT | /users/:userId | Update the user's information |
| DELETE | /users/:userId | Delete the user account |
| GET | /users/:userId/organizations | Get all the user's organizations |
| GET | /users/:userId/events | Get all the user's events  |
| GET | /users/:userId/photos | Get all the user's photos  |


> For more details please check `docs/`