# HNK Developer Portfolio

A modern, high-performance, single-page developer portfolio showcasing backend engineering expertise. Built using Vanilla HTML, CSS, and JS with a glowing cyberpunk aesthetic, interactive animations, and built-in visitor analytics.

---

##  Core Features

*   **Interactive Code Typewriter Mockup**: A simulated React IDE window that dynamically types out a syntax-highlighted `portfolio.tsx` component in real-time.
*   **Environment-Aware SPA Routing**: 
    *   *Local (VS Code Live Server)*: Fallback hash routing (`#about`, `#projects`) to prevent 404 server errors.
    *   *Production (Vercel)*: Fully path-based slash URLs (`/about`, `/projects`) dynamically synchronized in the browser address bar.
*   **Asynchronous Message Terminal**: Contact form supporting direct **Formspree** email routing with an interactive, retro-terminal success receipt logging system.
*   **Embedded Visitor Analytics**: Custom `tracker.js` analytics logging pageviews, device info, browser types, locations, and interactive clicks.
*   **Premium Aesthetics**: Curated Cyberpunk Orange/Blue color palette, smooth drifting background blur orbs, and fully responsive grid cards.

---

## Project Directory Structure


portfolio/
├── index.html       # Main webpage structure & section frames
├── style.css        # Premium stylesheets & responsiveness overrides
├── site.js          # Core animations, contact forms, & routing logics
├── tracker.js       # Custom visitor analytics client-side script
├── vercel.json      # Production SPA URL path rewrites config
├── Media.jpg        # Profile card avatar photo
├── resume.pdf       # Downloadable CV asset
└── README.md        # Documentation

---

##  Running Locally

1. Open your code editor (e.g., **VS Code**) inside the project root folder.
2. Install the **Live Server** extension.
3. Click the **Go Live** button in the status bar.
4. Access the site in your browser at `http://127.0.0.1:5500/index.html`.

---

##  Connecting the Contact Form

To receive direct messages from the contact form straight to your email address:
1. Create a free form at [Formspree](https://formspree.io/).
2. Copy your unique Formspree Form ID.
3. Open `site.js` and paste your ID into the variable at the top of the form handler:
  
   const FORMSPREE_FORM_ID = "YOUR_FORMSPREE_ID_HERE";
   

---

##  Production Deployment (Vercel)

This static portfolio is pre-configured with a `vercel.json` rewrite file to support path URL rewrites automatically.

### Method A: Web Dashboard (Drag & Drop)
1. Go to your [Vercel Dashboard](https://vercel.com/).
2. Drag and drop the `portfolio` folder directly into the browser to deploy.

### Method B: Vercel CLI
Run the following commands in your terminal:

# Install CLI
npm install -g vercel

# Deploy project
cd "C:\Users\DELL\OneDrive - INSPOWORKS TECHNOLOGIES\Documents\portfolio"

