# ZingBite — Enterprise Online Food Delivery Platform

A production-ready, full-stack online food delivery platform inspired by Swiggy, engineered with **React 19, Vite, Tailwind CSS, Redux Toolkit, Node.js, Express, MongoDB Atlas, Redis, Socket.IO, and Razorpay (Test Mode)**.

---

## 1. Project Overview

**ZingBite** delivers a complete four-role ecosystem (**Customer**, **Restaurant Owner**, **Delivery Partner**, and **Administrator**) powered by **six intelligent backend engines**:

1. **Task 1 — Fraud Detection & Order Validation System**: Real-time risk-scoring engine monitoring rapid orders, daily cancellations, coupon abuse, refund velocity, failed payments, and high-value COD anomalies, complete with Admin approve/reject workflows, temporary account restrictions, and `AdminAuditLog` tracking.
2. **Task 2 — Advanced Restaurant Search & Filtering System**: Multi-parameter MongoDB Aggregation pipeline combined with **Fuse.js fuzzy matching** for spelling-mistake tolerance (e.g., `"birynai"` $\rightarrow$ `"Biryani"`, `"panner"` $\rightarrow$ `"Paneer"`), dish-level discovery, **Redis result caching**, and live Search Analytics.
3. **Task 3 — Dynamic Surge Pricing for Delivery Fees**: Real-time delivery charge calculation driven by configurable Lunch (`12 PM–3 PM`) and Dinner (`7 PM–10 PM`) peak hours, active order supply/demand ratios, regional multipliers, and Haversine road distance, independently verified on the backend during order creation.
4. **Task 4 — Smart Delivery Partner Assignment System**: Geospatial `2dsphere` `$near` partner discovery with composite proximity/workload/rating scoring and **atomic MongoDB `findOneAndUpdate` locking** to prevent double assignment, plus partner accept/reject automatic fallback reassignment and admin manual reassignment.
5. **Task 5 — Real-Time Order Status & Notification System**: Authenticated **Socket.IO** rooms (`user:<id>`, `order:<id>`, `restaurant:<id>`, `delivery:<id>`, `role:admin`) enforcing a role-validated 8-stage order lifecycle with persistent MongoDB notifications and unread badge counts.
6. **Task 6 — Dynamic Restaurant Recommendation System**: Personalized restaurant ranking engine powered by MongoDB Aggregation pipelines over customer order history, cuisine similarity, vegetarian ratio, price affinity, ratings, and popularity, cached in Redis.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Redux Toolkit, React Router DOM, Axios, Socket.IO Client, Lucide React Icons, React Hot Toast |
| **Backend** | Node.js, Express 5, MongoDB Atlas, Mongoose 9, Socket.IO, Redis (`ioredis` + hybrid in-memory fallback), JWT & HTTP-Only Cookies, bcryptjs, Fuse.js, Multer, Cloudinary, Razorpay |
| **Security & Testing** | Helmet, CORS, Express Rate Limit, NoSQL/XSS Input Sanitization, HMAC SHA256 Payment & Webhook Verification, Jest, Supertest, Postman |

---

## 3. Installation & Setup Instructions

### Prerequisites
- **Node.js** v18+
- **MongoDB Atlas** URI (or local MongoDB instance)
- **Redis** (optional — `Backend/config/redis.js` automatically falls back to an in-memory TTL cache if a local Redis daemon is not running)

### Step 1: Clone & Install Dependencies

```bash
# 1. Install Backend dependencies
cd Backend
npm install

# 2. Install Frontend dependencies
cd ../Frontend
npm install
```

### Step 2: Environment Configuration

Copy `Backend/.env.example` to `Backend/.env` and configure your variables:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/SwiggyDataBase
CLIENT_URL=http://localhost:5173

JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

REDIS_URL=redis://127.0.0.1:6379
REDIS_ENABLED=false

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=rzp_test_your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Demo Seed Credentials (Non-Production)
SEED_ADMIN_EMAIL=admin@zingbite.com
SEED_ADMIN_PASSWORD=Admin@123
SEED_CUSTOMER_EMAIL=customer@zingbite.com
SEED_CUSTOMER_PASSWORD=Customer@123
SEED_RESTAURANT_EMAIL=owner@zingbite.com
SEED_RESTAURANT_PASSWORD=Owner@123
SEED_DELIVERY_EMAIL=rider@zingbite.com
SEED_DELIVERY_PASSWORD=Rider@123
```

### Step 3: Seed the Database

```bash
cd Backend
npm run seed
```

### Step 4: Start Backend & Frontend Servers

```bash
# Terminal 1: Start Backend API + Socket.IO Server (Port 4000)
cd Backend
npm run dev

# Terminal 2: Start Frontend Vite Dev Server (Port 5173)
cd Frontend
npm run dev
```

---

## 4. Demo Login Credentials (Non-Production)

The Login page (`/login`) includes a **1-Click Demo Role Switcher** for all seeded accounts:

| Role | Email | Password | Portal Route |
|---|---|---|---|
| **Administrator** | `admin@zingbite.com` | `Admin@123` | `/admin` |
| **Customer** | `customer@zingbite.com` | `Customer@123` | `/` |
| **Restaurant Owner** | `owner@zingbite.com` | `Owner@123` | `/restaurant-dashboard` |
| **Delivery Partner** | `rider@zingbite.com` | `Rider@123` | `/delivery-dashboard` |
| **High-Risk Customer (Demo)** | `rohan.flagged@zingbite.com` | `Customer@123` | `/` (Pre-flagged in Admin Fraud Queue) |

---

## 5. Complete API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Request Body / Params | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | `{ name, email, password, phone, role }` | Registers user & sets HTTP-only JWT cookies |
| `POST` | `/api/auth/login` | Public | `{ email, password }` | Authenticates user & returns role context |
| `POST` | `/api/auth/logout` | Public | — | Clears authentication cookies |
| `GET` | `/api/auth/me` | Bearer / Cookie | — | Returns current user profile & role context |

### Task 1: Fraud Detection & Order Validation (`/api/admin/fraud`)
| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/fraud/orders` | Admin | `?riskLevel=High&reviewStatus=pending_review` | Lists all flagged suspicious orders, risk scores & summary metrics |
| `GET` | `/api/admin/fraud/orders/:orderId` | Admin | — | Returns detailed `FraudRecord` & customer `FraudActivity` history |
| `PATCH` | `/api/admin/fraud/orders/:orderId/approve` | Admin | `{ note }` | Approves a flagged order & writes `AdminAuditLog` |
| `PATCH` | `/api/admin/fraud/orders/:orderId/reject` | Admin | `{ note }` | Rejects & cancels a suspicious order, initiating refund if paid |
| `PATCH` | `/api/admin/fraud/users/:userId/restrict` | Admin | `{ isRestricted, reason, durationHours }` | Temporarily restricts or unrestricts a suspicious account |

### Task 2: Advanced Restaurant Search & Filtering (`/api/restaurants`)
| Method | Endpoint | Auth | Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/api/restaurants/search` | Public | `?q=birynai&cuisine=Indian&rating=4&maxDeliveryTime=30&vegetarian=true&minPrice=100&maxPrice=500&sortBy=rating` | Executes MongoDB Aggregation + Fuse.js fuzzy search + Redis caching |
| `GET` | `/api/admin/restaurants` | Admin | — | Lists all restaurants for admin management |
| `POST` | `/api/admin/restaurants/create` | Admin | `{ name, description, cuisines, avgPriceForTwo, deliveryTimeMinutes, lat, lng }` | Creates a new restaurant & invalidates search cache |
| `PUT` | `/api/admin/restaurants/update/:restaurantId` | Admin | `{ name, isOpen, isApproved, offerText, ... }` | Updates restaurant configuration |
| `DELETE` | `/api/admin/restaurants/delete/:restaurantId` | Admin | — | Deletes a restaurant and its associated menu items |

### Task 3: Dynamic Surge Pricing (`/api/orders` & `/api/admin/surge-settings`)
| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/orders/calculate-delivery-fee` | Public | `{ restaurantId, customerCoordinates, subtotal, simulatedHour }` | Calculates transparent delivery fee, distance, peak window & surge multiplier |
| `GET` | `/api/admin/surge-settings` | Admin | — | Returns surge configuration, peak windows & live supply/demand ratio |
| `PUT` | `/api/admin/surge-settings` | Admin | `{ isEnabled, baseDeliveryFee, perKmRate, peakHours, demandMultipliers, manualDemandOverride }` | Updates dynamic surge pricing configuration |

### Task 4: Smart Delivery Partner Assignment (`/api/delivery` & `/api/admin/delivery`)
| Method | Endpoint | Auth | Request Body / Query | Description |
|---|---|---|---|---|
| `POST` | `/api/delivery/set-status` | Delivery / Admin | `{ isOnline, isAvailable, lat, lng }` | Updates partner availability & `2dsphere` GeoJSON coordinates |
| `GET` | `/api/delivery/available` | Admin / Restaurant | `?lat=12.9716&lng=77.6197` | Finds nearby eligible partners using MongoDB `$near` query |
| `GET` | `/api/delivery/assignments` | Delivery / Admin | — | Returns assigned deliveries with pickup/drop coordinates & earnings |
| `POST` | `/api/delivery/assignments/:assignmentId/respond` | Delivery | `{ action: "accept" \| "reject", reason }` | Accepts or rejects assignment (rejection triggers auto-reassignment) |
| `POST` | `/api/admin/delivery/reassign/:orderId` | Admin | `{ targetPartnerId, reason }` | Manually or automatically reassigns order to another partner |

### Task 5: Real-Time Order Lifecycle & Notifications (`/api/orders` & `/api/notifications`)
| Method | Endpoint | Auth | Request Body | Description |
|---|---|---|---|---|
| `POST` | `/api/orders/create` | Customer | `{ restaurantId, items, deliveryAddress, couponCode, paymentMethod }` | Validates prices, surge fee & fraud score; emits live Socket.IO events |
| `PATCH` | `/api/orders/update-status/:orderId` | Restaurant / Delivery / Admin | `{ status, note }` | Role-validated transition (`Order Placed` $\rightarrow$ `Delivered`) + auto rider assignment |
| `POST` | `/api/orders/cancel/:orderId` | Customer / Admin | `{ reason }` | Cancels eligible order & monitors cancellation velocity |
| `GET` | `/api/orders/:orderId` | Authenticated | — | Returns order details, status timeline & live partner coordinates |
| `GET` | `/api/orders/history` | Authenticated | `?status=Delivered&page=1` | Returns paginated order history |
| `GET` | `/api/notifications` | Authenticated | — | Returns notification history & unread count |

### Task 6: Dynamic Restaurant Recommendations (`/api/restaurants/recommendations`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/restaurants/recommendations` | Optional Auth | Returns personalized restaurant recommendations with match scores |
| `GET` | `/api/restaurants/recommendations/:userId` | Public / Private | Returns recommendations calculated for a specific `userId` |
| `GET` | `/api/admin/recommendations/analytics` | Admin | Returns recommendation impressions, conversion rates & top cuisines |

---

## 6. Automated Testing & Postman Collection

- **Run Automated Jest + Supertest Suite**:
  ```bash
  cd Backend
  npm test
  ```
- **Postman Collection**: Import [`postman_collection.json`](./postman_collection.json) into Postman to test all endpoints interactively.

---

## 7. Deployment Instructions

### Docker Compose Deployment
```bash
docker compose up --build -d
```
This launches `zingbite-redis` (Port 6379), `zingbite-backend` (Port 4000), and `zingbite-frontend` (Port 5173).

### Render / AWS Deployment
1. **Backend Web Service**: Point root directory to `Backend`, build command `npm install`, start command `node server.js`, and configure environment variables from `Backend/.env.example`.
2. **Frontend Static Site**: Point root directory to `Frontend`, build command `npm run build`, publish directory `dist`, and set `VITE_API_URL` and `VITE_SOCKET_URL` to your deployed backend URL.

