# Image Resizing Feature

## Overview

The PhotoComp API automatically generates multiple sizes of each uploaded photo to optimize display in different contexts and improve performance. This feature ensures that photos always look their best at any display size while minimizing bandwidth usage and load times.

## How It Works

When a photo is uploaded, the ImageService:
1. Analyzes the original image to get dimensions and format information
2. Creates multiple size variants based on the original image
3. Only creates smaller sizes (never upscales) to maintain quality
4. Stores all sizes in S3 with appropriate naming
5. Generates pre-signed URLs for all sizes

## Image Sizes

The system creates the following size variants:

| Size | Width | Quality | Use Case |
|------|-------|---------|----------|
| thumbnail | 200px | 80% | Previews, thumbnails, list views |
| medium | 800px | 85% | Gallery views, detail cards |
| large | 1600px | 90% | Full-screen views, high-quality displays |
| original | Unchanged | 100% | Maximum quality, downloads, archival |

All resized images maintain their original aspect ratio. **Important**: Images are never upscaled beyond their original dimensions - if an original image is smaller than a defined size, that size variant is not created.

## Smart Format Handling

The system includes intelligent format handling:
- JPEGs are optimized with appropriate quality settings
- PNGs with transparency are preserved as PNG
- PNGs without transparency may be converted to JPEG for better compression
- Original format information is preserved for accurate file extensions

## Photo Model

The Photo model includes URLs and metadata for all available sizes:

```json
{
  "id": "photo-id-123",
  "eventId": "event-id-456",
  "url": "https://presigned-url.example.com/photos/original.jpg", // For backward compatibility
  "urls": {
    "original": "https://presigned-url.example.com/photos/original.jpg",
    "thumbnail": "https://presigned-url.example.com/photos/thumbnail.jpg",
    "medium": "https://presigned-url.example.com/photos/medium.jpg",
    "large": "https://presigned-url.example.com/photos/large.jpg"
  },
  "metadata": {
    "title": "Company Event",
    "description": "Team building activities",
    "width": 3000,
    "height": 2000,
    "size": 5242880,
    "mimeType": "image/jpeg",
    "s3Key": "photos/event-id-456/photo-id-123.jpg",
    "s3Keys": {
      "original": "photos/event-id-456/photo-id-123.jpg",
      "thumbnail": "photos/event-id-456/photo-id-123_thumbnail.jpg",
      "medium": "photos/event-id-456/photo-id-123_medium.jpg",
      "large": "photos/event-id-456/photo-id-123_large.jpg"
    }
  },
  "createdAt": "2025-04-05T14:30:00Z",
  "uploadedBy": "user-id-789"
}
```

## API Endpoints

### Get Photos with Size Preference

When retrieving photos, you can specify a preferred size to use for the main display URL.

`GET /organizations/:id/photos?size=medium`

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "medium" | Preferred image size: "thumbnail", "medium", "large", or "original" |

#### Response

```json
{
  "status": "success",
  "data": {
    "photos": [
      {
        "id": "photo-id-123",
        "eventId": "event-id-456",
        "url": "https://presigned-url.example.com/photos/original.jpg",
        "urls": {
          "original": "https://presigned-url.example.com/photos/original.jpg",
          "thumbnail": "https://presigned-url.example.com/photos/thumbnail.jpg",
          "medium": "https://presigned-url.example.com/photos/medium.jpg",
          "large": "https://presigned-url.example.com/photos/large.jpg"
        },
        "displayUrl": "https://presigned-url.example.com/photos/medium.jpg",
        "availableSizes": ["original", "thumbnail", "medium", "large"],
        "dimensions": {
          "width": 3000,
          "height": 2000
        },
        "event": {
          "id": "event-id-456",
          "title": "Annual Company Picnic",
          "date": "2025-05-01T12:00:00Z"
        }
      }
    ],
    "count": 1,
    "preferredSize": "medium"
  }
}
```

### Download Photo with Specific Size

When downloading a photo, you can specify which size you want to download.

`GET /organizations/:id/events/:eventId/photos/:photoId/download?size=large`

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| size | string | "original" | Image size to download: "thumbnail", "medium", "large", or "original" |

#### Response

```json
{
  "status": "success",
  "data": {
    "downloadUrl": "https://download-url.example.com/photos/large.jpg?Content-Disposition=...",
    "size": "large"
  }
}
```

## Backward Compatibility

The system maintains backward compatibility with older photos:

- For legacy photos with only a single URL, that URL is used for all size requests
- For photos with the new multi-size structure, all available sizes are provided
- If a requested size isn't available (e.g., original image was smaller), the system automatically falls back to the appropriate size

## Implementation Details

### ImageService Methods

The ImageService class provides several methods for handling image processing:

- `getImageInfo(buffer)`: Analyzes an image buffer to extract format, dimensions, and size information
- `resizeImage(buffer, options, originalWidth)`: Creates resized versions with specific dimensions and quality settings
- `generateImageSizes(buffer, baseKey, fileExtension)`: Processes an image into multiple sizes and prepares S3 keys

### Quality Settings and Format Decisions

The service intelligently handles different image formats:

- JPEG files maintain their format with quality settings based on the size variant
- PNG files with transparency keep their format to preserve transparency
- PNG files without transparency may be converted to JPEG for better compression
- Format detection is automatic based on analyzing the uploaded image

### Size Generation Logic

The service only generates size variants that are smaller than the original:

```javascript
// Example size generation logic
if (originalWidth > ImageService.SIZES.THUMBNAIL.width) {
  // Generate thumbnail size
} else {
  // Skip thumbnail generation - original is already small enough
}

// Similar logic for medium and large sizes
```

This ensures optimal quality and prevents unnecessary processing or storage for smaller images.

### Error Handling

The service includes robust error handling for:
- Invalid image formats
- Processing failures
- S3 storage issues
- Metadata extraction problems

All errors are logged and propagated appropriately to provide clear feedback to users.