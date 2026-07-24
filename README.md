# ✦ DreamStay Hotel & Suites Web Application
### C237 Software Application Development — CA2

---

## 📋 Project Overview

**DreamStay Hotel** is a full-stack hotel booking web application built with:

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Runtime     | Node.js                                  |
| Framework   | Express.js                               |
| View Engine | EJS (Embedded JavaScript Templates)      |
| Database    | MySQL (via XAMPP / phpMyAdmin)           |
| Auth        | express-session + bcrypt (password hash) |
| Uploads     | Multer (image file handling)             |
| Styling     | Custom CSS (no framework)                |

---

## ✅ CA2 Requirements Met

### Project Objectives
- **Full-stack web app** using Node.js + Express + MySQL
- **EJS templating** with reusable partials (header, footer)
- **CRUD operations** on three resource types: Rooms, Bookings, and Testimonials
- **Role-based access**: Guest and Admin roles
- **User authentication**: Register, login, logout with bcrypt hashing
- **File uploads**: Room images and user avatars via Multer
- **Personalisation**: User profile (name, phone, bio, avatar), special booking requests

### Application Domain: Hotel
- Room listings with types (Standard, Deluxe, Suite)
- Room detail page with guest reviews
- Booking management (create, view, edit, cancel)
- Guest Stories page — guests post, edit, and delete their own testimonial
- Admin panel for managing rooms, bookings, and users

### Functional Expectations
1. **User Access & Identity** — Register, login, logout, profile edit with avatar
2. **Role-Based Access** — Guest vs Admin roles; admin-only routes protected
3. **Resource Management (CRUD)** — Full CRUD on Bookings (guests), Testimonials (guests), and Rooms (admin)
4. **Finding Information** — Search, filter by type/price, sort rooms
5. **Personalisation** — User bio, avatar, special booking requests; personalised dashboard

### Personalisation Requirements
- Users upload a profile photo (avatar)
- Users write a personal bio displayed on their profile
- Users add special requests to each booking (e.g. early check-in, floor preference)
- Personalised dashboard greeting with member since date

---

## 🚀 Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ installed
- [XAMPP](https://www.apachefriends.org/) running (Apache + MySQL)

### 2. Clone / Download the Project
```bash
# Place the hotel-app folder wherever you like, e.g.:
C:\xampp\htdocs\hotel-app
```

### 3. Install Node Dependencies
```bash
cd hotel-app
npm install
```
This installs: express, ejs, mysql2, express-session, bcrypt, multer, nodemon

### 4. Create the Database
1. Open your browser → `http://localhost/phpmyadmin`
2. Click **New** → create database named `DreamStay Hotel`
3. Select the `DreamStay Hotel` database
4. Click **Import** → choose `database.sql` → click **Go**

The script creates all tables and inserts demo data automatically.

### 5. Configure Database Credentials (if needed)
Open `app.js` and update the pool config if your MySQL credentials differ:
```js
const db = mysql.createPool({
  host:     "localhost",
  user:     "root",       // ← your MySQL username
  password: "",           // ← your MySQL password (blank for XAMPP default)
  database: "DreamStay Hotel",
});
```

### 6. Start the Server
```bash
# Production start
npm start

# Development (auto-restarts on file changes)
npm run dev
```

Open your browser: **http://localhost:3000**

---

## 👤 Demo Accounts

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@dreamstayhotel.com     | `password` |
| Guest | jane@email.com         | `password` |

> **Note:** The seed data uses a bcrypt hash of the string `"password"`. To create real accounts with different passwords, use the `/register` page.

---

## 📁 Project Structure

```
hotel-app/
├── app.js                      ← Main server (all routes, middleware, DB)
├── database.sql                ← MySQL schema + seed data
├── package.json                ← Node dependencies
├── README.md                   ← This file
│
├── views/                      ← EJS templates
│   ├── partials/
│   │   ├── header.ejs          ← Navbar (included on every page)
│   │   └── footer.ejs          ← Footer (included on every page)
│   ├── index.ejs               ← Homepage
│   ├── rooms.ejs               ← Rooms listing with search/filter
│   ├── room-detail.ejs         ← Single room + reviews
│   ├── login.ejs               ← Login form
│   ├── register.ejs            ← Registration form
│   ├── dashboard.ejs           ← Guest dashboard (bookings + reviews)
│   ├── profile-edit.ejs        ← Edit profile (personalisation)
│   ├── book.ejs                ← New booking form
│   ├── booking-edit.ejs        ← Edit existing booking
│   ├── about.ejs               ← About page
│   ├── testimonials.ejs        ← Guest Stories page (testimonials CRUD)
│   ├── error.ejs               ← Error page
│   └── admin/
│       ├── dashboard.ejs       ← Admin overview + stats
│       ├── rooms.ejs           ← Manage rooms list
│       ├── room-form.ejs       ← Add / edit room form
│       ├── bookings.ejs        ← Manage all bookings
│       └── users.ejs           ← Manage all users
│
├── public/
│   ├── css/
│   │   └── style.css           ← All styles (CSS custom properties, responsive)
│   ├── js/
│   │   └── main.js             ← Client-side JS (navbar, forms, star picker…)
│   └── images/
│       ├── hero-bg.jpg         ← Homepage hero background
│       ├── room-standard.jpg
│       ├── room-deluxe.jpg
│       ├── room-suite.jpg
│       ├── room-family.jpg
│       ├── room-skyline.jpg
│       └── uploads/            ← User-uploaded avatars & room images (auto-created)
```

---

## 🗺️ Route Map

### Public Routes
| Method | Route            | Description                          |
|--------|------------------|--------------------------------------|
| GET    | `/`              | Homepage with featured rooms         |
| GET    | `/rooms`         | All rooms with search/filter/sort    |
| GET    | `/rooms/:id`     | Single room detail + reviews         |
| GET    | `/about`         | About page                           |
| GET    | `/testimonials`  | Guest Stories page (list + form)     |
| GET    | `/login`         | Login form                           |
| POST   | `/login`         | Authenticate user                    |
| GET    | `/register`      | Registration form                    |
| POST   | `/register`      | Create new account                   |
| GET    | `/logout`        | Destroy session, redirect home       |

### Guest Routes (requireLogin)
| Method | Route                   | Description                     |
|--------|-------------------------|---------------------------------|
| GET    | `/dashboard`            | Personal dashboard              |
| GET    | `/profile/edit`         | Profile edit form               |
| POST   | `/profile/edit`         | Save profile changes + avatar   |
| GET    | `/book/:roomId`         | Booking form for a room         |
| POST   | `/book/:roomId`         | Create booking                  |
| GET    | `/booking/edit/:id`     | Edit booking form               |
| POST   | `/booking/edit/:id`     | Save booking changes            |
| POST   | `/booking/delete/:id`   | Cancel / delete booking         |
| POST   | `/review`               | Submit a room review            |
| POST   | `/review/delete/:id`    | Delete own review               |
| POST   | `/testimonials`         | Post a new testimonial          |
| POST   | `/testimonials/edit/:id`   | Edit own testimonial         |
| POST   | `/testimonials/delete/:id` | Delete own testimonial (or any, if admin) |

### Admin Routes (requireAdmin)
| Method | Route                          | Description                  |
|--------|--------------------------------|------------------------------|
| GET    | `/admin`                       | Admin dashboard + stats      |
| GET    | `/admin/rooms`                 | List all rooms               |
| GET    | `/admin/rooms/add`             | Add room form                |
| POST   | `/admin/rooms/add`             | Save new room                |
| GET    | `/admin/rooms/edit/:id`        | Edit room form               |
| POST   | `/admin/rooms/edit/:id`        | Save room changes            |
| POST   | `/admin/rooms/delete/:id`      | Delete room                  |
| GET    | `/admin/bookings`              | List all bookings (filterable)|
| POST   | `/admin/bookings/status/:id`   | Update booking status        |
| GET    | `/admin/users`                 | List all users               |
| POST   | `/admin/users/role/:id`        | Toggle user role             |
| POST   | `/admin/users/delete/:id`      | Delete user                  |

---

## 🖼️ Adding Room Images

Place your room images in `public/images/` and name them:
- `hero-bg.jpg` — homepage hero banner
- `room-standard.jpg`, `room-deluxe.jpg`, `room-suite.jpg`, `room-family.jpg`, `room-skyline.jpg`

Any image type (JPG, PNG, WebP) works. Recommended size: **800×600px or larger**.

You can also upload images directly through the Admin panel when adding/editing rooms.

---

## 🔐 Security Features

- Passwords hashed with **bcrypt** (10 salt rounds) — never stored in plain text
- Sessions signed with a secret key (change in production)
- SQL queries use **parameterised statements** (`?` placeholders) — prevents SQL injection
- Route guards (`requireLogin`, `requireAdmin`) block unauthorised access
- Users can only edit/delete their **own** bookings, reviews, and testimonials (admins can delete any testimonial)
- File upload restricted to image types only (JPEG, JPG, PNG, WebP), max 5 MB

---

## 📝 Code Comments

Every file is thoroughly commented to explain:
- **What** each block of code does
- **Why** certain decisions were made (e.g. bcrypt, parameterised queries)
- **How** Express middleware chains work
- **Which** CA2 functional requirement each feature fulfils

Look for comment headers like:
```js
// ── Functional Expectation #3 — Resource CRUD ──
// ── Personalisation Requirement ────────────────
```

---

*C237 Software Application Development — CA2 | DreamStay Hotel & Suites*
