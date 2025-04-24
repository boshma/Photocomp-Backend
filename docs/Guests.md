## Guest Router

### Get Public Organizations
`GET /guests`

Retrieves a list of public organizations. The response is paginated with a maximum of 9 organizations per request.

#### Request Parameters:
- `lastEvaluatedKey` (optional, query parameter) – Used for pagination.

#### Response:
```json
{
  "message": "Here are all organizations!",
  "data": {
    "organizations": [
      {
        "id": "<org_id>",
        "name": "Organization Name",
        "description": "Public description of the organization"
      }
    ]
  },
  "lastEvaluatedKey": "<pagination_key>"
}
```

### Get Public Events of an Organization
`GET /guests/organizations/:id/events`

Retrieves all public events for a specific organization.

#### Path Parameters:
- `id` (required) – Organization ID.

#### Response:
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "eventId": "<event_id>",
        "name": "Event Name",
        "date": "YYYY-MM-DD",
        "description": "Public event description"
      }
    ]
  },
  "lastEvaluatedKey": "<pagination_key>"
}
```
