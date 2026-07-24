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

*C237 Software Application Development — CA2 | DreamStay Hotel & Suites*
