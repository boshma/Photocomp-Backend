## 5. Organization Membership

### 5.1 Apply to an Organization
`POST /organizations/:id`

Apply to join an organization. The organization must have at least one event.

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | No | Optional message to the organization admins explaining why you want to join |
```json
{
  "message": "I would like to join this organization"
}
```

#### Response
**Status Codes:**
- 201: Created - Application submitted successfully
- 400: Bad Request - Cannot apply to an organization without any events
- 401: Unauthorized - Missing or invalid token
- 404: Not Found - Organization not found
- 409: Conflict - User has already applied or is already a member
- 500: Internal Server Error - Server error

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Application submitted successfully",
  "data": {
    "request": {
      "PK": "ORG#ORGNAME",
      "SK": "REQUEST#userId",
      "organizationName": "OrgName",
      "userId": "userId",
      "requestDate": "2023-04-04T12:34:56.789Z",
      "message": "I would like to join this organization",
      "status": "PENDING",
      "type": "ORG_REQUEST"
    }
  }
}
```
**Error Response (400):**
```json
{
  "status": "error",
  "message": "Cannot apply to an organization without any events"
}
```

**Error Response (401):**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Organization not found"
}
```

**Error Response (409):**
```json
{
  "status": "error",
  "message": "You are already a member of this organization"
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

### 5.2 Get Pending Membership Requests
`GET /organizations/:id/requests`

Get all pending membership requests for an organization (admin only).

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Response
**Status Codes:**
- 200: OK - Requests retrieved successfully
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - User is not an admin of the organization
- 404: Not Found - Organization not found
- 500: Internal Server Error - Server error

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "requests": [
      {
        "PK": "ORG#ORGNAME",
        "SK": "REQUEST#userId",
        "organizationName": "OrgName",
        "userId": "userId",
        "requestDate": "2023-04-04T12:34:56.789Z",
        "message": "I would like to join this organization",
        "status": "PENDING",
        "type": "ORG_REQUEST",
        "GSI1PK": "REQUEST#userId",
        "GSI1SK": "ORG#ORGNAME",
        "userDetails": {
          "id": "userId",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ]
  }
}
```

**Error Response (403):**
```json
{
  "status": "error",
  "message": "Only an Org Admin can perform this action. Please talk to your Admin for more information"
}
```

### 5.3 Approve a Membership Request
`PUT /organizations/:id/requests/:userId`

Approve a user's request to join an organization (admin only).

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | Must be "approved" |

```json
{
  "status": "approved"
}
```

#### Response
**Status Codes:**
- 200: OK - Request approved successfully
- 400: Bad Request - Invalid status or organization has no events
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - User is not an admin of the organization
- 404: Not Found - Organization, user, or request not found
- 500: Internal Server Error - Server error

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Membership request approved",
  "data": {
    "membership": {
      "PK": "USER#userId",
      "SK": "ORG#ORGNAME",
      "userId": "userId",
      "organizationName": "OrgName",
      "role": "MEMBER",
      "joinedAt": "2023-04-04T12:34:56.789Z",
      "type": "USER_ORG",
      "GSI1PK": "ORG#ORGNAME",
      "GSI1SK": "USER#userId"
    }
  }
}
```

**Error Response (400):**
```json
{
  "status": "error",
  "message": "Cannot approve new members for an organization without events"
}
```

**Error Response (403):**
```json
{
  "status": "error",
  "message": "You must be an admin to approve membership requests"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Membership request not found"
}
```

### 5.4 Deny a Membership Request
`DELETE /organizations/:id/requests/:userId`

Deny a user's request to join an organization (admin only).

#### Request Headers
| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| Authorization | Bearer [token] | Yes | JWT authentication token |

#### Response
**Status Codes:**
- 200: OK - Request denied successfully
- 401: Unauthorized - Missing or invalid token
- 403: Forbidden - User is not an admin of the organization
- 404: Not Found - Organization or request not found
- 500: Internal Server Error - Server error

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Membership request denied"
}
```

**Error Response (403):**
```json
{
  "status": "error",
  "message": "You must be an admin to deny membership requests"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Membership request not found"
}
```
