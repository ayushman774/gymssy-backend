# Gymssy Admin & Provider API Documentation

This document outlines the API contract for the Gymssy backend, focusing on Admin and Provider workflows.

---

## Base URL
`http://localhost:5000` (Local) / Production URL

## Authentication
All protected routes require a JWT token passed in the `Authorization` header as a Bearer token:
`Authorization: Bearer <your_jwt_token>`

---

## 1. Authentication APIs

### Register Account
- **Method:** `POST`
- **URL:** `/api/auth/register`
- **Auth:** None (Public)
- **Body:**
  ```json
  {
    "name": "Full Name",
    "email": "user@example.com",
    "password": "password123",
    "phone": "9876543210",
    "accountType": "user | business",
    "providerType": "trainer | coach | nutritionist | gym_owner | ..." (required if accountType is business)
  }
  ```
- **Response:** `201 Created` with user info and JWT token.

### Login
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Auth:** None (Public)
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** `200 OK` with user info and JWT token.

---

## 2. Admin APIs

### Admin Dashboard
- **Method:** `GET`
- **URL:** `/api/admin/dashboard`
- **Role:** Admin
- **Response:** `200 OK` with platform statistics.

### List Providers
- **Method:** `GET`
- **URL:** `/api/admin/providers`
- **Role:** Admin
- **Query Params:** `search`, `providerType`, `status`, `page`, `limit`
- **Response:** `200 OK` with paginated providers.

### Update Provider Status
- **Method:** `PATCH`
- **URL:** `/api/admin/providers/:id/status`
- **Role:** Admin
- **Body:** `{ "isActive": boolean }`
- **Response:** `200 OK` with updated provider account.

### List Marketplace Listings
- **Method:** `GET`
- **URL:** `/api/admin/listings`
- **Role:** Admin
- **Query Params:** `search`, `type` (gym|trainer|nutritionist), `status` (active|inactive), `city` (cityId), `page`, `limit`
- **Response:** `200 OK` with normalized paginated listings.

### Get Listing Detail
- **Method:** `GET`
- **URL:** `/api/admin/listings/:type/:id`
- **Role:** Admin
- **Params:** `type` (gym|trainer|nutritionist), `id` (ObjectId)
- **Response:** `200 OK` with full normalized listing details.

### Update Listing Status
- **Method:** `PATCH`
- **URL:** `/api/admin/listings/:type/:id/status`
- **Role:** Admin
- **Body:** `{ "isActive": boolean }`

### Update Listing Verification
- **Method:** `PATCH`
- **URL:** `/api/admin/listings/:type/:id/verification`
- **Role:** Admin
- **Body:** `{ "isVerified": boolean }`

---

## 3. Provider APIs

### Get My Profile
- **Method:** `GET`
- **URL:** `/api/providers/profile`
- **Role:** Business

### Update My Profile
- **Method:** `PUT`
- **URL:** `/api/providers/profile`
- **Role:** Business
- **Body:** `{ "businessName", "bio", "phone", "email", "website", "avatar", "location", "socialLinks" }`

### Create Listing
- **Method:** `POST`
- **URL:** `/api/providers/listings`
- **Role:** Business
- **Body:** Model-specific fields.

### List My Listings
- **Method:** `GET`
- **URL:** `/api/providers/listings`
- **Role:** Business

### Delete Listing (Soft Delete)
- **Method:** `DELETE`
- **URL:** `/api/providers/listings/:id`
- **Role:** Business
- **Note:** Sets `isActive: false`.

---

## Error Codes
- `400 Bad Request`: Invalid input or malformed request.
- `401 Unauthorized`: Authentication missing or invalid.
- `403 Forbidden`: Authenticated but lacks required role or ownership.
- `404 Not Found`: Resource does not exist.
- `409 Conflict`: Unique constraint violation (e.g., email already exists).
- `500 Internal Server Error`: Unexpected server exception.
