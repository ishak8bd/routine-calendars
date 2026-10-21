# 📅 RoutineMaster • Multi-Calendar & Routines (PWA)

A clean, modern mobile web app designed to organize your monthly routines, habits, and dates across dedicated calendar layers with **100% free, zero-server, hardware-level phone alarms**.

---

## 🌟 Key Features

1. **🌐 Global Calendar (Master Lens)**:
   - Displays all your active routines merged into one unified monthly grid.
   - Micro-indicator dots with glowing category colors (up to 3 dots + `+N` badge per date cell).
   - "Today" circular focus badge and selected date highlighting.

2. **🏷️ Dynamic Calendar Layers (CRUD)**:
   - Preloaded with:
     - 💼 **Work Days** (Indigo `#6366F1`)
     - 🏋️ **Gym Days** (Coral `#F97316`)
     - 🏃 **Running** (Mint `#10B981`)
     - 🧖 **Hair & Face** (Rose `#EC4899`)
     - 🎂 **Birthdays & Dates** (Amber `#F59E0B`)
   - **Create New Calendars**: Pick any name, choose from 14 curated emojis or custom text, and select from 12 vibrant pastel swatches.
   - **Edit / Re-skin**: Change colors or icons anytime — all past and future calendar dots update immediately.
   - **Delete**: Safe deletion with routine count confirmation.

3. **⏰ Hardware Phone Alarms (`.ics` RFC 5545 with `VALARM`)**:
   - **Zero Servers, Zero Cost, 100% Lifetime Free**.
   - Embeds native device alarms (`BEGIN:VALARM`).
   - Tapping **"Sync Alarms"** lets you export to Apple Calendar (iOS) or Google Calendar (Android).
   - Rings on your lock screen with sound even when the phone is in battery-saver mode, restarted, or the app was purged from RAM for weeks.

4. **📱 Tactile Mobile Agenda Deck (Bottom Sheet)**:
   - Tap any date to view all scheduled routines.
   - Bouncy tactile `[✅ Done]` checkmark button to track completion.
   - Add new routines with custom repeat patterns:
     - *One-time*, *Daily*, *Every 2/3/4 days (Interval cycles for skincare & hair)*, *Weekly*, *Monthly*, or *Yearly (Birthdays)*.

5. **💾 100% Offline & Private (PWA)**:
   - All data stays inside your device's `localStorage`.
   - Installable to your phone's Home Screen via Service Worker & Web App Manifest.
   - One-click JSON Backup & Restore.

---

## 🚀 How to Run Locally

You can launch a local web server to test on your PC or phone:

```bash
# Navigate to the folder:
cd routine-calendar

# Using Python 3:
python -m http.server 8080

# Or using Node.js:
npx serve .
```

Then open `http://localhost:8080` in your browser.

---

## 📲 Adding to Your Phone (PWA Install)

- **iPhone (Safari):** Open the site $\rightarrow$ Tap the **Share** button $\rightarrow$ Tap **"Add to Home Screen"**.
- **Android (Chrome):** Open the site $\rightarrow$ Tap the three dots menu $\rightarrow$ Tap **"Install App"** or **"Add to Home screen"**.
