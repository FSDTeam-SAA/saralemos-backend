# SaraLemos Backend API - Postman Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [User Management](#user-management-endpoints)
   - [AI Ad Generation](#ai-ad-generation-endpoints)
   - [Subscription & Payment](#subscription--payment-endpoints)
   - [CMS & Content](#cms--content-endpoints)
   - [Dashboard Analytics](#dashboard-analytics-endpoints)
   - [Testimonials](#testimonials-endpoints)
   - [Facebook Posts](#facebook-posts-endpoints)
   - [Listings](#listings-endpoints)
   - [Facebook Ad Management](#facebook-ad-management-endpoints)
   - [Media Connection](#media-connection-endpoints)
   - [Contact Form](#contact-form-endpoints)
5. [Environment Variables](#environment-variables)
6. [Common Response Formats](#common-response-formats)

---

## API Overview

**SaraLemos Backend** is a comprehensive Node.js/Express API for managing social media marketing, listings, subscriptions, and content management.

### Key Features:

- User authentication and profile management
- AI-powered ad generation
- Subscription and payment processing (Stripe)
- Facebook post scheduling and publishing
- Yacht listing management
- Dashboard analytics
- CMS content management
- Testimonial management

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication.

### Authentication Flow:

1. **Register** - Create a new account
2. **Login** - Get access token and refresh token
3. **Use Token** - Include token in `Authorization` header
4. **Refresh** - Use refresh token to get new access token

### Headers:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Base URL

```
http://localhost:5000/api
or
https://api.saralemos.com/api
```

All endpoints are prefixed with `/v1`

Example: `GET http://localhost:5000/api/v1/auth/login`

---

## API Endpoints

---

## Authentication Endpoints

### 1. Register User

**POST** `/v1/auth/register`

Register a new user account with profile information.

**Request Headers:**

```
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | Password (min 6 chars) |
| firstName | string | Yes | First name |
| lastName | string | Yes | Last name |
| phone | string | No | Phone number |
| userType | enum | Yes | 'user' or 'admin' or 'seller' |
| companyName | string | No | Company name |
| profilePhoto | file | No | Profile image (jpg, png) |
| companyLogo | file | No | Company logo (jpg, png) |
| bannerImage | file | No | Banner image (jpg, png) |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "user",
    "profilePhoto": "https://...",
    "createdAt": "2026-05-20T10:30:00Z"
  },
  "token": "eyJhbGc..."
}
```

---

### 2. Login User

**POST** `/v1/auth/login`

Authenticate user and receive tokens.

**Request Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "userType": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

---

### 3. Refresh Access Token

**POST** `/v1/auth/refresh-access-token`

Generate a new access token using refresh token.

**Request Body (JSON):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

---

### 4. Forget Password

**POST** `/v1/auth/forget-password`

Request password reset code via email.

**Request Body (JSON):**

```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password reset code sent to email"
}
```

---

### 5. Verify Reset Code

**POST** `/v1/auth/verify-code`

Verify the password reset code sent to email.

**Request Body (JSON):**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Code verified successfully",
  "resetToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 6. Reset Password

**POST** `/v1/auth/reset-password`

Reset password with verified code.

**Request Body (JSON):**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newPassword123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### 7. Change Password (Protected)

**POST** `/v1/auth/change-password`

Change password for authenticated user.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body (JSON):**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 8. Logout (Protected)

**POST** `/v1/auth/logout`

Logout user and invalidate tokens.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:** (empty)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Management Endpoints

### 1. Get User Profile (Protected)

**GET** `/v1/user/me`

Get current authenticated user's profile.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "_id": "user123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "userType": "user",
    "profilePhoto": "https://...",
    "companyName": "My Company",
    "createdAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 2. Update User Profile (Protected)

**PUT** `/v1/user/me`

Update current user's profile information.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body (JSON):**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+9876543210",
  "companyName": "New Company",
  "bio": "Updated bio"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    /* updated user data */
  }
}
```

---

### 3. Delete Own Account (Protected)

**DELETE** `/v1/user/me`

Delete current user's account permanently.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

### 4. Upload Avatar (Protected)

**POST** `/v1/user/upload-avatar`

Upload or create a single profile avatar.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| profileImage | file | Yes |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "avatar": {
    "_id": "avatar123",
    "userId": "user123",
    "imageUrl": "https://cloudinary.com/...",
    "uploadedAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 5. Update Avatar (Protected)

**PUT** `/v1/user/upload-avatar`

Update existing avatar.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| profileImage | file | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Avatar updated successfully",
  "avatar": {
    /* updated avatar */
  }
}
```

---

### 6. Delete Avatar (Protected)

**DELETE** `/v1/user/upload-avatar`

Delete user's avatar.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

---

### 7. Upload Multiple Avatars (Protected)

**POST** `/v1/user/upload-multiple-avatar`

Upload multiple profile avatars (up to 5).

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| multiProfileImage | file[] | Yes |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Multiple avatars uploaded successfully",
  "avatars": [
    /* array of avatar objects */
  ]
}
```

---

### 8. Update Multiple Avatars (Protected)

**PUT** `/v1/user/upload-multiple-avatar`

Update multiple avatars.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Multiple avatars updated successfully"
}
```

---

### 9. Delete Multiple Avatars (Protected)

**DELETE** `/v1/user/upload-multiple-avatar`

Delete all multiple avatars.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Multiple avatars deleted successfully"
}
```

---

### 10. Upload User PDF (Protected)

**POST** `/v1/user/upload-file`

Upload a PDF file for user profile.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| userPDF | file | Yes |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "_id": "pdf123",
    "fileUrl": "https://..."
  }
}
```

---

### 11. Update User PDF (Protected)

**PUT** `/v1/user/upload-file`

Update user's PDF file.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "File updated successfully"
}
```

---

### 12. Delete User PDF (Protected)

**DELETE** `/v1/user/upload-file`

Delete user's PDF file.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### 13. Get All Users (Admin Protected)

**GET** `/v1/user/all-users`

Get all users in system (Admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| search | string | Search by name or email |

**Response (200 OK):**

```json
{
  "success": true,
  "users": [
    /* array of user objects */
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

---

### 14. Get All Admins (Admin Protected)

**GET** `/v1/user/all-admins`

Get all admin users (Admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "admins": [
    /* array of admin objects */
  ]
}
```

---

### 15. Get All Sellers (Admin Protected)

**GET** `/v1/user/all-sellers`

Get all seller users (Admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "sellers": [
    /* array of seller objects */
  ]
}
```

---

### 16. Get User by ID (Admin Protected)

**GET** `/v1/user/:id`

Get specific user by ID (Admin/User).

**Headers:**

```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | User ID |

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    /* user object */
  }
}
```

---

### 17. Update User (Admin Protected)

**PUT** `/v1/user/:id`

Update user by ID (Admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "User updated successfully"
}
```

---

### 18. Delete User (Admin Protected)

**DELETE** `/v1/user/:id`

Delete user by ID (Admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 19. Update Allowed Listings (Protected)

**PUT** `/v1/user/allowed-listings`

Update allowed listings count for user.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body (JSON):**

```json
{
  "userId": "user123",
  "allowedListings": 10
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Allowed listings updated"
}
```

---

## AI Ad Generation Endpoints

### 1. Generate Ad with AI

**POST** `/v1/ai/generate-ad`

Generate ad content using OpenAI GPT.

**Request Body (JSON):**

```json
{
  "productName": "Luxury Yacht",
  "description": "High-end yacht for sale",
  "targetAudience": "Wealthy entrepreneurs",
  "tone": "professional",
  "platform": "facebook",
  "keywords": ["luxury", "yacht", "premium"]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "ad": {
    "headline": "Discover Luxury on Water",
    "description": "Experience elegance with our premium yacht collection",
    "callToAction": "Shop Now",
    "creativeText": "Full ad copy..."
  }
}
```

---

### 2. Save Generated Ad (Protected)

**POST** `/v1/ai/save`

Save generated ad to database.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| adName | string | Yes |
| adContent | string | Yes |
| creativeImages | file[] | No |
| adVariants | string | No |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Ad saved successfully",
  "ad": {
    "_id": "ad123",
    "userId": "user123",
    "adName": "Summer Campaign",
    "creativeImages": [
      /* image URLs */
    ]
  }
}
```

---

### 3. Get All Ads (Protected)

**GET** `/v1/ai/all`

Get all ads created by user.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | enum | DRAFT, PUBLISHED, ARCHIVED |

**Response (200 OK):**

```json
{
  "success": true,
  "ads": [
    /* array of ad objects */
  ],
  "pagination": {
    /* pagination info */
  }
}
```

---

### 4. Get Ad by ID (Protected)

**GET** `/v1/ai/:id`

Get specific ad by ID.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "ad": {
    /* ad object */
  }
}
```

---

### 5. Publish Ad (Protected)

**POST** `/v1/ai/final-post`

Publish ad to Facebook.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body (JSON):**

```json
{
  "adId": "ad123",
  "pageId": "facebook_page_123",
  "platform": "facebook"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Ad published successfully",
  "postId": "facebook_post_123"
}
```

---

## Subscription & Payment Endpoints

### 1. Create Subscription Plan (Admin)

**POST** `/v1/subscription/create`

Create a new subscription plan.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body (JSON):**

```json
{
  "planName": "Premium",
  "description": "Premium subscription plan",
  "price": 99.99,
  "currency": "USD",
  "billingCycle": "monthly",
  "features": ["Unlimited posts", "Analytics dashboard", "Priority support"],
  "isActive": true
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Plan created successfully",
  "plan": {
    "_id": "plan123",
    "planName": "Premium",
    "price": 99.99
  }
}
```

---

### 2. Get All Plans

**GET** `/v1/subscription/get-all`

Get all subscription plans.

**Response (200 OK):**

```json
{
  "success": true,
  "plans": [
    {
      "_id": "plan123",
      "planName": "Basic",
      "price": 29.99,
      "features": [
        /* array of features */
      ],
      "billingCycle": "monthly"
    }
  ]
}
```

---

### 3. Get Plan by ID

**GET** `/v1/subscription/:id`

Get specific plan details.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plan ID |

**Response (200 OK):**

```json
{
  "success": true,
  "plan": {
    /* plan object */
  }
}
```

---

### 4. Get Plan Features

**GET** `/v1/subscription/features`

Get all plan features comparison.

**Response (200 OK):**

```json
{
  "success": true,
  "features": [
    {
      "featureName": "Unlimited Posts",
      "plans": ["Basic", "Premium", "Enterprise"]
    }
  ]
}
```

---

### 5. Update Plan (Admin)

**PUT** `/v1/subscription/:id`

Update subscription plan.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body (JSON):**

```json
{
  "price": 119.99,
  "features": [
    /* updated features */
  ]
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Plan updated successfully"
}
```

---

### 6. Delete Plan (Admin)

**DELETE** `/v1/subscription/delete/:id`

Delete subscription plan.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Plan deleted successfully"
}
```

---

### 7. Create Payment Checkout

**POST** `/v1/subscription/payment/create-checkout`

Create Stripe checkout session for subscription.

**Request Body (JSON):**

```json
{
  "planId": "plan123",
  "userId": "user123",
  "successUrl": "https://app.saralemos.com/success",
  "cancelUrl": "https://app.saralemos.com/cancel"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "sessionId": "cs_1234567890",
  "checkoutUrl": "https://checkout.stripe.com/...",
  "expiresAt": "2026-05-20T11:30:00Z"
}
```

---

### 8. Get Payment Details

**GET** `/v1/subscription/payment/:sessionId`

Get payment details for checkout session.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string | Stripe session ID |

**Response (200 OK):**

```json
{
  "success": true,
  "payment": {
    "sessionId": "cs_1234567890",
    "status": "complete",
    "amount": 99.99,
    "currency": "USD",
    "paidAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 9. Get Payment History

**GET** `/v1/subscription/payment/history/:userId`

Get user's payment history.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | User ID |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |

**Response (200 OK):**

```json
{
  "success": true,
  "payments": [
    /* array of payment objects */
  ],
  "pagination": {
    /* pagination info */
  }
}
```

---

### 10. Verify Payment Status

**GET** `/v1/subscription/payment/verify/:sessionId`

Verify if payment was successful.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string | Stripe session ID |

**Response (200 OK):**

```json
{
  "success": true,
  "verified": true,
  "paymentStatus": "complete",
  "subscription": {
    "planId": "plan123",
    "startDate": "2026-05-20",
    "renewalDate": "2026-06-20"
  }
}
```

---

### 11. Get Payment Metrics (Analytics)

**GET** `/v1/subscription/metrics`

Get payment and subscription metrics.

**Response (200 OK):**

```json
{
  "success": true,
  "metrics": {
    "totalRevenue": 10000,
    "activeSubscriptions": 150,
    "monthlyRecurringRevenue": 5000,
    "churnRate": 5.2
  }
}
```

---

### 12. Get Plan Analytics

**GET** `/v1/subscription/plan/:planId`

Get analytics for specific plan.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| planId | string | Plan ID |

**Response (200 OK):**

```json
{
  "success": true,
  "planAnalytics": {
    "planName": "Premium",
    "subscribers": 85,
    "revenue": 8415.15,
    "conversionRate": 12.5
  }
}
```

---

### 13. Get Dashboard Overview

**GET** `/v1/subscription/dashboard/overview`

Get complete subscription dashboard overview.

**Response (200 OK):**

```json
{
  "success": true,
  "overview": {
    "totalUsers": 500,
    "activeSubscriptions": 150,
    "revenue": {
      "thisMonth": 5000,
      "lastMonth": 4800,
      "growth": 4.2
    },
    "plans": [
      /* plan statistics */
    ]
  }
}
```

---

## CMS & Content Endpoints

### 1. Upload CMS Asset

**POST** `/v1/cms/upload`

Upload media asset to CMS.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file[] | Yes | Media files (up to 5) |
| assetType | enum | Yes | image, video, document |
| tags | string[] | No | Asset tags |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Assets uploaded successfully",
  "assets": [
    {
      "_id": "asset123",
      "fileUrl": "https://cloudinary.com/...",
      "assetType": "image",
      "uploadedAt": "2026-05-20T10:30:00Z"
    }
  ]
}
```

---

### 2. Get All CMS Assets

**GET** `/v1/cms/assets`

Get all CMS assets.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| assetType | enum | Filter by type |
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search by filename |

**Response (200 OK):**

```json
{
  "success": true,
  "assets": [
    /* array of asset objects */
  ],
  "pagination": {
    /* pagination info */
  }
}
```

---

### 3. Get CMS Asset by ID

**GET** `/v1/cms/assets/:id`

Get specific asset details.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Asset ID |

**Response (200 OK):**

```json
{
  "success": true,
  "asset": {
    "_id": "asset123",
    "fileUrl": "https://...",
    "fileName": "banner.jpg",
    "fileSize": 245000,
    "uploadedAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 4. Update CMS Asset

**PUT** `/v1/cms/update/:id`

Update CMS asset.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Asset ID |

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| file | file[] | No |
| tags | string[] | No |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Asset updated successfully"
}
```

---

### 5. Delete CMS Asset

**DELETE** `/v1/cms/delete/:id`

Delete CMS asset.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

---

### 6. Create Blog Post

**POST** `/v1/cms/blogs`

Create a new blog post.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Blog title |
| slug | string | Yes | URL slug |
| content | string | Yes | Blog content (HTML) |
| excerpt | string | Yes | Short description |
| thumbnail | file | Yes | Featured image |
| tags | string[] | No | Blog tags |
| category | string | No | Blog category |
| author | string | Yes | Author name |
| isPublished | boolean | No | Publish status |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Blog created successfully",
  "blog": {
    "_id": "blog123",
    "title": "Getting Started with Social Media",
    "slug": "getting-started-social-media",
    "thumbnailUrl": "https://...",
    "createdAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 7. Get All Blog Posts

**GET** `/v1/cms/blogs`

Get all blog posts.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| category | string | Filter by category |
| search | string | Search by title |
| isPublished | boolean | Filter by status |

**Response (200 OK):**

```json
{
  "success": true,
  "blogs": [
    /* array of blog objects */
  ],
  "pagination": {
    /* pagination info */
  }
}
```

---

### 8. Get Blog by ID

**GET** `/v1/cms/blogs/:id`

Get specific blog post.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Blog ID |

**Response (200 OK):**

```json
{
  "success": true,
  "blog": {
    "_id": "blog123",
    "title": "Getting Started",
    "content": "...",
    "thumbnail": "https://...",
    "views": 150,
    "createdAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 9. Update Blog Post

**PUT** `/v1/cms/blogs/:id`

Update blog post.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Blog ID |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Blog updated successfully"
}
```

---

### 10. Delete Blog Post

**DELETE** `/v1/cms/blogs/:id`

Delete blog post.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```

---

## Dashboard Analytics Endpoints

### 1. Get Dashboard Overview

**GET** `/v1/dashboard/overview`

Get complete dashboard overview.

**Response (200 OK):**

```json
{
  "success": true,
  "overview": {
    "totalUsers": 500,
    "activeUsers": 350,
    "totalRevenue": 50000,
    "conversionRate": 12.5,
    "topPerformingAds": [
      /* top ads */
    ],
    "recentActivity": [
      /* recent activities */
    ]
  }
}
```

---

### 2. Get User Analytics

**GET** `/v1/dashboard/user-analytics`

Get monthly user analytics for chart.

**Response (200 OK):**

```json
{
  "success": true,
  "analytics": [
    {
      "month": "January",
      "newUsers": 45,
      "activeUsers": 320,
      "churnedUsers": 5
    }
  ]
}
```

---

### 3. Get Revenue Trend

**GET** `/v1/dashboard/revenue-trend`

Get monthly revenue trend data.

**Response (200 OK):**

```json
{
  "success": true,
  "revenue": [
    {
      "month": "January",
      "totalRevenue": 5000,
      "subscriptionRevenue": 4500,
      "adRevenue": 500
    }
  ]
}
```

---

### 4. Get User Analytics by Date Range

**GET** `/v1/dashboard/user-analytics-range`

Get user analytics for specific date range.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Start date (YYYY-MM-DD) |
| endDate | string | Yes | End date (YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "success": true,
  "analytics": [
    /* date range analytics */
  ]
}
```

---

### 5. Get Revenue Trend by Date Range

**GET** `/v1/dashboard/revenue-trend-range`

Get revenue trend for specific date range.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | Yes | Start date (YYYY-MM-DD) |
| endDate | string | Yes | End date (YYYY-MM-DD) |

**Response (200 OK):**

```json
{
  "success": true,
  "revenue": [
    /* date range revenue */
  ]
}
```

---

### 6. Get Client Dashboard (Protected)

**GET** `/v1/dashboard/client/:userId`

Get client-specific dashboard data.

**Headers:**

```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | User ID |

**Response (200 OK):**

```json
{
  "success": true,
  "clientDashboard": {
    "activeListings": 10,
    "activeCampaigns": 5,
    "totalClicks": 1250,
    "totalImpressions": 5000,
    "conversionRate": 8.5,
    "listings": [
      /* user listings */
    ],
    "campaigns": [
      /* user campaigns */
    ]
  }
}
```

---

## Testimonials Endpoints

### 1. Get Active Testimonials

**GET** `/v1/testimonial/active`

Get all published testimonials.

**Response (200 OK):**

```json
{
  "success": true,
  "testimonials": [
    {
      "_id": "testimonial123",
      "clientName": "John Doe",
      "content": "Great service!",
      "image": "https://...",
      "rating": 5,
      "isActive": true
    }
  ]
}
```

---

### 2. Create Testimonial (Admin Protected)

**POST** `/v1/testimonial/create`

Create new testimonial.

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| clientName | string | Yes |
| content | string | Yes |
| rating | number | Yes |
| image | file | Yes |
| company | string | No |
| position | string | No |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Testimonial created successfully",
  "testimonial": {
    /* testimonial object */
  }
}
```

---

### 3. Get All Testimonials (Admin Protected)

**GET** `/v1/testimonial/all`

Get all testimonials (admin only).

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "testimonials": [
    /* array of testimonial objects */
  ]
}
```

---

### 4. Get Testimonial by ID (Admin Protected)

**GET** `/v1/testimonial/:id`

Get specific testimonial.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "testimonial": {
    /* testimonial object */
  }
}
```

---

### 5. Update Testimonial (Admin Protected)

**PUT** `/v1/testimonial/:id`

Update testimonial.

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Testimonial updated successfully"
}
```

---

### 6. Delete Testimonial (Admin Protected)

**DELETE** `/v1/testimonial/:id`

Delete testimonial.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Testimonial deleted successfully"
}
```

---

## Facebook Posts Endpoints

### 1. Create/Finalize Post (Protected)

**POST** `/v1/facebookPost/finalize`

Create draft, schedule, or publish Facebook post.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | Post text content |
| postImages | file[] | No | Post images (up to 10) |
| mediaUrls | string[] | No | Direct media URLs |
| platforms | string[] | Yes | ['facebook', 'instagram'] |
| postType | enum | Yes | TEXT_ONLY, SINGLE_IMAGE, CAROUSEL, VIDEO |
| status | enum | Yes | DRAFT, SCHEDULED, PUBLISHED |
| scheduledTime | string | No | ISO datetime for scheduling |
| pageId | string | Yes | Facebook page ID |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Post created successfully",
  "post": {
    "_id": "post123",
    "content": "Check out our latest...",
    "status": "DRAFT",
    "createdAt": "2026-05-20T10:30:00Z",
    "images": [
      /* image URLs */
    ]
  }
}
```

---

### 2. Get All Posts (Protected)

**GET** `/v1/facebookPost/`

Get user's posts with filters.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | enum | DRAFT, SCHEDULED, PUBLISHED, FAILED |
| platform | string | facebook, instagram |
| postType | enum | TEXT_ONLY, SINGLE_IMAGE, CAROUSEL, VIDEO |
| page | number | Page number |
| limit | number | Items per page |

**Response (200 OK):**

```json
{
  "success": true,
  "posts": [
    /* array of post objects */
  ],
  "pagination": {
    /* pagination info */
  }
}
```

---

### 3. Get Post by ID (Protected)

**GET** `/v1/facebookPost/:id`

Get specific post details.

**Headers:**

```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Post ID |

**Response (200 OK):**

```json
{
  "success": true,
  "post": {
    "_id": "post123",
    "content": "Post content...",
    "status": "PUBLISHED",
    "platforms": ["facebook"],
    "images": [
      /* image URLs */
    ],
    "engagement": {
      "likes": 150,
      "comments": 25,
      "shares": 10
    }
  }
}
```

---

### 4. Get Post Status (Protected)

**GET** `/v1/facebookPost/:id/status`

Get real-time post status from Facebook API.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "status": {
    "postId": "post123",
    "facebookStatus": "PUBLISHED",
    "engagement": {
      "likes": 150,
      "comments": 25,
      "shares": 10,
      "impressions": 2500,
      "reach": 1800
    },
    "lastUpdated": "2026-05-20T15:30:00Z"
  }
}
```

---

### 5. Update Post (Protected)

**PUT** `/v1/facebookPost/:id`

Update draft or failed post.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Post ID |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Post updated successfully"
}
```

---

### 6. Publish Draft Post (Protected)

**POST** `/v1/facebookPost/:id/publish`

Publish a draft post to Facebook.

**Headers:**

```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Post ID |

**Request Body (JSON):**

```json
{
  "immediatePublish": true,
  "pageId": "facebook_page_123"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Post published successfully",
  "facebookPostId": "facebook_post_456",
  "publishedAt": "2026-05-20T10:30:00Z"
}
```

---

### 7. Delete Post (Protected)

**DELETE** `/v1/facebookPost/:id`

Delete draft or failed post.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

## Listings Endpoints

### 1. Extract Listing from PDF

**POST** `/v1/listing/extract-pdf`

Extract yacht listing information from PDF using Adobe API.

**Headers:**

```
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| pdf | file | Yes |

**Response (200 OK):**

```json
{
  "success": true,
  "extractedData": {
    "title": "2023 Nimbus T11",
    "price": "€460,000",
    "location": "Hua Hin, Thailand",
    "specs": {
      "length": "40 ft",
      "make": "Nimbus",
      "year": 2023
    },
    "description": "Unique opportunity...",
    "images": [
      /* extracted image URLs */
    ]
  }
}
```

---

### 2. Create Yacht Listing (Protected)

**POST** `/v1/listing/create`

Create new yacht listing.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Listing title |
| description | string | Yes | Listing description |
| price | number | Yes | Price |
| currency | string | Yes | USD, EUR, etc |
| location | string | Yes | Location |
| specifications | JSON | Yes | Boat specs |
| images | file[] | No | Listing images |
| bedrooms | number | No | Number of bedrooms |
| bathrooms | number | No | Number of bathrooms |
| yearBuilt | number | No | Year built |
| length | string | No | Boat length |
| make | string | No | Boat make |
| model | string | No | Boat model |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Listing created successfully",
  "listing": {
    "_id": "listing123",
    "title": "2023 Nimbus T11",
    "price": 460000,
    "location": "Hua Hin, Thailand",
    "images": [
      /* image URLs */
    ]
  }
}
```

---

### 3. Get All Listings (Protected)

**GET** `/v1/listing/all`

Get all user's listings.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | enum | ACTIVE, SOLD, ARCHIVED |

**Response (200 OK):**

```json
{
  "success": true,
  "listings": [
    /* array of listing objects */
  ],
  "pagination": {
    /* pagination info */
  }
}
```

---

### 4. Get Listing by ID

**GET** `/v1/listing/:id`

Get specific listing details.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Listing ID |

**Response (200 OK):**

```json
{
  "success": true,
  "listing": {
    "_id": "listing123",
    "title": "2023 Nimbus T11",
    "description": "...",
    "price": 460000,
    "images": [
      /* image URLs */
    ],
    "specifications": {
      /* boat specs */
    },
    "views": 250,
    "createdAt": "2026-05-20T10:30:00Z"
  }
}
```

---

### 5. Update Listing (Protected)

**PUT** `/v1/listing/:id`

Update yacht listing.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Listing ID |

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Listing updated successfully"
}
```

---

### 6. Delete Listing (Protected)

**DELETE** `/v1/listing/:id`

Delete yacht listing.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

---

## Facebook Ad Management Endpoints

### 1. Create Campaign (Protected)

**POST** `/v1/final/create-campaign`

Create Facebook ad campaign.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body (JSON):**

```json
{
  "campaignName": "Summer Promotion",
  "objective": "REACH",
  "budget": 1000,
  "currency": "USD",
  "startDate": "2026-05-20",
  "endDate": "2026-06-20",
  "targetAudience": {
    "ageMin": 18,
    "ageMax": 65,
    "location": ["US", "UK"],
    "interests": ["Yachts", "Luxury"]
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Campaign created successfully",
  "campaign": {
    "_id": "campaign123",
    "campaignName": "Summer Promotion",
    "facebookCampaignId": "fb_campaign_123"
  }
}
```

---

### 2. Create Ad Set (Protected)

**POST** `/v1/final/create-adSet`

Create ad set within campaign.

**Headers:**

```
Authorization: Bearer <token>
```

**Request Body (JSON):**

```json
{
  "campaignId": "campaign123",
  "adSetName": "Desktop Audience",
  "bidAmount": 2.5,
  "placements": ["FACEBOOK_FEED", "INSTAGRAM_FEED"],
  "dailyBudget": 100,
  "optimization": "IMPRESSIONS"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Ad Set created successfully",
  "adSet": {
    "_id": "adset123",
    "adSetName": "Desktop Audience",
    "facebookAdSetId": "fb_adset_123"
  }
}
```

---

### 3. Create Creative Ad (Protected)

**POST** `/v1/final/create-creativeAd`

Create ad creative with images/videos.

**Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
| Field | Type | Required |
|-------|------|----------|
| adSetId | string | Yes |
| headline | string | Yes |
| description | string | Yes |
| callToAction | string | Yes |
| ads | file[] | Yes |
| adFormat | enum | Yes |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Creative ad created successfully",
  "ad": {
    "_id": "ad123",
    "headline": "Summer Sale",
    "facebookAdId": "fb_ad_123"
  }
}
```

---

### 4. Get Page Ads Dashboard

**GET** `/v1/final/get`

Get all campaigns and ads performance.

**Response (200 OK):**

```json
{
  "success": true,
  "dashboard": {
    "campaigns": [
      /* campaign data */
    ],
    "totalSpend": 5000,
    "totalImpressions": 50000,
    "totalClicks": 1250,
    "ctr": 2.5,
    "averageCPC": 4.0
  }
}
```

---

## Media Connection Endpoints

### 1. Get Facebook Login URL (Protected)

**GET** `/v1/connect/connect-user`

Get Facebook OAuth login URL.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "loginUrl": "https://www.facebook.com/v18.0/dialog/oauth?client_id=...",
  "state": "random_state_123"
}
```

---

### 2. Facebook OAuth Callback

**GET** `/v1/connect/callback`

Facebook redirects here after user authorization.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| code | string | Authorization code |
| state | string | State parameter |

**Response (302 Redirect)**
Redirects to frontend with session token.

---

## Contact Form Endpoints

### 1. Submit Contact Form

**POST** `/v1/contact/`

Submit contact form message.

**Request Body (JSON):**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "Inquiry about services",
  "message": "I would like to know more about..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "reference": "CONTACT_20260520_001"
}
```

---

## Environment Variables

Create a `.env` file in the project root with:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/saralemos

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

# Authentication Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SENDER_EMAIL=noreply@saralemos.com

# Cloudinary (Image Upload)
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe (Payment)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Facebook API
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_BUSINESS_ACCOUNT_ID=your_business_account_id
FACEBOOK_REDIRECT_URI=http://localhost:3000/callback

# OpenAI (AI Ad Generation)
OPENAI_API_KEY=sk-...

# Adobe PDF Services
PDF_SERVICES_CLIENT_ID=your_adobe_client_id
PDF_SERVICES_CLIENT_SECRET=your_adobe_client_secret

# AWS (Optional)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://saralemos.com

# Frontend URLs
FRONTEND_URL=http://localhost:3000
ADMIN_DASHBOARD_URL=https://admin.saralemos.com
```

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    /* response data */
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 6 characters"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [
    /* array of items */
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## HTTP Status Codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 200  | OK - Success                       |
| 201  | Created - Resource created         |
| 204  | No Content                         |
| 400  | Bad Request - Invalid input        |
| 401  | Unauthorized - Auth required       |
| 403  | Forbidden - No permission          |
| 404  | Not Found - Resource not found     |
| 409  | Conflict - Resource already exists |
| 429  | Too Many Requests - Rate limited   |
| 500  | Server Error                       |

---

## Rate Limiting

API implements rate limiting:

- **Global Limit:** 100 requests per 15 minutes per IP
- **Auth Endpoints:** 5 attempts per 15 minutes (login/register)
- **Payment Endpoints:** 10 requests per minute

---

## Postman Collection Import

1. Create new Postman workspace
2. Click "Import" → "Link"
3. Paste: `https://api.saralemos.com/postman-collection.json`
4. Set up environment variables
5. Start testing!

---

## Support & Documentation

- **API Status:** [status.saralemos.com](https://status.saralemos.com)
- **Documentation:** [docs.saralemos.com](https://docs.saralemos.com)
- **Support Email:** [support@saralemos.com](mailto:support@saralemos.com)
- **GitHub:** [github.com/saralemos/backend](https://github.com/saralemos/backend)

---

**Last Updated:** May 20, 2026
**Version:** 1.0.0
