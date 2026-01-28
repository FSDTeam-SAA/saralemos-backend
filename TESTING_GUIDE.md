# 🧪 Quick Test Guide - Facebook Post Management

## Prerequisites

- ✅ MongoDB running
- ✅ Valid Facebook access token
- ✅ Server running on port (check your .env)
- ✅ User authenticated with Bearer token

---

## 🚀 Quick Start Testing

### 1. Start Your Server

```bash
npm run dev
```

**Expected Console Output:**

```
📅 Post status verification cron job started (runs every 10 seconds)
🧹 Post cleanup cron job started (runs every hour)
```

---

## 📝 Test Sequence

### Test 1: Create a Draft Post

```bash
curl -X POST http://localhost:YOUR_PORT/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F 'content={"message":"This is a test draft post"}' \
  -F 'pageId=YOUR_PAGE_ID' \
  -F 'postType=TEXT_ONLY' \
  -F 'platforms=["facebook"]' \
  -F 'status=DRAFT'
```

**Expected Response:**

```json
{
  "message": "Saved to drafts",
  "post": {
    "_id": "...",
    "status": "DRAFT"
  }
}
```

**Copy the `_id` for next tests!**

---

### Test 2: Get All Posts

```bash
curl -X GET "http://localhost:YOUR_PORT/api/v1/facebookPost?status=DRAFT" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "status": "DRAFT",
      "content": { "message": "This is a test draft post" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

### Test 3: Get Post by ID

```bash
curl -X GET http://localhost:YOUR_PORT/api/v1/facebookPost/POST_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "status": "DRAFT",
    "content": { "message": "This is a test draft post" }
  }
}
```

---

### Test 4: Update Draft Post

```bash
curl -X PUT http://localhost:YOUR_PORT/api/v1/facebookPost/POST_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F 'content={"message":"Updated draft message!"}' \
  -F 'postType=TEXT_ONLY' \
  -F 'platforms=["facebook"]'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "content": { "message": "Updated draft message!" }
  }
}
```

---

### Test 5: Publish Post to Facebook

```bash
curl -X POST http://localhost:YOUR_PORT/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F 'content={"message":"Test post for real-time verification!"}' \
  -F 'pageId=YOUR_PAGE_ID' \
  -F 'postType=TEXT_ONLY' \
  -F 'platforms=["facebook"]' \
  -F 'status=PUBLISHED'
```

**Expected Response:**

```json
{
  "message": "Successfully published",
  "post": {
    "_id": "...",
    "status": "PUBLISHED",
    "platformData": {
      "facebook": {
        "postId": "123456_789012",
        "status": "PENDING",
        "isVerified": false
      }
    }
  }
}
```

**Save this `_id` for status checking!**

---

### Test 6: Wait & Check Server Logs

**Wait 10-30 seconds** and watch your server console. You should see:

```
Running post status verification cron job...
Found 1 posts to verify
✓ Verified post 64abc123... successfully
Post status verification cron job completed
```

---

### Test 7: Check Real-Time Status

```bash
curl -X GET http://localhost:YOUR_PORT/api/v1/facebookPost/POST_ID_HERE/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response (Success):**

```json
{
  "success": true,
  "data": {
    "postId": "...",
    "status": "PUBLISHED",
    "platforms": {
      "facebook": {
        "status": "PUBLISHED",
        "isVerified": true,
        "postId": "123456_789012",
        "createdTime": "2026-01-29T10:00:00+0000",
        "isPublished": true
      }
    },
    "lastChecked": "2026-01-29T11:30:00Z",
    "checkCount": 3
  }
}
```

**Expected Response (Error - if post failed):**

```json
{
  "success": true,
  "data": {
    "platforms": {
      "facebook": {
        "status": "ERROR",
        "isVerified": false,
        "errorMessage": "Unsupported get request. Object with ID '...' does not exist"
      }
    }
  }
}
```

---

### Test 8: Try to Update Published Post (Should Fail)

```bash
curl -X PUT http://localhost:YOUR_PORT/api/v1/facebookPost/PUBLISHED_POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F 'content={"message":"Try to update"}'
```

**Expected Response:**

```json
{
  "error": "Can only update DRAFT or FAILED posts"
}
```

---

### Test 9: Try to Delete Published Post (Should Fail)

```bash
curl -X DELETE http://localhost:YOUR_PORT/api/v1/facebookPost/PUBLISHED_POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "error": "Can only delete DRAFT or FAILED posts"
}
```

---

### Test 10: Delete Draft Post (Should Work)

```bash
curl -X DELETE http://localhost:YOUR_PORT/api/v1/facebookPost/DRAFT_POST_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

## 📊 Postman Collection

### Setup Postman Environment Variables:

```
BASE_URL: http://localhost:YOUR_PORT
TOKEN: YOUR_BEARER_TOKEN
PAGE_ID: YOUR_FACEBOOK_PAGE_ID
```

### Postman Requests:

#### 1. Create Draft

- Method: POST
- URL: `{{BASE_URL}}/api/v1/facebookPost/finalize`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (form-data):
  - `content`: `{"message":"Draft post"}`
  - `pageId`: `{{PAGE_ID}}`
  - `postType`: `TEXT_ONLY`
  - `platforms`: `["facebook"]`
  - `status`: `DRAFT`

#### 2. Get All Posts

- Method: GET
- URL: `{{BASE_URL}}/api/v1/facebookPost?status=DRAFT&page=1&limit=10`
- Headers: `Authorization: Bearer {{TOKEN}}`

#### 3. Get Post by ID

- Method: GET
- URL: `{{BASE_URL}}/api/v1/facebookPost/:postId`
- Headers: `Authorization: Bearer {{TOKEN}}`

#### 4. Update Draft

- Method: PUT
- URL: `{{BASE_URL}}/api/v1/facebookPost/:postId`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (form-data):
  - `content`: `{"message":"Updated message"}`

#### 5. Delete Draft

- Method: DELETE
- URL: `{{BASE_URL}}/api/v1/facebookPost/:postId`
- Headers: `Authorization: Bearer {{TOKEN}}`

#### 6. Publish Post

- Method: POST
- URL: `{{BASE_URL}}/api/v1/facebookPost/finalize`
- Headers: `Authorization: Bearer {{TOKEN}}`
- Body (form-data):
  - `content`: `{"message":"Published post"}`
  - `pageId`: `{{PAGE_ID}}`
  - `postType`: `TEXT_ONLY`
  - `platforms`: `["facebook"]`
  - `status`: `PUBLISHED`

#### 7. Check Post Status

- Method: GET
- URL: `{{BASE_URL}}/api/v1/facebookPost/:postId/status`
- Headers: `Authorization: Bearer {{TOKEN}}`

---

## 🔍 Monitoring Cron Jobs

### Watch Server Logs

```bash
tail -f logs/combined.log
```

You should see:

```
Running post status verification cron job...
Found X posts to verify
✓ Verified post 64abc123... successfully
Post status verification cron job completed
```

### Check Database Directly (MongoDB)

```javascript
// Connect to MongoDB
use your_database_name;

// Find all posts
db.socialposts.find().pretty();

// Find posts being verified
db.socialposts.find({
  status: { $in: ['PUBLISHED', 'SCHEDULED'] },
  'platformData.facebook.isVerified': false
});

// Check verification history
db.socialposts.find({}, {
  'platformData.facebook.isVerified': 1,
  'platformData.facebook.lastChecked': 1,
  'statusCheckCount': 1,
  'status': 1
}).pretty();
```

---

## ✅ Expected Behavior Checklist

### Draft Posts:

- ☐ Can create draft posts
- ☐ Can update draft posts
- ☐ Can delete draft posts
- ☐ Drafts appear in GET all posts
- ☐ Can get draft by ID

### Published Posts:

- ☐ Can publish posts to Facebook
- ☐ Cannot update published posts
- ☐ Cannot delete published posts
- ☐ Published posts show `platformData.facebook.postId`
- ☐ Initial status is `PENDING` for Facebook

### Real-Time Verification:

- ☐ Cron job runs every 10 seconds
- ☐ Status endpoint returns current Facebook status
- ☐ `isVerified` becomes `true` after successful check
- ☐ `lastChecked` timestamp updates
- ☐ `statusCheckCount` increments
- ☐ Error messages stored when post not found

### Error Handling:

- ☐ Cannot update/delete published posts
- ☐ Invalid post IDs return 404
- ☐ Facebook API errors are captured
- ☐ Posts marked as FAILED after 24 hours

---

## 🐛 Troubleshooting

### Cron job not running?

```bash
# Check if node-cron is installed
npm list node-cron

# Check server logs
tail -f logs/combined.log | grep "cron"
```

### Posts not verifying?

1. Check Facebook access token is valid
2. Verify post actually exists on Facebook
3. Check `platformData.facebook.errorMessage` field
4. Ensure post is less than 24 hours old

### Status endpoint returning errors?

1. Verify user owns the post
2. Check Facebook page access token
3. Verify Facebook Graph API permissions

---

## 📸 Testing with Images

### Upload Image Files:

```bash
curl -X POST http://localhost:YOUR_PORT/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F 'content={"message":"Post with image"}' \
  -F 'pageId=YOUR_PAGE_ID' \
  -F 'postType=SINGLE_IMAGE' \
  -F 'platforms=["facebook"]' \
  -F 'status=PUBLISHED' \
  -F 'postImages=@/path/to/image.jpg'
```

### Or Use Direct URLs:

```bash
curl -X POST http://localhost:YOUR_PORT/api/v1/facebookPost/finalize \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F 'content={"message":"Post with image URL"}' \
  -F 'pageId=YOUR_PAGE_ID' \
  -F 'postType=SINGLE_IMAGE' \
  -F 'platforms=["facebook"]' \
  -F 'status=PUBLISHED' \
  -F 'mediaUrls=["https://example.com/image.jpg"]'
```

---

## 🎯 Success Criteria

### All tests pass if:

1. ✅ Drafts can be created, updated, and deleted
2. ✅ Posts publish to Facebook successfully
3. ✅ Cron job verifies posts automatically
4. ✅ Status endpoint returns accurate data
5. ✅ Published posts cannot be modified
6. ✅ Error messages are captured and stored
7. ✅ Pagination works correctly
8. ✅ Filters work (status, platform, postType)

---

**Happy Testing!** 🎉

If any test fails, check:

1. Server logs for error messages
2. MongoDB for data integrity
3. Facebook access token validity
4. Network connectivity to Facebook Graph API
