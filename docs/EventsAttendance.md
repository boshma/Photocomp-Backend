## Event Attendance Endpoints

### Create Attendance Record

`POST /organizations/:id/events/:eid`

This endpoint allows organization members to create an attendance record for an event.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**201 Created**
```json
{
  "status": "success",
  "data": {
    "userEvent": {
      "PK": "USER#userId",
      "SK": "EVENT#eventId",
      "GSI2PK": "EVENT#eventId",
      "GSI2SK": "USER#userId"
    }
  }
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
  "message": "You are not a member of this organization"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Event not found"
}
```

**409 Conflict**
```json
{
  "status": "error",
  "message": "You are already registered for this event"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to create attendance record"
}
```

### Remove Attendance Record

`DELETE /organizations/:id/events/:eid`

This endpoint allows organization members to remove their attendance record from an event.

#### Request Headers

| Key | Value | Required |
|-----|-------|----------|
| Authorization | Bearer your-jwt-token | Yes |

#### Response

**200 OK** (Note: The implementation returns 201, but 200 would be more appropriate for this operation)
```json
{
  "status": "success",
  "message": "Attendance removed successfully"
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
  "message": "You are not a member of this organization"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Event not found or you are not registered for this event"
}
```

**500 Server Error**
```json
{
  "status": "error",
  "message": "Failed to remove attendance record"
}
```
