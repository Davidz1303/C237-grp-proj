// ================================================================
// main.js — DreamStay Hotel Client-Side JavaScript
// C237 Software Application Development — CA2
// ================================================================
// This file handles all browser-side interactivity:
//   • Mobile navbar toggle
//   • User dropdown menu
//   • Password show/hide toggle
//   • Password strength meter
//   • Star rating picker (reviews)
//   • Date validation & live price calculator (booking forms)
//   • Avatar image preview (profile edit)
//   • Auto-dismiss alert messages
//   • Smooth scroll & active nav link highlighting
// ================================================================

// ── Wait for the DOM to be fully loaded before running any JS ──
// This prevents errors from trying to access elements that don't exist yet
document.addEventListener("DOMContentLoaded", () => {

  // ==============================================================
  // 1. MOBILE NAVBAR TOGGLE
  // ==============================================================
  // When the hamburger button (#navToggle) is clicked on mobile,
  // we toggle an "open" class on the nav links list to show/hide it.

  const navToggle = document.getElementById("navToggle");  // Hamburger button
  const navLinks  = document.getElementById("navLinks");   // Nav links <ul>

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open"); // CSS uses .open to display the menu
    });

    // Close the mobile menu if the user clicks anywhere outside the navbar
    document.addEventListener("click", (e) => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove("open");
      }
    });
  }

  // ==============================================================
  // 2. USER DROPDOWN MENU (navbar avatar button)
  // ==============================================================
  // Clicking the user avatar/name in the navbar opens a small dropdown
  // with links to "Edit Profile" and "Logout".

  const userMenuBtn  = document.getElementById("userMenuBtn");   // Avatar button
  const userDropdown = document.getElementById("userDropdown");  // Dropdown div
  const chevron      = userMenuBtn?.querySelector(".nav-chevron");

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the document click below from firing immediately
      userDropdown.classList.toggle("open");
      chevron?.classList.toggle("rotated"); // Rotate the chevron arrow icon
    });

    // Close dropdown when clicking anywhere else on the page
    document.addEventListener("click", () => {
      userDropdown.classList.remove("open");
      chevron?.classList.remove("rotated");
    });
  }

  // ==============================================================
  // 3. PASSWORD SHOW / HIDE TOGGLE
  // ==============================================================
  // The eye icon button beside password inputs toggles between
  // type="password" (hidden) and type="text" (visible).

  const togglePwd = document.getElementById("togglePwd");
  const pwdInput  = document.getElementById("password") ||
                    document.getElementById("current_password");

  if (togglePwd) {
    togglePwd.addEventListener("click", () => {
      // Find the password input that's a sibling of this toggle button
      const input = togglePwd.previousElementSibling ||
                    togglePwd.closest(".input-icon-wrap")?.querySelector("input");
      if (!input) return;

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      // Swap the eye icon: fa-eye (visible) ↔ fa-eye-slash (hidden)
      const icon = togglePwd.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye",       !isHidden);
        icon.classList.toggle("fa-eye-slash",  isHidden);
      }
    });
  }

  // ==============================================================
  // 4. PASSWORD STRENGTH METER (Register page)
  // ==============================================================
  // As the user types their new password, we evaluate its strength
  // and show a colour-coded bar + label ("Weak", "Fair", "Strong").

  const pwdField      = document.getElementById("password");
  const strengthBar   = document.getElementById("strengthBar");
  const strengthLabel = document.getElementById("strengthLabel");

  if (pwdField && strengthBar && strengthLabel) {
    pwdField.addEventListener("input", () => {
      const val   = pwdField.value;
      let score   = 0;  // 0–4 score based on criteria below

      // Criteria: length, uppercase, lowercase, number, special char
      if (val.length >= 6)                   score++;
      if (val.length >= 10)                  score++;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
      if (/[0-9]/.test(val))                 score++;
      if (/[^A-Za-z0-9]/.test(val))          score++;

      // Map score to visual feedback
      const levels = [
        { label: "",         color: "transparent", width: "0%" },
        { label: "Too short", color: "#e74c3c",   width: "20%" },
        { label: "Weak",      color: "#e67e22",   width: "40%" },
        { label: "Fair",      color: "#f1c40f",   width: "65%" },
        { label: "Good",      color: "#2ecc71",   width: "85%" },
        { label: "Strong",    color: "#27ae60",   width: "100%" },
      ];

      // Clamp score to valid index
      const level = levels[Math.min(score, 5)];

      strengthBar.style.width      = level.width;
      strengthBar.style.background = level.color;
      strengthLabel.textContent    = level.label;
      strengthLabel.style.color    = level.color;
    });
  }

  // ==============================================================
  // 5. STAR RATING PICKER (Room detail review form)
  // ==============================================================
  // The five star icons in the review form are interactive.
  // Hovering highlights stars up to the hovered one;
  // clicking locks in the selection and updates the hidden input.

  const starPicker   = document.getElementById("starPicker");
  const ratingInput  = document.getElementById("ratingInput");

  if (starPicker && ratingInput) {
    const stars = starPicker.querySelectorAll(".star-pick");

    // Helper: paint stars up to `value` as active (gold), rest as inactive
    const highlight = (value) => {
      stars.forEach((s) => {
        s.classList.toggle("active", parseInt(s.dataset.value) <= value);
      });
    };

    stars.forEach((star) => {
      // On hover: preview the rating
      star.addEventListener("mouseenter", () => {
        highlight(parseInt(star.dataset.value));
      });

      // On mouse leave: revert to currently selected value (or 0 if none)
      star.addEventListener("mouseleave", () => {
        highlight(parseInt(ratingInput.value) || 0);
      });

      // On click: commit the rating to the hidden input
      star.addEventListener("click", () => {
        const val = parseInt(star.dataset.value);
        ratingInput.value = val;   // This value is sent with the form
        highlight(val);
      });
    });
  }

  // ==============================================================
  // 6. BOOKING DATE VALIDATION + LIVE PRICE CALCULATOR
  // ==============================================================
  // On the booking forms (/book/:roomId and /booking/edit/:id):
  //   a) Set today as the minimum date for check-in
  //   b) When check-out changes, ensure it's after check-in
  //   c) Calculate and display the estimated total price in real time

  const checkInInput  = document.getElementById("check_in");
  const checkOutInput = document.getElementById("check_out");
  const pricePerNight = parseFloat(document.getElementById("pricePerNight")?.value || 0);
  const priceEstimate = document.getElementById("priceEstimate");
  const estimateNights = document.getElementById("estimateNights");
  const estimateTotal  = document.getElementById("estimateTotal");

  if (checkInInput && checkOutInput) {
    // ── a) Set minimum date to today (prevents selecting past dates) ──
    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
    checkInInput.min = today;

    // ── b) When check-in changes, update check-out minimum ──
    checkInInput.addEventListener("change", () => {
      // Check-out must be at least the day after check-in
      const minCheckOut = new Date(checkInInput.value);
      minCheckOut.setDate(minCheckOut.getDate() + 1); // Add 1 day
      checkOutInput.min = minCheckOut.toISOString().split("T")[0];

      // If check-out is now invalid (before new check-in), clear it
      if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
        checkOutInput.value = "";
        if (priceEstimate) priceEstimate.style.display = "none";
      }

      updatePriceEstimate(); // Recalculate on every change
    });

    // ── c) Live price estimate update when check-out changes ──
    checkOutInput.addEventListener("change", updatePriceEstimate);

    // Also calculate immediately on page load (edit form has pre-filled dates)
    updatePriceEstimate();
  }

  // Helper function: calculate nights and update the price estimate box
  function updatePriceEstimate() {
    if (!checkInInput || !checkOutInput || !priceEstimate) return;

    const inDate  = new Date(checkInInput.value);
    const outDate = new Date(checkOutInput.value);

    // Only show estimate if both dates are valid and in correct order
    if (!checkInInput.value || !checkOutInput.value || inDate >= outDate) {
      priceEstimate.style.display = "none";
      return;
    }

    // Calculate number of nights (milliseconds → days)
    const nights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
    const total  = (nights * pricePerNight).toFixed(2);

    // Update the display elements in the price estimate box
    if (estimateNights) estimateNights.textContent = nights;
    if (estimateTotal)  estimateTotal.textContent  = total;

    priceEstimate.style.display = "block"; // Make the estimate box visible
  }

  // ==============================================================
  // 7. AVATAR IMAGE PREVIEW (Profile Edit page)
  // ==============================================================
  // When the user selects a new profile photo, we immediately
  // show a preview without needing to submit the form first.

  const avatarInput       = document.getElementById("avatar");
  const avatarPreview     = document.getElementById("avatarPreview");
  const avatarPlaceholder = document.getElementById("avatarPlaceholder");

  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0]; // Get the selected file
      if (!file) return;

      // FileReader reads the file as a data URL (base64 encoded image)
      const reader = new FileReader();
      reader.onload = (event) => {
        // Show the <img> with the new photo and hide the letter placeholder
        avatarPreview.src = event.target.result;
        avatarPreview.classList.remove("hidden");

        if (avatarPlaceholder) {
          avatarPlaceholder.classList.add("hidden"); // Hide the letter avatar
        }
      };
      reader.readAsDataURL(file); // Trigger the read
    });
  }

  // ==============================================================
  // 8. AUTO-DISMISS ALERT MESSAGES
  // ==============================================================
  // Success / warning alerts disappear automatically after 5 seconds.
  // Error alerts stay visible so the user can read them.

  const alerts = document.querySelectorAll(".alert-success, .alert-warning");
  alerts.forEach((alert) => {
    setTimeout(() => {
      // Fade out using CSS transition then remove from DOM
      alert.style.transition = "opacity 0.5s ease";
      alert.style.opacity    = "0";

      // Remove the element after the fade animation completes
      setTimeout(() => alert.remove(), 500);
    }, 5000); // 5 seconds
  });

  // ==============================================================
  // 9. ACTIVE NAV LINK HIGHLIGHTING
  // ==============================================================
  // Adds an "active" style to the current page's nav link
  // by comparing the link href to the current page URL.

  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach((link) => {
    // Exact match for home ("/"), startsWith for other routes
    const href = link.getAttribute("href");
    if (href === "/" ? currentPath === "/" : currentPath.startsWith(href)) {
      link.style.color      = "var(--gold)";  // Highlight with gold colour
      link.style.fontWeight = "600";
    }
  });

  // ==============================================================
  // 10. SMOOTH SCROLL for anchor links
  // ==============================================================
  // Any <a href="#section"> link will scroll smoothly to the target.
  // (CSS `scroll-behavior: smooth` handles most of this, but
  //  this JS version gives more control and cross-browser support.)

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ==============================================================
  // 11. ADMIN FORM: Image preview before upload
  // ==============================================================
  // On the admin room add/edit form, show a preview of the
  // selected room image before the form is submitted.

  const adminImageInput   = document.querySelector('input[name="image"]');
  const adminImagePreview = document.querySelector(".admin-room-thumb-lg");

  if (adminImageInput) {
    adminImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        if (adminImagePreview) {
          // Replace existing preview image
          adminImagePreview.src = ev.target.result;
        } else {
          // Create a new preview image element if none exists
          const img = document.createElement("img");
          img.src       = ev.target.result;
          img.className = "admin-room-thumb-lg";
          img.alt       = "Preview";
          // Insert the preview before the file input
          adminImageInput.parentNode.insertBefore(img, adminImageInput);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // ==============================================================
  // 12. NAVBAR SCROLL EFFECT
  // ==============================================================
  // Add a subtle background change / shadow when the user
  // scrolls down the page (makes the sticky navbar stand out more).

  const navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        // Page has been scrolled — add elevated look
        navbar.style.boxShadow = "0 4px 24px rgba(0,0,0,0.25)";
      } else {
        // At the top — restore original shadow
        navbar.style.boxShadow = "";
      }
    });
  }

  // ==============================================================
  // 13. CONFIRM DIALOG ENHANCEMENT
  // ==============================================================
  // All delete/cancel buttons already use onclick="return confirm(...)"
  // in the HTML. This JS adds a global keyboard shortcut: pressing
  // Escape closes any open dropdown menus (UX improvement).

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Close user dropdown if open
      userDropdown?.classList.remove("open");
      chevron?.classList.remove("rotated");

      // Close mobile nav if open
      navLinks?.classList.remove("open");
    }
  });

  // ==============================================================
  // 14. TABLE ROW CLICK (Admin tables — click a row to highlight it)
  // ==============================================================
  // Makes it easier to scan long tables by highlighting the
  // clicked row with a subtle background colour.

  document.querySelectorAll(".data-table tbody tr").forEach((row) => {
    row.addEventListener("click", (e) => {
      // Don't trigger when clicking actual buttons/links inside the row
      if (e.target.closest(".btn, a, form, select, button")) return;

      // Toggle highlight on click
      const isSelected = row.classList.contains("row-selected");
      // First, deselect all rows
      document.querySelectorAll(".data-table tbody tr").forEach((r) => {
        r.classList.remove("row-selected");
        r.style.background = "";
      });
      // Then select clicked row (unless it was already selected)
      if (!isSelected) {
        row.classList.add("row-selected");
        row.style.background = "rgba(201,169,110,0.08)"; // Subtle gold tint
      }
    });
  });

  // ==============================================================
  // 15. GUEST STORIES: STAR PICKER + CHARACTER COUNTER (Person 2)
  // ==============================================================
  // The rating stars on the Guest Stories form work the same way
  // as the room review stars: hover previews the rating, click
  // locks it in and updates the hidden input that gets submitted.
  // The textarea counter just shows how many characters are left.

  const testimonialStars = document.getElementById("testimonialStarPicker");
  const testimonialRating = document.getElementById("testimonialRatingInput");

  if (testimonialStars && testimonialRating) {
    const stars = testimonialStars.querySelectorAll(".star-pick");

    const highlightStars = (value) => {
      stars.forEach((s) => {
        s.classList.toggle("active", parseInt(s.dataset.value) <= value);
      });
    };

    stars.forEach((star) => {
      star.addEventListener("mouseenter", () => {
        highlightStars(parseInt(star.dataset.value));
      });
      star.addEventListener("mouseleave", () => {
        highlightStars(parseInt(testimonialRating.value) || 0);
      });
      star.addEventListener("click", () => {
        testimonialRating.value = star.dataset.value;
        highlightStars(parseInt(testimonialRating.value));
      });
    });
  }

  const testimonialQuote = document.getElementById("testimonialQuote");
  const testimonialCounter = document.getElementById("testimonialCharCounter");

  if (testimonialQuote && testimonialCounter) {
    const updateCount = () => {
      testimonialCounter.textContent = `${testimonialQuote.value.length}/400`;
    };
    testimonialQuote.addEventListener("input", updateCount);
    updateCount(); // Run once so an edited story shows the right count immediately
  }

}); // End of DOMContentLoaded
