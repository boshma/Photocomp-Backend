# Authentication Requirements
Most API endpoints require authentication using a JWT token passed in the request header:

```
Authorization: Bearer your-jwt-token
```

## Authentication Endpoints


### Register a New User

`POST /api/auth/register`

This endpoint allows users to create a new account. All new users are registered with the "USER" status by default and are given an "ACTIVE" status.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Doe"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Password (minimum 8 characters) |
| firstName | string | Yes | User's first name |
| lastName | string | Yes | User's last name |

#### Response

**201 Created**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "role": "USER",
            "status": "ACTIVE",
            "createdAt": "2025-03-18T15:46:24.506Z",
            "updatedAt": "2025-03-18T15:46:24.506Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Email, password, first name, and last name are required"
}
```
```json
{
    "status": "error",
    "message": "Invalid email format"
}
```
```json
{
    "status": "error",
    "message": "Password must be at least 8 characters long"
}
```

**409 Conflict**
```json
{
    "status": "error",
    "message": "Email already in use"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Registration failed"
}
```

### Login

`POST /api/auth/login`

This endpoint authenticates a user and returns a JWT token.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |

#### Request Body

```json
{
    "email": "user@example.com",
    "password": "Password123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address for authentication |
| password | string | Yes | User's password |

#### Response

**200 OK**
```json
{
    "status": "success",
    "data": {
        "user": {
            "id": "38c83721-e03e-4e82-bc56-13fc97efdebd",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "role": "USER",
            "status": "ACTIVE",
            "createdAt": "2025-03-18T15:46:24.506Z",
            "updatedAt": "2025-03-18T15:46:24.506Z"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Email and password are required"
}
```

**401 Unauthorized**
```json
{
    "status": "error",
    "message": "Invalid email or password"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Login failed"
}
```

### Change Password

`PATCH /api/auth/password`

This endpoint allows authenticated users to change their password.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Content-Type | application/json | Yes |
| Authorization | Bearer your-jwt-token | Yes |

#### Request Body

```json
{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| currentPassword | string | Yes | User's current password |
| newPassword | string | Yes | New password (minimum 8 characters) |

#### Response

**200 OK**
```json
{
    "status": "success",
    "message": "Password changed successfully"
}
```

**400 Bad Request**
```json
{
    "status": "error",
    "message": "Current password and new password are required"
}
```
```json
{
    "status": "error",
    "message": "New password must be at least 8 characters long"
}
```
```json
{
    "status": "error",
    "message": "New password must be different from current password"
}
```

**401 Unauthorized**
```json
{
    "status": "error",
    "message": "Current password is incorrect"
}
```
```json
{
    "status": "error",
    "message": "Authentication required"
}
```

**404 Not Found**
```json
{
    "status": "error",
    "message": "User not found"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Failed to change password"
}
```

### Delete User Account

`DELETE /api/auth/users/:id`

This endpoint allows users to delete their own account.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK**
```json
{
    "status": "success",
    "message": "User deleted successfully"
}
```

**401 Unauthorized**
```json
{
    "status": "error",
    "message": "Authentication required"
}
```

**403 Forbidden**
```json
{
    "status": "error",
    "message": "Not authorized to delete this user"
}
```

**404 Not Found**
```json
{
    "status": "error",
    "message": "User not found"
}
```

**500 Server Error**
```json
{
    "status": "error",
    "message": "Failed to delete user"
}
```

## JWT Token

The JWT token contains the following payload:

```json
{
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "USER",
    "iat": 1616923664,
    "exp": 1616923664
}
```

| Field | Description |
|-------|-------------|
| id | User's unique identifier |
| email | User's email address |
| role | User's role in the system |
| iat | Issued at timestamp |
| exp | Expiration timestamp (24 hours after issuance) |

## Status Code Summary

| Status Code | Description |
|------------|-------------|
| 200 OK | Request processed successfully |
| 201 Created | Resource created successfully |
| 204 No Content | Resource has nothing to show |
| 400 Bad Request | Invalid request data (missing fields, invalid values, etc.) |
| 401 Unauthorized | Authentication required or authentication failed |
| 404 Not Found | Data not available in the database |
| 403 Forbidden | User doesn't have permission for the requested action |
| 409 Conflict | Resource already exists |
| 500 Server Error | Server-side error occurred |

## Constants

### User Roles
- USER (Default role for new users)
- MEMBER (User who is part of an organization)
- ADMIN (User with admin privileges in an organization)

## Security Considerations

- Passwords are hashed using bcrypt before storage
- JWT tokens expire after 24 hours
- Authentication is required for all endpoints except registration and login
- Email addresses must be properly formatted
- Passwords must be at least 8 characters long
- New passwords must be different from current passwords when changing
- Users can only delete their own accounts