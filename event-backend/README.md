# College Event Management - Backend

Node.js + Express + PostgreSQL + JWT backend for a college event management
system with three roles: **student**, **organizer**, **admin**.

## 1. Setup

```bash
cd event-backend
npm install
cp .env.example .env
```

Edit `.env` with your Postgres credentials and a JWT secret.

Create the database and run the schema:

```bash
createdb event_management
psql -U postgres -d event_management -f db/schema.sql
```

Start the server:

```bash
npm run dev     # with nodemon
# or
npm start
```

Server runs at `http://localhost:5000`.

## 2. Creating the first Admin account

There's no public signup for admin (by design - only student/organizer can
self-register). Create the first admin directly in the database:

```sql
-- Generate a bcrypt hash for your password first (see note below), then:
INSERT INTO users (name, email, password_hash, role, is_approved)
VALUES ('Admin Name', 'admin@college.edu', '<bcrypt_hash>', 'admin', TRUE);
```

Quickest way to get a bcrypt hash - run this once in a node REPL:
```js
node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
```

Once you have one admin, that admin can create more admins via
`POST /api/admin/create-admin`.

## 3. Role flow

- **Student**: registers via `/api/auth/register` with `role: "student"` → auto-approved → logs in immediately.
- **Organizer**: registers via `/api/auth/register` with `role: "organizer"` → account created but `is_approved = false` → **cannot log in until an admin approves them** via `/api/admin/organizers/:id/approve`.
- **Admin**: created only by another admin or seeded directly in the DB.

## 4. Testing with Postman

Base URL: `http://localhost:5000/api`

### Auth
| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ "name", "email", "password", "role": "student" }` | role: student or organizer |
| POST | `/auth/login` | `{ "email", "password" }` | Returns `token` - use in all further requests |
| GET | `/auth/me` | - | Header: `Authorization: Bearer <token>` |

For every protected route below, add header:
```
Authorization: Bearer <token>
```

### Organizer
| Method | Endpoint | Role | Body |
|---|---|---|---|
| POST | `/events` | organizer | `{ "title", "description", "venue", "event_time": "2026-07-10T18:00:00", "last_date_to_register": "2026-07-08T23:59:00", "amount": 100 }` |
| GET | `/events/my` | organizer | - |
| GET | `/events/:id/stats` | organizer/admin | - |
| GET | `/events/:id/registrations` | organizer/admin | - |
| POST | `/events/:id/notify` | organizer | `{ "message": "Venue changed to Hall B" }` |

### Student
| Method | Endpoint | Role | Body |
|---|---|---|---|
| GET | `/events` | any | - |
| GET | `/events/:id` | any | - |
| POST | `/events/:id/register` | student | - |
| POST | `/registrations/:registrationId/pay` | student | - (mock payment confirm) |
| GET | `/registrations/my` | student | - |
| GET | `/notifications/my` | student | - |

### Admin
| Method | Endpoint | Body |
|---|---|---|
| GET | `/admin/organizers?status=pending` | - |
| PUT | `/admin/organizers/:id/approve` | - |
| PUT | `/admin/organizers/:id/revoke` | - |
| GET | `/admin/students` | - |
| GET | `/admin/events` | - |
| GET | `/admin/dashboard` | - |
| POST | `/admin/create-admin` | `{ "name", "email", "password" }` |

## 5. Notes / next steps

- **Payments**: `/registrations/:id/pay` is a mock confirmation endpoint. Swap in a real gateway (Razorpay/Stripe) by verifying the payment signature/webhook before marking `payment_status = 'paid'`.
- **Notifications**: the 1-hour-before reminder runs automatically via `node-cron` (see `jobs/notifyCron.js`) and is stored in the `notifications` table. To actually deliver emails/SMS, plug in `nodemailer` or an SMS provider where indicated in the code.
- **College email validation**: currently any email format is accepted at registration. Add a domain check (e.g. must end in `@yourcollege.edu`) in `authController.js` if needed.
