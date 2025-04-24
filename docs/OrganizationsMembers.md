## 7. Organization Members Endpoints

### 7.1 Get Organization Members

`GET /organizations/:id/members`

This endpoint allows organization admins to retrieve all members of an organization.

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
    "members": [
      {
        "PK": "USER#userId",
        "SK": "ORG#ORGNAME",
        "userId": "userId",
        "organizationName": "OrgName",
        "role": "ADMIN",
        "joinedAt": "2025-04-01T12:34:56.789Z",
        "type": "USER_ORG",
        "GSI1PK": "ORG#ORGNAME",
        "GSI1SK": "USER#userId",
        "userDetails": {
          "id": "userId",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      {
        "PK": "USER#userId2",
        "SK": "ORG#ORGNAME",
        "userId": "userId2",
        "organizationName": "OrgName",
        "role": "MEMBER",
        "joinedAt": "2025-04-02T12:34:56.789Z",
        "type": "USER_ORG",
        "GSI1PK": "ORG#ORGNAME",
        "GSI1SK": "USER#userId2",
        "userDetails": {
          "id": "userId2",
          "email": "user2@example.com",
          "firstName": "Jane",
          "lastName": "Smith"
        }
      }
    ]
  }
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
  "message": "Organization not found"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to retrieve organization members"
}
```

### 7.2 Update Organization Member Role

`PATCH /organizations/:id/members/:userId`

This endpoint allows organization admins to update a member's role within the organization.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |
| Content-Type | application/json | Yes |

#### Request Body

```json
{
  "role": "ADMIN"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | Yes | New role for the member (must be "ADMIN" or "MEMBER") |

#### Response

**200 OK**
```json
{
  "status": "success and email has been sent!",
  "message": "Member role updated successfully",
  "data": {
    "member": {
      "PK": "USER#userId",
      "SK": "ORG#ORGNAME",
      "userId": "userId",
      "organizationName": "OrgName",
      "role": "ADMIN",
      "joinedAt": "2025-04-01T12:34:56.789Z",
      "type": "USER_ORG",
      "GSI1PK": "ORG#ORGNAME",
      "GSI1SK": "USER#userId"
    }
  }
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Role must be either ADMIN or MEMBER"
}
```

```json
{
  "status": "error",
  "message": "Administrators cannot change their own role"
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
  "message": "Member or organization not found"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to update member role"
}
```

### 7.3 Remove Organization Member

`DELETE /organizations/:id/members/:userId`

This endpoint allows organization admins to remove a member from the organization.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
  "status": "success",
  "message": "Member removed successfully"
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Administrators cannot remove themselves from the organization"
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
  "message": "Member or organization not found"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to remove member from organization"
}
```
### 7.4 Leave Organization

`DELETE /organizations/:id/members/:userId/leave`

This endpoint allows users to leave an organization they are a member of. Admins cannot leave if they are the last admin of the organization.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
  "status": "success",
  "message": "Successfully left the organization"
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Cannot leave organization: You are the only admin. Please assign another admin first."
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "You cannot make another member leave"
}
```

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "You are NOT part of this Organization"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Organization not found"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to leave organization"
}
```
