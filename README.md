# 🌍 Fan Map Website – Zhou Shen Global Wishes & Events

A static, interactive map showcasing **fan wishes**, **singer activities**, and **past fan meetups** across North America, powered by **Mapbox GL JS** and **GeoJSON**.  
Built as a single-page web app, hosted on GitHub Pages or AWS S3.

---

## 🧩 Features

- 🎯 Interactive map centered on North America
- 💌 Fan Wishes layer (with popup cards)
- 🎤 Singer Activities layer (timeline-based display)
- 🎉 Past Meetups (with photo/video thumbnails)
- ✅ Layer toggle with checkboxes
- 📱 Mobile-friendly layout with detail modals

---

## 📐 Functional Requirements

- Load and render multiple GeoJSON datasets:
  - `fan_wishes.geojson`
  - `singer_activities.geojson`
  - `fan_meetups.geojson`
- Show stylized markers with color, emoji, or icons
- Display detailed card popup or side panel on feature click
- Toggle layers visibility via checkboxes
- Fully responsive layout (mobile & desktop)

---

## 🔧 Technical Components

### ✅ Frontend
- **Mapbox GL JS** (`mapbox-gl`)
- Custom map style from **Mapbox Studio**
- HTML + CSS + JS (or React if preferred)
- UI components: checkboxes, modals, popups
- No server backend needed for frontend

### 🗂️ Data
- Datasets stored as `.geojson` in `/public/data/` folder of **same repo**
- Example paths:
  - `/data/fan_wishes.geojson`
  - `/data/singer_activities.geojson`
- Fetched at runtime via `fetch()` or AJAX

### 🧾 Hosting
- Default: **GitHub Pages**
  - Can load static GeoJSON directly via relative path
- Optional: AWS S3 static website

---

## 🧠 Non-Functional Requirements

- Loads under 1s on first view
- Smooth UX with 500+ points per layer
- GeoJSON file size ≤ 100MB each
- Optimized for Chrome, Safari, Firefox, mobile browsers
- Mapbox API usage stays within free tier (based on map loads)

---

## 📦 Project Structure

/public
index.html
/css
/js
/assets
/data
fan_wishes.geojson
singer_activities.geojson
fan_meetups.geojson

README.md


---

## 🛠️ Setup (for local dev)

```bash
# optional if using npm or bundlers
npm install

# local server for testing
npx serve public

···

