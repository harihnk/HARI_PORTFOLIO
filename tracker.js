(function () {
  const CONFIG = window.TRACKER_CONFIG || {};

  const ENABLED = CONFIG.enabled !== false;
  const API_URL = CONFIG.apiUrl || "http://localhost:3003/events";
  const FLUSH_INTERVAL_MS = CONFIG.flushInterval || 5000;
  const BATCH_SIZE = CONFIG.batchSize || 10;

  if (!ENABLED) {
    return;
  }

  // =====================================
  // USER IDENTIFIERS
  // =====================================
  function getUserId() {
    let uid = localStorage.getItem("tracker_user_id");
    if (!uid) {
      uid = "u_" + crypto.randomUUID();
      localStorage.setItem("tracker_user_id", uid);
    }
    return uid;
  }

  function getSessionId() {
    let sid = sessionStorage.getItem("tracker_session_id");
    if (!sid) {
      sid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("tracker_session_id", sid);
    }
    return sid;
  }

  const userId = getUserId();
  const sessionId = getSessionId();
  let queue = [];

  // =====================================
  // DEVICE & BROWSER DETECTION
  // =====================================
  function getDeviceDetails() {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";
    let device = "Desktop";

    // Browser detection
    if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) {
      browser = "Chrome";
    } else if (/firefox|fxios/i.test(ua)) {
      browser = "Firefox";
    } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) {
      browser = "Safari";
    } else if (/edge|edg/i.test(ua)) {
      browser = "Edge";
    } else if (/opr/i.test(ua)) {
      browser = "Opera";
    }

    // OS detection
    if (/windows/i.test(ua)) {
      os = "Windows";
    } else if (/macintosh|mac os x/i.test(ua) && !/like mac/i.test(ua)) {
      os = "macOS";
    } else if (/linux/i.test(ua) && !/android/i.test(ua)) {
      os = "Linux";
    } else if (/android/i.test(ua)) {
      os = "Android";
      device = "Mobile";
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = "iOS";
      device = /ipad/i.test(ua) ? "Tablet" : "Mobile";
    }

    // Secondary mobile check (touchscreen bypass)
    if (device === "Desktop" && /mobile/i.test(ua)) {
      device = "Mobile";
    }

    return { browser, os, device };
  }

  const deviceDetails = getDeviceDetails();

  // =====================================
  // IP & GEOLOCATION (HTML5 + NOMINATIM REVERSE GEO & IP FALLBACK)
  // =====================================
  let geoData = {
    ip: "unknown",
    country: "unknown",
    region: "unknown",
    city: "unknown"
  };

  function fetchGeoData() {
    const cachedGeo = sessionStorage.getItem("tracker_geo_data");
    if (cachedGeo) {
      try {
        const parsed = JSON.parse(cachedGeo);
        if (parsed && parsed.country !== "unknown" && parsed.city !== "unknown") {
          geoData = parsed;
          return;
        }
      } catch (e) {}
    }

    // Try HTML5 Geolocation for exact location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
            headers: {
              "Accept-Language": "en"
            }
          })
            .then(res => res.json())
            .then(data => {
              const addr = data.address || {};
              geoData = {
                ip: "unknown",
                country: addr.country || "unknown",
                region: addr.state || addr.state_district || "unknown",
                city: addr.city || addr.town || addr.village || addr.suburb || "unknown"
              };
              sessionStorage.setItem("tracker_geo_data", JSON.stringify(geoData));
            })
            .catch(() => {
              fetchIPGeoData();
            });
        },
        () => {
          fetchIPGeoData();
        },
        { timeout: 8000 }
      );
    } else {
      fetchIPGeoData();
    }
  }

  function fetchIPGeoData() {
    return fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        geoData = {
          ip: data.ip || "unknown",
          country: data.country_name || "unknown",
          region: data.region || "unknown",
          city: data.city || "unknown"
        };
        sessionStorage.setItem("tracker_geo_data", JSON.stringify(geoData));
        return geoData;
      })
      .catch(() => {
        return fetch("https://ipinfo.io/json")
          .then(res => res.json())
          .then(data => {
            geoData = {
              ip: data.ip || "unknown",
              country: data.country || "unknown",
              region: data.region || "unknown",
              city: data.city || "unknown"
            };
            sessionStorage.setItem("tracker_geo_data", JSON.stringify(geoData));
            return geoData;
          })
          .catch(() => {
            return geoData;
          });
      });
  }

  // Pre-fetch geolocation details
  fetchGeoData();

  // =====================================
  // NAVIGATION VARIABLES
  // =====================================
  const previousPage = sessionStorage.getItem("last_page") || "";
  const externalReferrer = document.referrer || "";
  sessionStorage.setItem("last_page", window.location.pathname + window.location.hash);

  // =====================================
  // BASE EVENT BUILDER (FLUSH-TIME EVALUATION)
  // =====================================
  function baseFields() {
    return {
      user_id: userId,
      session_id: sessionId,
      browser: deviceDetails.browser,
      os: deviceDetails.os,
      device_type: deviceDetails.device,
      viewport_width: window.innerWidth || document.documentElement.clientWidth || 0,
      viewport_height: window.innerHeight || document.documentElement.clientHeight || 0,
      ip: geoData.ip,
      country: geoData.country,
      region: geoData.region,
      city: geoData.city,
      external_referrer: externalReferrer
    };
  }

  // =====================================
  // QUEUEING ENGINE
  // =====================================
  function pushEvent(event) {
    console.log("TRACK EVENT:", event);
    
    // Capture push-time specific values
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localTime = new Date(now.getTime() - tzOffset);

    queue.push({
      timestamp: localTime.toISOString(),
      page_url: window.location.pathname + window.location.hash,
      current_page: window.location.pathname + window.location.hash,
      previous_page: previousPage,
      hash: window.location.hash || "",
      ...event
    });

    if (queue.length >= BATCH_SIZE) {
      flush(false);
    }
  }

  // =====================================
  // TRANSMISSION MODULE (BEACON + FETCH)
  // =====================================
  function flush(useBeacon = false) {
    if (queue.length === 0) {
      return;
    }

    // Merge latest base fields (including newly loaded geolocation data)
    const base = baseFields();
    const events = queue.map(evt => ({
      ...base,
      ...evt
    }));
    queue = [];

    const body = JSON.stringify({ events });

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain" });
      navigator.sendBeacon(API_URL, blob);
      return;
    }

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {});
  }

  // =====================================
  // CONVERSION FUNNEL ENGINE
  // =====================================
  const completedFunnelSteps = new Set(
    JSON.parse(sessionStorage.getItem("tracker_completed_funnel") || "[]")
  );

  function triggerFunnelStep(stepName, stepNumber, description) {
    if (completedFunnelSteps.has(stepName)) return;

    completedFunnelSteps.add(stepName);
    sessionStorage.setItem("tracker_completed_funnel", JSON.stringify([...completedFunnelSteps]));

    pushEvent({
      event_type: "funnel",
      funnel_step_name: stepName,
      funnel_step_number: stepNumber,
      funnel_description: description
    });
  }

  function checkFunnelSection(sectionId) {
    if (sectionId === "home") {
      triggerFunnelStep("funnel_step_1_land", 1, "User landed on the home page");
    } else if (sectionId === "projects") {
      triggerFunnelStep("funnel_step_2_scroll_projects", 2, "User explored the projects grid");
    } else if (sectionId === "contact") {
      triggerFunnelStep("funnel_step_3_scroll_contact", 3, "User reached the contact form area");
    }
  }

  document.addEventListener("submit", (e) => {
    if (e.target && e.target.id === "direct-message-form") {
      triggerFunnelStep("funnel_step_4_submit_message", 4, "User submitted a contact message");
      flush(false);
    }
  });

  // =====================================
  // NAVIGATION & SECTION VIEW TRACKER
  // =====================================
  let currentActiveSection = "";
  let sectionEnterTime = Date.now();

  function trackSectionView(sectionId) {
    if (currentActiveSection === sectionId) return;

    if (currentActiveSection) {
      const timeSpent = Math.round((Date.now() - sectionEnterTime) / 1000);
      pushEvent({
        event_type: "section_duration",
        section: currentActiveSection,
        duration_seconds: timeSpent
      });
    }

    currentActiveSection = sectionId;
    sectionEnterTime = Date.now();

    pushEvent({
      event_type: "section_view",
      section: sectionId
    });

    checkFunnelSection(sectionId);
  }

  function setupSectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          trackSectionView(entry.target.id);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll("section[id]").forEach(sec => {
      observer.observe(sec);
    });
  }

  // =====================================
  // PAGE INITIALIZATION VIEW
  // =====================================
  pushEvent({
    event_type: "pageview",
    previous_page: previousPage,
    current_page: window.location.pathname + window.location.hash
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setupSectionObserver();
    });
  } else {
    setupSectionObserver();
  }

  window.addEventListener("hashchange", () => {
    pushEvent({
      event_type: "hashchange",
      hash: window.location.hash
    });
  });

  // =====================================
  // CLICK LOGS + HEATMAP ENGINE
  // =====================================
  document.addEventListener("click", function (e) {
    const target = e.target.closest("button, a, input, select, textarea, [data-id]");
    if (!target) return;

    const pageWidth = document.documentElement.scrollWidth;
    const pageHeight = document.documentElement.scrollHeight;

    const anchor = target.closest("a");
    if (anchor && anchor.href) {
      const url = anchor.href;
      try {
        const targetUrl = new URL(url, window.location.href);
        if (targetUrl.host !== window.location.host && url.startsWith("http")) {
          return;
        }
      } catch (err) {}
    }

    pushEvent({
      event_type: "click",
      element_tag: target.tagName.toLowerCase(),
      element_id: target.getAttribute("data-id") || target.id || "",
      element_text: (target.innerText || target.value || "").trim().slice(0, 80),
      x_pos: e.pageX,
      y_pos: e.pageY,
      x_percent: pageWidth ? Number(((e.pageX / pageWidth) * 100).toFixed(2)) : 0,
      y_percent: pageHeight ? Number(((e.pageY / pageHeight) * 100).toFixed(2)) : 0
    });

    flush(false);
  });

  // =====================================
  // SCROLL DEPTH ENGINE
  // =====================================
  const trackedDepths = new Set();
  window.addEventListener("scroll", () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const scrollPercent = Math.round((window.scrollY / docHeight) * 100);

    [25, 50, 75, 90].forEach(level => {
      if (scrollPercent >= level && !trackedDepths.has(level)) {
        trackedDepths.add(level);
        pushEvent({
          event_type: "scroll_depth",
          scroll_depth: level
        });
      }
    });
  }, { passive: true });

  // =====================================
  // EXIT WAY TRACKING
  // =====================================
  let isExiting = false;

  function trackExitEvent(exitType, targetUrl = "") {
    if (isExiting) return;
    isExiting = true;
    
    if (currentActiveSection) {
      const timeSpent = Math.round((Date.now() - sectionEnterTime) / 1000);
      pushEvent({
        event_type: "section_duration",
        section: currentActiveSection,
        duration_seconds: timeSpent
      });
    }

    pushEvent({
      event_type: "exit",
      element_id: exitType,
      element_text: targetUrl || window.location.pathname + window.location.hash
    });
    flush(true);
  }

  document.addEventListener("click", function (e) {
    const anchor = e.target.closest("a");
    if (anchor && anchor.href) {
      const url = anchor.href;
      try {
        const targetUrl = new URL(url, window.location.href);
        if (targetUrl.host !== window.location.host && url.startsWith("http")) {
          trackExitEvent("external_link", url);
        }
      } catch (err) {}
    }
  });

  window.addEventListener("beforeunload", () => {
    trackExitEvent("unload");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      trackExitEvent("unload");
    }
  });

  // =====================================
  // AUTO FLUSH TIMER
  // =====================================
  setInterval(() => flush(false), FLUSH_INTERVAL_MS);

  window.trackerFlush = () => flush(false);
})();
