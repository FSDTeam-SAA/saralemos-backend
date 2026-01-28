# Facebook Post Management API Guide

## 📋 Overview

Complete API documentation for managing Facebook/Instagram posts with real-time status tracking.

---

## 🚀 API Endpoints

### Base URL

```
/api/v1/facebookPost
```

---

## 1️⃣ Create/Finalize Post

**Endpoint:** `POST /api/v1/facebookPost/finalize`

**Description:** Create a draft, publish immediately, or schedule a post to Facebook/Instagram

**Authentication:** Required (Bearer Token)

**Request Body (Multipart Form-Data):**

```javascript
{
  "content": {
    "message": "Your post message here with #hashtags"
  },
  "pageId": "123456789",  // Facebook Page ID
  "postType": "SINGLE_IMAGE",  // TEXT_ONLY | SINGLE_IMAGE | CAROUSEL | VIDEO
  "platforms": ["facebook", "instagram"],  // Array of platforms
  "status": "PUBLISHED",  // DRAFT | SCHEDULED | PUBLISHED
  "scheduledTime": "2026-02-01T10:00:00Z",  // Required if status is SCHEDULED

  // OPTION 1: Upload files
  "postImages": [File, File],  // Multiple image files

  // OR OPTION 2: Provide direct URLs
  "mediaUrls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
}
```

**Response:**

```json
{
  "message": "Successfully published",
  "post": {
    "_id": "64abc123...",
    "userId": "64xyz...",
    "pageId": "123456789",
    "content": {
      "message": "Your post message"
    },
    "media": [
      {
        "url": "https://cloudinary.com/...",
        "mediaType": "IMAGE"
      }
    ],
    "postType": "SINGLE_IMAGE",
    "platforms": ["facebook"],
    "status": "PUBLISHED",
    "platformData": {
      "facebook": {
        "postId": "123456_789012",
        "status": "PENDING",
        "isVerified": false
      }
    },
    "createdAt": "2026-01-29T10:00:00Z",
    "updatedAt": "2026-01-29T10:00:00Z"
  }
}
```

---

## 2️⃣ Get All Posts

**Endpoint:** `GET /api/v1/facebookPost`

**Description:** Retrieve all posts with filtering and pagination

**Authentication:** Required

**Query Parameters:**

```
?status=DRAFT              // Filter by status (DRAFT, SCHEDULED, PUBLISHED, FAILED)
&platform=facebook         // Filter by platform (facebook, instagram)
&postType=SINGLE_IMAGE     // Filter by type
&page=1                    // Page number (default: 1)
&limit=20                  // Items per page (default: 20)
```

**Example Request:**

```bash
GET /api/v1/facebookPost?status=PUBLISHED&page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc123...",
      "userId": "64xyz...",
      "content": {
        "message": "Post message"
      },
      "status": "PUBLISHED",
      "platforms": ["facebook"],
      "platformData": {
        "facebook": {
          "postId": "123456_789012",
          "status": "PUBLISHED",
          "isVerified": true,
          "lastChecked": "2026-01-29T10:05:00Z"
        }
      },
      "createdAt": "2026-01-29T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

## 3️⃣ Get Post by ID

**Endpoint:** `GET /api/v1/facebookPost/:id`

**Description:** Get detailed information about a specific post

**Authentication:** Required

**Example Request:**

```bash
GET /api/v1/facebookPost/64abc123def456789
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "userId": "64xyz...",
    "pageId": "123456789",
    "content": {
      "message": "Post message",
      "hashtags": ["#realestate", "#luxury"]
    },
    "media": [
      {
        "url": "https://cloudinary.com/image.jpg",
        "mediaType": "IMAGE"
      }
    ],
    "postType": "SINGLE_IMAGE",
    "platforms": ["facebook", "instagram"],
    "status": "PUBLISHED",
    "platformData": {
      "facebook": {
        "postId": "123456_789012",
        "status": "PUBLISHED",
        "isVerified": true,
        "lastChecked": "2026-01-29T10:05:00Z"
      },
      "instagram": {
        "mediaId": "18123456789",
        "status": "PUBLISHED",
        "isVerified": true,
        "lastChecked": "2026-01-29T10:05:00Z"
      }
    },
    "lastStatusCheck": "2026-01-29T10:05:00Z",
    "statusCheckCount": 5,
    "retryCount": 0,
    "createdAt": "2026-01-29T10:00:00Z",
    "updatedAt": "2026-01-29T10:05:00Z"
  }
}
```

---

## 4️⃣ Update Post

**Endpoint:** `PUT /api/v1/facebookPost/:id`

**Description:** Update a draft or failed post (cannot update published posts)

**Authentication:** Required

**Request Body (Multipart Form-Data):**

```javascript
{
  "content": {
    "message": "Updated message"
  },
  "postType": "SINGLE_IMAGE",
  "platforms": ["facebook"],
  "scheduledTime": "2026-02-02T15:00:00Z",

  // Optional: Upload new images
  "postImages": [File],

  // OR provide new URLs
  "mediaUrls": ["https://example.com/new-image.jpg"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "_id": "64abc123...",
    "content": {
      "message": "Updated message"
    },
    "updatedAt": "2026-01-29T11:00:00Z"
  }
}
```

**Error (if trying to update published post):**

```json
{
  "error": "Can only update DRAFT or FAILED posts"
}
```

---

## 5️⃣ Delete Post

**Endpoint:** `DELETE /api/v1/facebookPost/:id`

**Description:** Delete a draft or failed post (cannot delete published posts)

**Authentication:** Required

**Example Request:**

```bash
DELETE /api/v1/facebookPost/64abc123def456789
```

**Response:**

```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

**Error (if trying to delete published post):**

```json
{
  "error": "Can only delete DRAFT or FAILED posts"
}
```

---

## 6️⃣ Get Real-Time Post Status

**Endpoint:** `GET /api/v1/facebookPost/:id/status`

**Description:** Check the current status of a post by querying Facebook/Instagram API in real-time

**Authentication:** Required

**Example Request:**

```bash
GET /api/v1/facebookPost/64abc123def456789/status
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "postId": "64abc123...",
    "status": "PUBLISHED",
    "platforms": {
      "facebook": {
        "status": "PUBLISHED",
        "isVerified": true,
        "postId": "123456_789012",
        "createdTime": "2026-01-29T10:00:00+0000",
        "isPublished": true
      },
      "instagram": {
        "status": "PUBLISHED",
        "isVerified": true,
        "mediaId": "18123456789",
        "timestamp": "2026-01-29T10:00:00+0000"
      }
    },
    "lastChecked": "2026-01-29T11:30:00Z",
    "checkCount": 8
  }
}
```

**Response (Error - Post not found on Facebook):**

```json
{
  "success": true,
  "data": {
    "postId": "64abc123...",
    "status": "PUBLISHED",
    "platforms": {
      "facebook": {
        "status": "ERROR",
        "isVerified": false,
        "errorMessage": "Unsupported get request. Object with ID '123456_789012' does not exist"
      }
    },
    "lastChecked": "2026-01-29T11:30:00Z",
    "checkCount": 8
  }
}
```

**Response (Draft Post):**

```json
{
  "success": true,
  "data": {
    "status": "DRAFT",
    "message": "This is a draft post, not yet published"
  }
}
```

---

## 🤖 Automated Cron Jobs

### Post Status Verification Cron

- **Frequency:** Every 10 seconds
- **Purpose:** Automatically verify if posts were actually published to Facebook/Instagram
- **Scope:** Only checks posts created within last 24 hours
- **Limit:** Stops checking after 20 attempts per post
- **Updates:** Sets `platformData.*.isVerified = true` when confirmed

**What it does:**

1. Finds posts with status `PUBLISHED` or `SCHEDULED`
2. Queries Facebook/Instagram Graph API to confirm post exists
3. Updates `platformData.*.status` to `PUBLISHED` or `ERROR`
4. Stores error messages if posting failed
5. Tracks `lastChecked` and `statusCheckCount`

---

### Post Cleanup Cron

- **Frequency:** Every hour
- **Purpose:** Mark old unverified posts as FAILED
- **Scope:** Posts older than 24 hours that couldn't be verified after 20 attempts
- **Action:** Sets status to `FAILED` with error message

---

## 📊 Post Status Flow

```
User creates post → status: DRAFT
                         ↓
User publishes → status: PUBLISHED (platformData.*.status: PENDING)
                         ↓
Cron job checks every 10s → Queries Facebook API
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
  Post found on FB              Post not found
         ↓                               ↓
platformData.facebook.status:   platformData.facebook.status:
  PUBLISHED (isVerified: true)    ERROR (errorMessage stored)
```

---

## 🔒 Status Types

### Main Status

- `DRAFT` - Saved locally, not sent to Facebook
- `SCHEDULED` - Sent to Facebook with future publish time
- `PUBLISHED` - Sent to Facebook for immediate posting
- `FAILED` - Failed to post or verify after 24 hours

### Platform-Specific Status

- `PENDING` - Just published, not yet verified
- `PUBLISHED` - Confirmed to exist on Facebook/Instagram
- `ERROR` - Failed to publish or post not found
- `SCHEDULED` - Scheduled for future publish

---

## 💡 Usage Examples

### Example 1: Create Draft Post

```bash
curl -X POST http://localhost:5000/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'content={"message":"Check out this property!"}' \
  -F 'pageId=123456789' \
  -F 'postType=SINGLE_IMAGE' \
  -F 'platforms=["facebook"]' \
  -F 'status=DRAFT' \
  -F 'postImages=@/path/to/image.jpg'
```

### Example 2: Publish Post Immediately

```bash
curl -X POST http://localhost:5000/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'content={"message":"New listing available!"}' \
  -F 'pageId=123456789' \
  -F 'postType=SINGLE_IMAGE' \
  -F 'platforms=["facebook","instagram"]' \
  -F 'status=PUBLISHED' \
  -F 'postImages=@/path/to/image.jpg'
```

### Example 3: Schedule Post for Later

```bash
curl -X POST http://localhost:5000/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'content={"message":"Coming soon!"}' \
  -F 'pageId=123456789' \
  -F 'postType=SINGLE_IMAGE' \
  -F 'platforms=["facebook"]' \
  -F 'status=SCHEDULED' \
  -F 'scheduledTime=2026-02-01T10:00:00Z' \
  -F 'postImages=@/path/to/image.jpg'
```

### Example 4: Update Draft Post

```bash
curl -X PUT http://localhost:5000/api/v1/facebookPost/64abc123def456789 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'content={"message":"Updated message"}' \
  -F 'postImages=@/path/to/new-image.jpg'
```

### Example 5: Check Post Status

```bash
curl -X GET http://localhost:5000/api/v1/facebookPost/64abc123def456789/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 6: Get All Published Posts

```bash
curl -X GET "http://localhost:5000/api/v1/facebookPost?status=PUBLISHED&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 7: Delete Draft Post

```bash
curl -X DELETE http://localhost:5000/api/v1/facebookPost/64abc123def456789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🛠️ Database Schema Updates

### New Fields Added to SocialPost Model:

```javascript
platformData: {
  facebook: {
    postId: String,
    status: String,  // SCHEDULED | PUBLISHED | ERROR | PENDING
    errorMessage: String,  // NEW
    lastChecked: Date,  // NEW
    isVerified: Boolean  // NEW (default: false)
  },
  instagram: {
    mediaId: String,
    status: String,  // SCHEDULED | PUBLISHED | ERROR | PENDING
    errorMessage: String,  // NEW
    lastChecked: Date,  // NEW
    isVerified: Boolean  // NEW (default: false)
  }
},

// Status verification tracking
lastStatusCheck: Date,  // NEW
statusCheckCount: Number,  // NEW (default: 0)
retryCount: Number,  // NEW (default: 0)
maxRetries: Number,  // NEW (default: 3)
```

---

## ⚡ Key Features

✅ **Real-time status tracking** - Know if posts actually published  
✅ **Automatic verification** - Cron job checks every 10 seconds  
✅ **Error tracking** - Stores Facebook API error messages  
✅ **Draft management** - Save posts for later editing  
✅ **Update capability** - Modify drafts before publishing  
✅ **Pagination** - Efficient loading of large post lists  
✅ **Filtering** - Search by status, platform, type  
✅ **Multi-platform** - Facebook & Instagram support  
✅ **Scheduled posts** - Auto-publish at specified time  
✅ **Status history** - Track verification attempts

---

## 🎯 Best Practices

1. **Always check status after publishing** - Use the `/status` endpoint
2. **Monitor failed posts** - Query `?status=FAILED` regularly
3. **Let cron job do its work** - Wait at least 10-30 seconds before manual status check
4. **Update only drafts** - Published posts cannot be edited
5. **Use pagination** - Don't load all posts at once
6. **Handle errors gracefully** - Check `platformData.*.errorMessage` for details

---

## 🐛 Troubleshooting

### Post shows PUBLISHED but not on Facebook?

- Check `/api/v1/facebookPost/:id/status` for real-time verification
- Look at `platformData.facebook.errorMessage` for details
- Facebook access token might have expired

### Cron job not updating status?

- Check server logs for cron job output
- Verify posts are less than 24 hours old
- Ensure `statusCheckCount` is less than 20

### Cannot update/delete post?

- Only DRAFT and FAILED posts can be updated/deleted
- Check `post.status` field

---

## 📝 Notes

- Posts are automatically marked as `FAILED` after 24 hours if unverified
- Cron job stops checking after 20 attempts per post
- Facebook Graph API rate limits apply
- Access tokens must be valid and have proper permissions

---

**Created:** January 29, 2026  
**Version:** 1.0  
**Maintained by:** Sara Lemos Backend Team
