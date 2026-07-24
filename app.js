// =============================================================
// app.js — Main Entry Point for DreamStay Hotel Web Application
// C237 Software Application Development — CA2
// =============================================================
// This file is the heart of the Express application.
// It sets up middleware, defines all routes, handles user
// authentication, connects to MySQL, and renders EJS views.
// =============================================================

// ── Core Node.js & Express dependencies ──────────────────────
const express    = require("express");          // Web framework for Node.js
const session    = require("express-session");  // Manages user login sessions
const bcrypt     = require("bcrypt");           // Hashes & verifies passwords
const mysql      = require("mysql2");           // MySQL database connector
const multer     = require("multer");           // Handles image/file uploads
const path       = require("path");             // Resolves file-system paths
const fs         = require("fs");               // File-system access (for image deletion)

// ── Create the Express application ───────────────────────────
const app = express();

// ── View Engine (EJS) ─────────────────────────────────────────
// EJS lets us embed JavaScript inside HTML templates (views/*.ejs)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Tell Express where views live

// ── Static Files ──────────────────────────────────────────────
// Serve CSS, client-side JS, and uploaded images from /public
app.use(express.static(path.join(__dirname, "public")));

// ── Body Parsers ──────────────────────────────────────────────
// Parse URL-encoded form data (from <form> submissions)
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies (for fetch/AJAX requests)
app.use(express.json());

// ── Session Configuration ─────────────────────────────────────
// Sessions store login state between requests without re-authenticating
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dreamstay-secret-key-c237",  // Secret used to sign the session cookie — change in production!
    resave: false,                        // Don't save session if nothing changed
    saveUninitialized: false,             // Don't create sessions for unauthenticated users
    cookie: { maxAge: 1000 * 60 * 60 },  // Session expires after 1 hour of inactivity
  })
);

// ── MySQL Database Connection Pool ───────────────────────────
// A pool reuses connections instead of opening a new one per query (better performance)
//
// ⚠️  WINDOWS / XAMPP FIX:
//   Use "127.0.0.1" instead of "localhost".
//   On Windows, "localhost" resolves to IPv6 (::1) first, but XAMPP's
//   MySQL only listens on IPv4 (127.0.0.1), causing ECONNREFUSED.
//   The `family: 4` option forces IPv4 as a second safeguard.
const db = mysql.createPool({
  host:              process.env.DB_HOST || "c237-marlina-mysql.mysql.database.azure.com",
  port:              3306,
  user:              process.env.DB_USER || "c237_014",
  password:          process.env.DB_PASS || "c237014@2026!", // Set DB_PASS in Azure App Service env vars
  database:          process.env.DB_NAME || "c237_014_team4_ca2",
  waitForConnections: true,
  connectionLimit:   10,
  connectTimeout:    10000,
  ssl:               { rejectUnauthorized: false } // ← Required for Azure MySQL Database connections
});

// ── Test the DB connection on startup ────────────────────────
// This gives a clear error message if MySQL isn't running instead
// of a cryptic crash on the first real request.
db.getConnection((err, connection) => {
  if (err) {
    console.error("\n❌  Could not connect to MySQL:");
    if (err.code === "ECONNREFUSED") {
      console.error("   MySQL is not running. Please start it in XAMPP Control Panel.");
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("   Wrong username or password in the db pool config (app.js line ~50).");
    } else if (err.code === "ER_BAD_DB_ERROR") {
      console.error("   Database 'DreamStay' does not exist. Run database.sql in phpMyAdmin.");
    } else {
      console.error("  ", err.message);
    }
    console.error("   The server will keep running but all DB queries will fail.\n");
    return;
  }
  console.log("✅  MySQL connected successfully to Azure DB");
  connection.release(); // return connection to pool immediately
});

// Convert the pool to use Promises so we can use async/await
const dbPromise = db.promise();

// ── Multer — File Upload Configuration ───────────────────────
// Multer processes multipart/form-data (file uploads from HTML forms)
const storage = multer.diskStorage({
  // Where to save uploaded images
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/images/uploads"));
  },
  // Give each file a unique name using timestamp + original extension
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Only accept image files (jpeg, jpg, png, webp)
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);  // Accept file
  } else {
    cb(new Error("Only image files are allowed"), false); // Reject file
  }
};

// Create the upload middleware (max 5 MB per image)
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Ensure upload directory exists (in case it was deleted)
const uploadDir = path.join(__dirname, "public/images/uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ============================================================
// MIDDLEWARE — Functions that run before every route handler
// ============================================================

// ── Global Locals Middleware ──────────────────────────────────
// Makes `user` available in every EJS template automatically
// so we don't have to pass it manually in every res.render()
app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // null if not logged in
  next(); // Continue to the next middleware or route
});

// ── Authentication Guard (requireLogin) ───────────────────────
// Protect routes that require a logged-in user.
// Any route that wraps this middleware will redirect to /login if not authenticated.
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login"); // Not logged in → redirect to login page
  }
  next(); // Logged in → allow through
}

// ── Admin Guard (requireAdmin) ────────────────────────────────
// Protect routes that only admins can access.
// Admins have role = 'admin' stored in the session.
function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  if (!req.session.user) {
    return res.redirect("/login?error=admin_required");
  }
  res.status(403).render("error", { message: "Access Denied: Admins Only." });
}

// ============================================================
// PUBLIC ROUTES — Accessible without logging in
// ============================================================

// ── Home Page ─────────────────────────────────────────────────
// GET /  — Shows featured rooms and highlights
app.get("/", async (req, res) => {
  try {
    // Fetch 3 featured rooms to display on the homepage
    const [featuredRooms] = await dbPromise.query(
      "SELECT * FROM rooms WHERE is_available = 1 ORDER BY created_at DESC LIMIT 3"
    );

    // Fetch the 3 most recent guest testimonials (JOIN to get the guest's name)
    // This replaces the old hardcoded homepage quote with real content.
    const [testimonials] = await dbPromise.query(
      `SELECT t.*, u.full_name FROM testimonials t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC LIMIT 3`
    );

    res.render("index", { featuredRooms, testimonials }); // Render views/index.ejs
  } catch (err) {
    console.error("Home page error:", err);
    res.render("error", { message: "Could not load homepage." });
  }
});

// ── Rooms Listing Page ────────────────────────────────────────
// GET /rooms — Lists all available rooms with search, filter, sort (Functional Expectation #4)
app.get("/rooms", async (req, res) => {
  try {
    // Extract query parameters with sensible fallbacks (handles empty strings from form submissions)
    const search = req.query.search || "";
    const type = req.query.type || "";
    const sort = req.query.sort || "price_asc";
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : 9999;

    // Build a dynamic SQL query based on what the user filtered
    let sql = "SELECT * FROM rooms WHERE is_available = 1";
    const params = []; // Array of values to safely insert into the query (prevents SQL injection)

    // Keyword search across room name and description
    if (search) {
      sql += " AND (room_name LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Filter by room type (Standard / Deluxe / Suite)
    if (type) {
      sql += " AND room_type = ?";
      params.push(type);
    }

    // Price range filter
    sql += " AND price_per_night BETWEEN ? AND ?";
    params.push(Number(minPrice), Number(maxPrice));

    // Sorting options
    if (sort === "price_asc")  sql += " ORDER BY price_per_night ASC";
    if (sort === "price_desc") sql += " ORDER BY price_per_night DESC";
    if (sort === "name_asc")   sql += " ORDER BY room_name ASC";
    if (sort === "newest")     sql += " ORDER BY created_at DESC";

    const [rooms] = await dbPromise.query(sql, params);

    // Render the rooms listing view, passing results and current filter values back
    res.render("rooms", { rooms, search, type, sort, minPrice, maxPrice });
  } catch (err) {
    console.error("Rooms listing error:", err);
    res.render("error", { message: "Could not load rooms." });
  }
});

// ── Single Room Detail Page ───────────────────────────────────
// GET /rooms/:id — Shows full info for one room
app.get("/rooms/:id", async (req, res) => {
  try {
    const roomId = req.params.id; // :id from the URL

    // Fetch the specific room by its primary key
    const [[room]] = await dbPromise.query("SELECT * FROM rooms WHERE id = ?", [roomId]);

    if (!room) {
      return res.status(404).render("error", { message: "Room not found." });
    }

    // Fetch reviews for this room so guests can see feedback
    const [reviews] = await dbPromise.query(
      `SELECT r.*, u.full_name FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.room_id = ? ORDER BY r.created_at DESC`,
      [roomId]
    );

    res.render("room-detail", { room, reviews });
  } catch (err) {
    console.error("Room detail error:", err);
    res.render("error", { message: "Could not load room details." });
  }
});

// ── About Page ────────────────────────────────────────────────
app.get("/about", (req, res) => {
  res.render("about");
});

// ============================================================
// GUEST STORIES / TESTIMONIALS (Person 2 - Homepage & About)
// ============================================================
// This is Person 2's CRUD resource. It replaces the old hardcoded
// homepage testimonial with real, guest-submitted stories.
// Each guest can only have ONE testimonial, and can only
// edit/delete their own (admins can delete any).

// 📖 READ: List all testimonials + show the add form 📖
// GET /testimonials
app.get("/testimonials", async (req, res) => {
  try {
    const [testimonials] = await dbPromise.query(
      `SELECT t.*, u.full_name FROM testimonials t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );

    // If the logged-in guest already has a testimonial, find it so the
    // page can show "Edit your story" instead of the add form.
    let myTestimonial = null;
    if (req.session.user) {
      const [[mine]] = await dbPromise.query(
        "SELECT * FROM testimonials WHERE user_id = ?", [req.session.user.id]
      );
      myTestimonial = mine || null;
    }

    res.render("testimonials", {
      testimonials,
      myTestimonial,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error("Testimonials list error:", err);
    res.render("error", { message: "Could not load guest stories." });
  }
});

// 📝 CREATE: Submit a new testimonial 📝
// POST /testimonials - only logged-in guests can submit
app.post("/testimonials", requireLogin, async (req, res) => {
  try {
    const { quote, rating } = req.body;
    const userId = req.session.user.id;

    if (!quote || !rating) {
      return res.redirect("/testimonials?error=missing");
    }

    // One story per guest - INSERT will fail (unique_testimonial) if they
    // already have one, so we check first for a friendlier error message.
    const [[existing]] = await dbPromise.query(
      "SELECT id FROM testimonials WHERE user_id = ?", [userId]
    );
    if (existing) {
      return res.redirect("/testimonials?error=duplicate");
    }

    await dbPromise.query(
      "INSERT INTO testimonials (user_id, quote, rating) VALUES (?, ?, ?)",
      [userId, quote, rating]
    );

    res.redirect("/testimonials?success=added");
  } catch (err) {
    console.error("Add testimonial error:", err);
    res.redirect("/testimonials?error=failed");
  }
});

// ✏️ UPDATE: Edit my own testimonial ✏️
// POST /testimonials/edit/:id
app.post("/testimonials/edit/:id", requireLogin, async (req, res) => {
  try {
    const { quote, rating } = req.body;
    const testimonialId = req.params.id;

    // Look up the testimonial first so we can check ownership
    const [[testimonial]] = await dbPromise.query(
      "SELECT * FROM testimonials WHERE id = ?", [testimonialId]
    );

    // Only the guest who wrote it may edit it
    if (!testimonial || testimonial.user_id !== req.session.user.id) {
      return res.status(403).render("error", { message: "You can only edit your own story." });
    }

    await dbPromise.query(
      "UPDATE testimonials SET quote = ?, rating = ? WHERE id = ?",
      [quote, rating, testimonialId]
    );

    res.redirect("/testimonials?success=updated");
  } catch (err) {
    console.error("Edit testimonial error:", err);
    res.redirect("/testimonials?error=failed");
  }
});

// ❌ DELETE: Remove a testimonial ❌
// POST /testimonials/delete/:id - owner or admin only
app.post("/testimonials/delete/:id", requireLogin, async (req, res) => {
  try {
    const testimonialId = req.params.id;

    const [[testimonial]] = await dbPromise.query(
      "SELECT * FROM testimonials WHERE id = ?", [testimonialId]
    );

    const isOwner = testimonial && testimonial.user_id === req.session.user.id;
    const isAdmin = req.session.user.role === "admin";

    if (!testimonial || (!isOwner && !isAdmin)) {
      return res.status(403).render("error", { message: "You can't delete this story." });
    }

    await dbPromise.query("DELETE FROM testimonials WHERE id = ?", [testimonialId]);
    res.redirect("/testimonials?success=deleted");
  } catch (err) {
    console.error("Delete testimonial error:", err);
    res.redirect("/testimonials?error=failed");
  }
});

// ============================================================
// AUTHENTICATION ROUTES (Functional Expectation #1 — User Access & Identity)
// ============================================================

// ── Show Registration Form ────────────────────────────────────
app.get("/register", (req, res) => {
  // If already logged in, send user to dashboard
  if (req.session.user) return res.redirect("/dashboard");
  res.render("register", { error: null }); // Pass null error initially
});

// ── Handle Registration Submission ───────────────────────────
// POST /register — Creates a new user account in the database
app.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    // Check that all required fields are filled
    if (!full_name || !email || !password) {
      return res.render("register", { error: "All fields are required." });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.render("register", { error: "Please enter a valid email address." });
    }

    // Validate password length (min 8 characters as shown in placeholder)
    if (password.length < 8) {
      return res.render("register", { error: "Password must be at least 8 characters long." });
    }

    // Validate phone number length (prevent database ER_DATA_TOO_LONG crash)
    if (phone && phone.trim().length > 20) {
      return res.render("register", { error: "Phone number is too long (maximum 20 characters)." });
    }

    // Check if email is already registered
    const [[existing]] = await dbPromise.query(
      "SELECT id FROM users WHERE email = ?", [email]
    );
    if (existing) {
      return res.render("register", { error: "Email already in use. Please login." });
    }

    // Hash the password using bcrypt (never store plaintext passwords!)
    // Salt rounds = 10 means the hash is computed 2^10 = 1024 times for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database with role = 'guest' (default role)
    await dbPromise.query(
      "INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, 'guest')",
      [full_name, email, hashedPassword, phone ? phone.trim() : null]
    );

    // Redirect to login after successful registration
    res.redirect("/login?registered=1");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("register", { error: "Registration failed. Please try again." });
  }
});

// ── Show Login Form ───────────────────────────────────────────
app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  // Pass success message if redirected from registration
  const registered = req.query.registered === "1";
  res.render("login", { error: null, registered });
});

// ── Handle Login Submission ───────────────────────────────────
// POST /login — Verifies credentials and starts a session
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [[user]] = await dbPromise.query(
      "SELECT * FROM users WHERE email = ?", [email]
    );

    // Verify password against stored hash using bcrypt.compare()
    // Returns false if user not found or password wrong
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", {
        error: "Invalid email or password.",
        registered: false,
      });
    }

    // Store user info in session (this persists across requests)
    // We store only what we need — not the hashed password
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,           // 'guest' or 'admin'
      avatar: user.avatar,
    };

    // Redirect admins to admin panel, regular users to dashboard
    if (user.role === "admin") {
      res.redirect("/admin");
    } else {
      res.redirect("/dashboard");
    }
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Login failed. Please try again.", registered: false });
  }
});

// ── Logout ────────────────────────────────────────────────────
// GET /logout — Destroys the session and redirects to home
app.get("/logout", (req, res) => {
  req.session.destroy(() => {      // Destroy all session data
    res.redirect("/");             // Send user back to homepage
  });
});

// ============================================================
// GUEST DASHBOARD & PERSONALISATION (Functional Expectation #5 + Personalisation Requirement)
// ============================================================

// ── Guest Dashboard ───────────────────────────────────────────
// GET /dashboard — Shows the logged-in guest's personal overview
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // If user is admin, redirect to admin panel instead
    if (req.session.user.role === "admin") return res.redirect("/admin");

    // Fetch this user's bookings (JOIN with rooms to get room name)
    const [bookings] = await dbPromise.query(
      `SELECT b.*, r.room_name, r.room_type, r.price_per_night, r.image_url
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.user_id = ?
       ORDER BY b.check_in DESC`,
      [userId]
    );

    // Fetch the user's own reviews
    const [reviews] = await dbPromise.query(
      `SELECT rv.*, r.room_name FROM reviews rv
       JOIN rooms r ON rv.room_id = r.id
       WHERE rv.user_id = ?
       ORDER BY rv.created_at DESC`,
      [userId]
    );

    // Fetch full user profile for personalisation display
    const [[profile]] = await dbPromise.query(
      "SELECT * FROM users WHERE id = ?", [userId]
    );

    res.render("dashboard", { bookings, reviews, profile });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("error", { message: "Could not load dashboard." });
  }
});

// ── Edit Profile (GET) — Show edit form ───────────────────────
app.get("/profile/edit", requireLogin, async (req, res) => {
  try {
    const [[profile]] = await dbPromise.query(
      "SELECT * FROM users WHERE id = ?", [req.session.user.id]
    );
    res.render("profile-edit", { profile, error: null, success: null });
  } catch (err) {
    res.render("error", { message: "Could not load profile." });
  }
});

// ── Edit Profile (POST) — Save updated profile ────────────────
// This is the PERSONALISATION REQUIREMENT — users manage their own info
app.post("/profile/edit", requireLogin, upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { full_name, phone, bio, current_password, new_password } = req.body;

    // If user uploaded a new avatar image, use its filename; otherwise keep old one
    let avatarFilename = null;
    if (req.file) {
      avatarFilename = "/images/uploads/" + req.file.filename;
    }

    // Fetch existing profile to check current password if changing it
    const [[existing]] = await dbPromise.query(
      "SELECT * FROM users WHERE id = ?", [userId]
    );

    let hashedPassword = existing.password; // Keep old password by default

    // If user wants to change password, verify the current one first
    if (new_password && new_password.trim() !== "") {
      const passwordOk = await bcrypt.compare(current_password, existing.password);
      if (!passwordOk) {
        return res.render("profile-edit", {
          profile: existing,
          error: "Current password is incorrect.",
          success: null,
        });
      }
      // Hash the new password before saving
      hashedPassword = await bcrypt.hash(new_password, 10);
    }

    // Build UPDATE query — only update avatar if a new one was uploaded
    if (avatarFilename) {
      await dbPromise.query(
        "UPDATE users SET full_name=?, phone=?, bio=?, avatar=?, password=? WHERE id=?",
        [full_name, phone, bio, avatarFilename, hashedPassword, userId]
      );
    } else {
      await dbPromise.query(
        "UPDATE users SET full_name=?, phone=?, bio=?, password=? WHERE id=?",
        [full_name, phone, bio, hashedPassword, userId]
      );
    }

    // Update the session with the new name/avatar so the navbar refreshes
    req.session.user.full_name = full_name;
    if (avatarFilename) req.session.user.avatar = avatarFilename;

    // Re-fetch updated profile to show in form
    const [[updatedProfile]] = await dbPromise.query(
      "SELECT * FROM users WHERE id = ?", [userId]
    );

    res.render("profile-edit", { profile: updatedProfile, error: null, success: "Profile updated successfully!" });
  } catch (err) {
    console.error("Profile edit error:", err);
    res.render("error", { message: "Could not update profile." });
  }
});

// ============================================================
// BOOKINGS — Resource Management (Functional Expectation #3)
// CRUD: Create, Read (in dashboard), Update, Delete
// ============================================================

// ── Create Booking (GET) — Show booking form ──────────────────
// GET /book/:roomId — Pre-fill form with chosen room
app.get("/book/:roomId", requireLogin, async (req, res) => {
  try {
    const [[room]] = await dbPromise.query(
      "SELECT * FROM rooms WHERE id = ? AND is_available = 1",
      [req.params.roomId]
    );
    if (!room) {
      return res.status(404).render("error", { message: "Room not found or unavailable." });
    }
    res.render("book", { room, error: null });
  } catch (err) {
    res.render("error", { message: "Could not load booking form." });
  }
});

// ── Create Booking (POST) — Save new booking to DB ───────────
app.post("/book/:roomId", requireLogin, async (req, res) => {
  try {
    const userId   = req.session.user.id;
    const roomId   = req.params.roomId;
    const { check_in, check_out, guests, special_requests } = req.body;

    // Validate dates: check_in must be before check_out
    const inDate  = new Date(check_in);
    const outDate = new Date(check_out);
    if (inDate >= outDate) {
      const [[room]] = await dbPromise.query("SELECT * FROM rooms WHERE id = ?", [roomId]);
      return res.render("book", { room, error: "Check-out must be after check-in date." });
    }

    // Calculate total cost: nights × price per night
    const nights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
    const [[room]] = await dbPromise.query(
      "SELECT price_per_night FROM rooms WHERE id = ?", [roomId]
    );
    const totalPrice = nights * room.price_per_night;

    // Insert booking into database with status = 'pending'
    await dbPromise.query(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, special_requests, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, roomId, check_in, check_out, guests, special_requests, totalPrice]
    );

    // Redirect to dashboard after booking
    res.redirect("/dashboard?booked=1");
  } catch (err) {
    console.error("Booking creation error:", err);
    res.render("error", { message: "Could not create booking." });
  }
});

// ── Edit Booking (GET) — Show edit form ───────────────────────
app.get("/booking/edit/:id", requireLogin, async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const bookingId = req.params.id;

    // Fetch booking — ensure it belongs to the logged-in user (security check)
    const [[booking]] = await dbPromise.query(
      `SELECT b.*, r.room_name, r.price_per_night, r.image_url
       FROM bookings b JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ? AND b.user_id = ?`,
      [bookingId, userId]
    );

    if (!booking) {
      return res.status(403).render("error", { message: "Booking not found or access denied." });
    }

    // Guests can only edit pending bookings (not confirmed/completed ones)
    if (booking.status !== "pending") {
      return res.render("error", { message: "Only pending bookings can be edited." });
    }

    res.render("booking-edit", { booking, error: null });
  } catch (err) {
    res.render("error", { message: "Could not load booking." });
  }
});

// ── Edit Booking (POST) — Save updated booking ────────────────
app.post("/booking/edit/:id", requireLogin, async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const bookingId = req.params.id;
    const { check_in, check_out, guests, special_requests } = req.body;

    // Re-validate that this booking belongs to the user
    const [[booking]] = await dbPromise.query(
      "SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = 'pending'",
      [bookingId, userId]
    );
    if (!booking) {
      return res.status(403).render("error", { message: "Access denied." });
    }

    // Recalculate total price for the updated dates
    const inDate  = new Date(check_in);
    const outDate = new Date(check_out);
    const nights  = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
    const [[room]] = await dbPromise.query(
      "SELECT price_per_night FROM rooms WHERE id = ?", [booking.room_id]
    );
    const totalPrice = nights * room.price_per_night;

    // Update booking record
    await dbPromise.query(
      "UPDATE bookings SET check_in=?, check_out=?, guests=?, special_requests=?, total_price=? WHERE id=?",
      [check_in, check_out, guests, special_requests, totalPrice, bookingId]
    );

    res.redirect("/dashboard?updated=1");
  } catch (err) {
    console.error("Booking update error:", err);
    res.render("error", { message: "Could not update booking." });
  }
});

// ── Delete Booking ────────────────────────────────────────────
// POST /booking/delete/:id — Guests can cancel their own pending bookings
app.post("/booking/delete/:id", requireLogin, async (req, res) => {
  try {
    const userId    = req.session.user.id;
    const bookingId = req.params.id;

    // Only allow deletion of the user's own pending bookings
    const [[booking]] = await dbPromise.query(
      "SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = 'pending'",
      [bookingId, userId]
    );

    if (!booking) {
      return res.status(403).render("error", { message: "Cannot cancel this booking." });
    }

    await dbPromise.query("DELETE FROM bookings WHERE id = ?", [bookingId]);
    res.redirect("/dashboard?cancelled=1");
  } catch (err) {
    console.error("Booking delete error:", err);
    res.render("error", { message: "Could not cancel booking." });
  }
});

// ============================================================
// REVIEWS — Secondary Resource (CRUD)
// ============================================================

// ── Submit a Review ───────────────────────────────────────────
// POST /review — Guests can leave a review for a room they stayed in
app.post("/review", requireLogin, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { room_id, rating, comment } = req.body;

    // Validate: rating must be 1–5
    if (!rating || rating < 1 || rating > 5) {
      return res.redirect(`/rooms/${room_id}?error=invalid_rating`);
    }

    // Check user hasn't already reviewed this room
    const [[existing]] = await dbPromise.query(
      "SELECT id FROM reviews WHERE user_id = ? AND room_id = ?",
      [userId, room_id]
    );
    if (existing) {
      return res.redirect(`/rooms/${room_id}?error=already_reviewed`);
    }

    await dbPromise.query(
      "INSERT INTO reviews (user_id, room_id, rating, comment) VALUES (?, ?, ?, ?)",
      [userId, room_id, rating, comment]
    );

    res.redirect(`/rooms/${room_id}?reviewed=1`);
  } catch (err) {
    console.error("Review error:", err);
    res.render("error", { message: "Could not submit review." });
  }
});

// ── Delete a Review ───────────────────────────────────────────
app.post("/review/delete/:id", requireLogin, async (req, res) => {
  try {
    const userId   = req.session.user.id;
    const reviewId = req.params.id;

    // User can only delete their own reviews (admins bypass this below)
    const [[review]] = await dbPromise.query(
      "SELECT * FROM reviews WHERE id = ?", [reviewId]
    );

    if (!review) return res.status(404).render("error", { message: "Review not found." });

    // Only allow deletion if it's the user's own review OR they're an admin
    if (review.user_id !== userId && req.session.user.role !== "admin") {
      return res.status(403).render("error", { message: "Cannot delete this review." });
    }

    await dbPromise.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
    res.redirect(req.headers.referer || "/dashboard"); // Go back to previous page
  } catch (err) {
    res.render("error", { message: "Could not delete review." });
  }
});

// ============================================================
// ADMIN PANEL — Role-Based Access (Functional Expectation #2)
// All routes below require requireAdmin middleware
// ============================================================

// ── Admin Dashboard ───────────────────────────────────────────
app.get("/admin", requireAdmin, async (req, res) => {
  try {
    // Aggregate statistics for the admin overview cards
    const [[{ totalUsers }]]    = await dbPromise.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalRooms }]]    = await dbPromise.query("SELECT COUNT(*) AS totalRooms FROM rooms");
    const [[{ totalBookings }]] = await dbPromise.query("SELECT COUNT(*) AS totalBookings FROM bookings");
    const [[{ revenue }]]       = await dbPromise.query(
      "SELECT COALESCE(SUM(total_price),0) AS revenue FROM bookings WHERE status = 'confirmed'"
    );

    // Recent bookings list (last 5)
    const [recentBookings] = await dbPromise.query(
      `SELECT b.*, u.full_name, r.room_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN rooms r ON b.room_id = r.id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    res.render("admin/dashboard", { totalUsers, totalRooms, totalBookings, revenue, recentBookings });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.render("error", { message: "Could not load admin dashboard." });
  }
});

// ── Admin: Manage All Rooms ───────────────────────────────────
app.get("/admin/rooms", requireAdmin, async (req, res) => {
  try {
    const [rooms] = await dbPromise.query("SELECT * FROM rooms ORDER BY created_at DESC");
    res.render("admin/rooms", { rooms, success: req.query.success || null });
  } catch (err) {
    res.render("error", { message: "Could not load rooms." });
  }
});

// ── Admin: Add Room (GET) — Show form ─────────────────────────
app.get("/admin/rooms/add", requireAdmin, (req, res) => {
  res.render("admin/room-form", { room: null, error: null });
});

// ── Admin: Add Room (POST) — Save to DB ──────────────────────
app.post("/admin/rooms/add", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const { room_name, room_type, price_per_night, capacity, description, amenities } = req.body;

    // Image URL from multer (if uploaded) or a default placeholder
    const imageUrl = req.file
      ? "/images/uploads/" + req.file.filename
      : "/images/room-placeholder.jpg";

    await dbPromise.query(
      `INSERT INTO rooms (room_name, room_type, price_per_night, capacity, description, amenities, image_url, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [room_name, room_type, price_per_night, capacity, description, amenities, imageUrl]
    );

    res.redirect("/admin/rooms?success=added");
  } catch (err) {
    console.error("Add room error:", err);
    res.render("admin/room-form", { room: null, error: "Could not add room. Check all fields." });
  }
});

// ── Admin: Edit Room (GET) ────────────────────────────────────
app.get("/admin/rooms/edit/:id", requireAdmin, async (req, res) => {
  try {
    const [[room]] = await dbPromise.query("SELECT * FROM rooms WHERE id = ?", [req.params.id]);
    if (!room) return res.status(404).render("error", { message: "Room not found." });
    res.render("admin/room-form", { room, error: null });
  } catch (err) {
    res.render("error", { message: "Could not load room." });
  }
});

// ── Admin: Edit Room (POST) ───────────────────────────────────
app.post("/admin/rooms/edit/:id", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const { room_name, room_type, price_per_night, capacity, description, amenities, is_available } = req.body;
    const roomId = req.params.id;

    // Fetch existing room to preserve old image if no new one uploaded
    const [[existingRoom]] = await dbPromise.query("SELECT * FROM rooms WHERE id = ?", [roomId]);
    const imageUrl = req.file
      ? "/images/uploads/" + req.file.filename
      : existingRoom.image_url; // Keep existing image

    await dbPromise.query(
      `UPDATE rooms SET room_name=?, room_type=?, price_per_night=?, capacity=?,
       description=?, amenities=?, image_url=?, is_available=? WHERE id=?`,
      [room_name, room_type, price_per_night, capacity, description, amenities,
       imageUrl, is_available === "1" ? 1 : 0, roomId]
    );

    res.redirect("/admin/rooms?success=updated");
  } catch (err) {
    console.error("Edit room error:", err);
    res.render("error", { message: "Could not update room." });
  }
});

// ── Admin: Delete Room ────────────────────────────────────────
app.post("/admin/rooms/delete/:id", requireAdmin, async (req, res) => {
  try {
    const roomId = req.params.id;

    // First delete associated bookings and reviews (referential integrity)
    await dbPromise.query("DELETE FROM reviews WHERE room_id = ?", [roomId]);
    await dbPromise.query("DELETE FROM bookings WHERE room_id = ?", [roomId]);
    await dbPromise.query("DELETE FROM rooms WHERE id = ?", [roomId]);

    res.redirect("/admin/rooms?success=deleted");
  } catch (err) {
    console.error("Delete room error:", err);
    res.render("error", { message: "Could not delete room." });
  }
});

// ── Admin: Manage All Bookings ────────────────────────────────
app.get("/admin/bookings", requireAdmin, async (req, res) => {
  try {
    const { status = "" } = req.query; // Filter by booking status

    let sql = `
      SELECT b.*, u.full_name, u.email, r.room_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rooms r ON b.room_id = r.id
    `;
    const params = [];

    if (status) {
      sql += " WHERE b.status = ?";
      params.push(status);
    }
    sql += " ORDER BY b.created_at DESC";

    const [bookings] = await dbPromise.query(sql, params);
    res.render("admin/bookings", { bookings, status });
  } catch (err) {
    res.render("error", { message: "Could not load bookings." });
  }
});

// ── Admin: Update Booking Status ──────────────────────────────
// Admins can confirm, check guests in/out, or cancel bookings
app.post("/admin/bookings/status/:id", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled'
    await dbPromise.query(
      "UPDATE bookings SET status = ? WHERE id = ?",
      [status, req.params.id]
    );
    res.redirect("/admin/bookings?success=updated");
  } catch (err) {
    res.render("error", { message: "Could not update booking status." });
  }
});

// ── Admin: Manage All Users ───────────────────────────────────
app.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { search = "" } = req.query;
    let sql = "SELECT id, full_name, email, phone, role, created_at FROM users";
    const params = [];

    // Search users by name or email
    if (search) {
      sql += " WHERE full_name LIKE ? OR email LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY created_at DESC";

    const [users] = await dbPromise.query(sql, params);
    res.render("admin/users", { users, search });
  } catch (err) {
    res.render("error", { message: "Could not load users." });
  }
});

// ── Admin: Toggle User Role ───────────────────────────────────
// Promote a guest to admin, or demote an admin to guest
app.post("/admin/users/role/:id", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admins from changing their own role
    if (userId == req.session.user.id) {
      return res.redirect("/admin/users?error=self");
    }

    // Fetch current role and flip it
    const [[user]] = await dbPromise.query("SELECT role FROM users WHERE id = ?", [userId]);
    const newRole = user.role === "admin" ? "guest" : "admin";

    await dbPromise.query("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);
    res.redirect("/admin/users?success=role_changed");
  } catch (err) {
    res.render("error", { message: "Could not change role." });
  }
});

// ── Admin: Delete User ────────────────────────────────────────
app.post("/admin/users/delete/:id", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Don't allow admin to delete themselves
    if (userId == req.session.user.id) {
      return res.redirect("/admin/users?error=self");
    }

    // Cascade delete: remove user's reviews and bookings first
    await dbPromise.query("DELETE FROM reviews WHERE user_id = ?", [userId]);
    await dbPromise.query("DELETE FROM bookings WHERE user_id = ?", [userId]);
    await dbPromise.query("DELETE FROM users WHERE id = ?", [userId]);

    res.redirect("/admin/users?success=deleted");
  } catch (err) {
    res.render("error", { message: "Could not delete user." });
  }
});

// ============================================================
// ERROR HANDLING — 404 Not Found
// ============================================================

// This catches any route that wasn't matched above
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found (404)." });
});

// ============================================================
// START THE SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DreamStay Hotel App running at http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/admin`);
});
