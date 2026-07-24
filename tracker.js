/**
 * Tracker.js - Final Production Version
 * Backend: Rust (Axum) + ClickHouse
 * Events: pageview, click, mouse_move, scroll_depth, hashchange, section_view, section_duration, funnel, exit
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = Object.assign({
        API_ENDPOINT: 'http://localhost:3003/events',
        HEATMAP_INTERVAL: 50,
        FLUSH_INTERVAL: 5000,
        BATCH_SIZE: 20,
        SESSION_TIMEOUT: 30 * 60 * 1000,
        STORAGE_PREFIX: 'tracker_',
        MAXMIND_ACCOUNT_ID: '',
        MAXMIND_LICENSE_KEY: '',
        MAXMIND_API_URL: 'https://geolite.info/geoip/v2.1/city/me',
        TRACK_SECTIONS: true,
        TRACK_FUNNEL: true,
        TRACK_EXIT: true,
        DEBUG: false
    }, window.TRACKER_CONFIG || {});

    // ============================================
    // STATE
    // ============================================
    const state = {
        sessionId: null,
        userId: null,
        seq: 0,
        startTime: Date.now(),
        batch: [],
        isTracking: false,
        geoData: { country: '', region: '', city: '', timezone: '' },
        deviceInfo: {},
        currentPage: window.location.pathname,
        currentHash: window.location.hash,
        sectionsViewed: new Set(),
        sectionTimers: {},
        funnelSteps: [],
        clickCounts: {},
        maxScrollDepth: 0,
        lastActivity: Date.now(),
        exitTracked: false
    };

    const log = (...args) => CONFIG.DEBUG && console.log('[Tracker]', ...args);

    // ============================================
    // UTILITIES
    // ============================================
    const Utils = {
        generateId: (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
        
        getStorage: (key) => {
            try { return JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_PREFIX + key)); } 
            catch (e) { return null; }
        },
        
        setStorage: (key, value) => {
            try { sessionStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value)); } 
            catch (e) {}
        },

        throttle: (func, limit) => {
            let inThrottle, lastArgs;
            return function(...args) {
                lastArgs = args;
                if (!inThrottle) {
                    func.apply(this, lastArgs);
                    inThrottle = true;
                    setTimeout(() => { inThrottle = false; if (lastArgs !== args) func.apply(this, lastArgs); }, limit);
                }
            };
        },

        debounce: (func, wait) => {
            let timeout;
            return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
        },

        getViewport: () => ({
            width: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight
        }),

        base64Encode: (str) => {
            try { return btoa(str); } 
            catch (e) { return btoa(unescape(encodeURIComponent(str))); }
        },

        now: () => new Date().toISOString(),

        getScrollDepth: () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = Math.max(
                document.body.scrollHeight, document.body.offsetHeight,
                document.documentElement.scrollHeight, document.documentElement.offsetHeight
            );
            const winHeight = window.innerHeight;
            return docHeight <= winHeight ? 100 : Math.round((scrollTop / (docHeight - winHeight)) * 100);
        }
    };

    // ============================================
    // SESSION MANAGEMENT
    // ============================================
    const Session = {
        init: () => {
            let session = Utils.getStorage('session');
            const now = Date.now();

            if (!session || (now - session.lastActivity > CONFIG.SESSION_TIMEOUT)) {
                session = {
                    id: Utils.generateId('s'),
                    userId: Utils.generateId('u'),
                    startTime: now,
                    lastActivity: now
                };
            } else {
                session.lastActivity = now;
            }

            Utils.setStorage('session', session);
            state.sessionId = session.id;
            state.userId = session.userId;

            const update = Utils.throttle(() => {
                session.lastActivity = Date.now();
                Utils.setStorage('session', session);
                state.lastActivity = Date.now();
            }, 1000);

            ['click', 'scroll', 'mousemove', 'keypress', 'touchstart', 'keydown'].forEach(e => {
                document.addEventListener(e, update, { passive: true });
            });
        }
    };

    // ============================================
    // DEVICE & BROWSER DETECTION
    // ============================================
    const Device = {
        getOS: () => {
            const ua = navigator.userAgent;
            const platform = navigator.platform;
            if (/Windows NT 10.0/i.test(ua)) return 'Windows 10';
            if (/Windows NT 6.3/i.test(ua)) return 'Windows 8.1';
            if (/Windows NT 6.2/i.test(ua)) return 'Windows 8';
            if (/Windows NT 6.1/i.test(ua)) return 'Windows 7';
            if (/macOS|Mac OS X (\d+)[._](\d+)/i.test(ua)) {
                const m = ua.match(/Mac OS X (\d+)[._](\d+)/);
                const v = { 15: 'Sequoia', 14: 'Sonoma', 13: 'Ventura', 12: 'Monterey', 11: 'Big Sur' };
                return m ? `macOS ${v[m[1]] || m[1] + '.' + m[2]}` : 'macOS';
            }
            if (/Android (\d+\.?\d*)/i.test(ua)) {
                const m = ua.match(/Android (\d+\.?\d*)/);
                return m ? `Android ${m[1]}` : 'Android';
            }
            if (/OS (\d+)[._](\d+)/i.test(ua) && /iPhone|iPad|iPod/.test(ua)) {
                const m = ua.match(/OS (\d+)[._](\d+)/);
                return m ? `iOS ${m[1]}.${m[2]}` : 'iOS';
            }
            if (/Linux/i.test(platform)) return 'Linux';
            return 'Unknown';
        },

        getBrowser: () => {
            const ua = navigator.userAgent;
            const vendor = navigator.vendor || '';
            if (/Edg\/(\d+\.?\d*)/i.test(ua)) { const m = ua.match(/Edg\/(\d+\.?\d*)/); return { name: 'Edge', version: m ? m[1] : '' }; }
            if (/OPR\/(\d+\.?\d*)/i.test(ua)) { const m = ua.match(/OPR\/(\d+\.?\d*)/); return { name: 'Opera', version: m ? m[1] : '' }; }
            if (/Chrome\/(\d+\.?\d*)/i.test(ua) && /Google Inc/.test(vendor)) { const m = ua.match(/Chrome\/(\d+\.?\d*)/); return { name: 'Chrome', version: m ? m[1] : '' }; }
            if (/Safari/i.test(ua) && /Apple Computer/.test(vendor) && !/Chrome/.test(ua)) { const m = ua.match(/Version\/(\d+\.?\d*)/); return { name: 'Safari', version: m ? m[1] : '' }; }
            if (/Firefox\/(\d+\.?\d*)/i.test(ua)) { const m = ua.match(/Firefox\/(\d+\.?\d*)/); return { name: 'Firefox', version: m ? m[1] : '' }; }
            if (/Brave/i.test(ua)) return { name: 'Brave', version: '' };
            if (/Trident|MSIE/i.test(ua)) { const m = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/); return { name: 'Internet Explorer', version: m ? m[1] : '' }; }
            return { name: 'Unknown', version: '' };
        },

        getDeviceType: () => {
            const ua = navigator.userAgent;
            const maxTouch = navigator.maxTouchPoints || 0;
            if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'Tablet';
            if (/Mobi|Android.*Mobile|iPhone|iPod|Windows Phone/i.test(ua)) return 'Mobile';
            if (maxTouch > 0 && /Macintosh/.test(ua)) return 'Tablet';
            return 'Desktop';
        },

        getAll: () => {
            const browser = Device.getBrowser();
            return {
                browser: browser.name,
                os: Device.getOS(),
                device_type: Device.getDeviceType(),
                viewport_width: window.innerWidth || 0,
                viewport_height: window.innerHeight || 0
            };
        }
    };

    // ============================================
    // GEOLOCATION (Browser GPS + Nominatim + IP Fallbacks)
    // ============================================
    const Geo = {
        // Try HTML5 Browser Geolocation first (exact GPS coordinates)
        fetchBrowserGeo: () => {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    log('Geolocation API not available');
                    return resolve(false);
                }
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;
                            log('GPS coords:', lat, lon);
                            const res = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
                                { headers: { 'Accept-Language': 'en' } }
                            );
                            const data = await res.json();
                            const addr = data.address || {};
                            state.geoData = {
                                country: addr.country || '',
                                region: addr.state || addr.state_district || '',
                                city: addr.city || addr.town || addr.village || addr.suburb || '',
                                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
                            };
                            log('Browser GPS geo:', state.geoData);
                            resolve(true);
                        } catch (err) {
                            log('Nominatim reverse geocode failed:', err.message);
                            resolve(false);
                        }
                    },
                    (err) => {
                        log('Browser geolocation denied/failed:', err.message);
                        resolve(false);
                    },
                    { timeout: 8000, enableHighAccuracy: true }
                );
            });
        },

        // IP-based fallback
        fetchIPGeo: async () => {
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
                state.geoData = {
                    country: data.country_name || '',
                    region: data.region || '',
                    city: data.city || '',
                    timezone: data.timezone || ''
                };
                log('IPAPI geo:', state.geoData);
            } catch (e) {
                try {
                    const res = await fetch('https://ipinfo.io/json');
                    const data = await res.json();
                    state.geoData = {
                        country: data.country || '',
                        region: data.region || '',
                        city: data.city || '',
                        timezone: data.timezone || ''
                    };
                    log('IPInfo geo:', state.geoData);
                } catch (e2) {
                    log('All geo lookups failed');
                    state.geoData = { country: '', region: '', city: '', timezone: '' };
                }
            }
        },

        init: async () => {
            // Check session cache — only use if it was from GPS (has gps_source flag)
            const cached = Utils.getStorage('geo');
            if (cached && cached.gps_source && cached.country && cached.city) {
                state.geoData = cached;
                log('Cached GPS geo:', state.geoData);
                return;
            }

            // Always try browser GPS first for exact device location
            const gotGPS = await Geo.fetchBrowserGeo();
            if (gotGPS && state.geoData.city) {
                // Mark as GPS-sourced so we cache it
                state.geoData.gps_source = true;
                Utils.setStorage('geo', state.geoData);
                log('GPS location resolved and cached:', state.geoData);
                return;
            }

            // Fallback to IP-based (less accurate — gives ISP location, not device location)
            await Geo.fetchIPGeo();
            // Do NOT cache IP-based results — re-attempt GPS on next page load
            log('IP fallback location (not cached):', state.geoData);
        }
    };

    // ============================================
    // EVENT BUILDER — matches Rust IncomingEvent exactly
    // ============================================
    const EventBuilder = {
        base: (eventType) => {
            state.seq++;
            const viewport = Utils.getViewport();
            return {
                user_id: state.userId,
                session_id: state.sessionId,
                event_type: eventType,
                seq: state.seq,
                page_url: window.location.href,
                timestamp: Utils.now(),
                browser: state.deviceInfo.browser || '',
                os: state.deviceInfo.os || '',
                device_type: state.deviceInfo.device_type || '',
                viewport_width: viewport.width,
                viewport_height: viewport.height,
                ip: '',
                country: state.geoData.country,
                region: state.geoData.region,
                city: state.geoData.city
            };
        },

        pageview: (previousPage, currentPage) => ({
            ...EventBuilder.base('pageview'),
            previous_page: previousPage || '',
            current_page: currentPage || window.location.pathname,
            external_referrer: document.referrer || ''
        }),

        hashchange: (hash) => ({
            ...EventBuilder.base('hashchange'),
            hash: hash || window.location.hash
        }),

        sectionView: (section) => ({
            ...EventBuilder.base('section_view'),
            section: section,
            duration_seconds: 0
        }),

        sectionDuration: (section, duration) => ({
            ...EventBuilder.base('section_duration'),
            section: section,
            duration_seconds: Math.round(duration)
        }),

        funnel: (stepName, stepNumber, description) => ({
            ...EventBuilder.base('funnel'),
            funnel_step_name: stepName,
            funnel_step_number: stepNumber,
            funnel_description: description || ''
        }),

        click: (x, y, element) => {
            const viewport = Utils.getViewport();
            const key = `${element?.tagName || 'unknown'}|${element?.id || ''}|${element?.className || ''}`;
            state.clickCounts[key] = (state.clickCounts[key] || 0) + 1;
            
            const xPct = viewport.width > 0 ? parseFloat(((x / viewport.width) * 100).toFixed(2)) : 0;
            const yPct = viewport.height > 0 ? parseFloat(((y / viewport.height) * 100).toFixed(2)) : 0;
            
            return {
                ...EventBuilder.base('click'),
                element_tag: element?.tagName || '',
                element_id: element?.id || '',
                element_text: (element?.innerText || element?.textContent || '').substring(0, 100),
                click_count: state.clickCounts[key],
                x_pos: Math.round(x),
                y_pos: Math.round(y),
                x_percent: xPct,
                y_percent: yPct,
                scroll_depth: state.maxScrollDepth
            };
        },

        mouseMove: (x, y) => {
            const viewport = Utils.getViewport();
            return {
                ...EventBuilder.base('mouse_move'),
                x_pos: Math.round(x),
                y_pos: Math.round(y),
                x_percent: viewport.width > 0 ? parseFloat(((x / viewport.width) * 100).toFixed(2)) : 0,
                y_percent: viewport.height > 0 ? parseFloat(((y / viewport.height) * 100).toFixed(2)) : 0,
                scroll_depth: state.maxScrollDepth
            };
        },

        scrollDepth: (depth) => ({
            ...EventBuilder.base('scroll_depth'),
            scroll_depth: depth
        }),

        exit: (reason) => ({
            ...EventBuilder.base('exit'),
            previous_page: state.currentPage,
            current_page: window.location.pathname,
            external_referrer: document.referrer || '',
            scroll_depth: state.maxScrollDepth,
            duration_seconds: Math.round((Date.now() - state.startTime) / 1000),
            funnel_step_name: reason,
            funnel_step_number: 0,
            funnel_description: `User exited: ${reason}`
        })
    };

    // ============================================
    // BATCH & API
    // ============================================
    const API = {
        queue: (event) => {
            state.batch.push(event);
            if (state.batch.length >= CONFIG.BATCH_SIZE) API.flush();
        },

        flush: async () => {
            if (state.batch.length === 0) return;
            const events = state.batch.splice(0, CONFIG.BATCH_SIZE);
            
            try {
                const res = await fetch(CONFIG.API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events }),
                    keepalive: true
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                log('Flushed', events.length, 'events');
            } catch (err) {
                log('Flush failed, requeuing:', err.message);
                state.batch.unshift(...events);
                if (state.batch.length > 100) state.batch = state.batch.slice(-100);
            }
        },

        flushSync: () => {
            if (state.batch.length === 0) return;
            const events = state.batch.splice(0, CONFIG.BATCH_SIZE);
            const payload = JSON.stringify({ events });
            
            if (navigator.sendBeacon) {
                const sent = navigator.sendBeacon(CONFIG.API_ENDPOINT, new Blob([payload], { type: 'application/json' }));
                if (sent) { log('Beacon flushed', events.length); return; }
            }
            
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', CONFIG.API_ENDPOINT, false);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(payload);
                log('XHR sync flushed', events.length);
            } catch (e) {
                log('Sync flush failed');
            }
        },

        sendImmediate: (event) => {
            API.queue(event);
            API.flush();
        }
    };

    // ============================================
    // PAGE VIEW TRACKING
    // ============================================
    const PageTracker = {
        init: () => {
            // Initial pageview
            API.queue(EventBuilder.pageview('', window.location.pathname));

            // SPA navigation hooks
            const origPush = history.pushState;
            const origReplace = history.replaceState;

            history.pushState = function(...args) {
                const from = window.location.pathname;
                origPush.apply(this, args);
                const to = window.location.pathname;
                if (from !== to) {
                    API.queue(EventBuilder.pageview(from, to));
                    state.currentPage = to;
                }
            };

            history.replaceState = function(...args) {
                const from = window.location.pathname;
                origReplace.apply(this, args);
                const to = window.location.pathname;
                if (from !== to) {
                    API.queue(EventBuilder.pageview(from, to));
                    state.currentPage = to;
                }
            };

            window.addEventListener('popstate', () => {
                const from = state.currentPage;
                const to = window.location.pathname;
                if (from !== to) {
                    API.queue(EventBuilder.pageview(from, to));
                    state.currentPage = to;
                }
            });

            // Hash changes
            window.addEventListener('hashchange', () => {
                API.queue(EventBuilder.hashchange(window.location.hash));
            });
        }
    };

    // ============================================
    // CLICK TRACKING
    // ============================================
    const ClickTracker = {
        init: () => {
            document.addEventListener('click', (e) => {
                const event = EventBuilder.click(e.clientX, e.clientY, e.target);
                API.queue(event);

                // Funnel tracking via data-id
                const dataId = e.target.getAttribute('data-id') || e.target.closest('[data-id]')?.getAttribute('data-id');
                if (dataId && CONFIG.TRACK_FUNNEL) {
                    FunnelTracker.trackInteraction(dataId);
                }
            }, true);
        }
    };

    // ============================================
    // MOUSE / HEATMAP TRACKING
    // ============================================
    const MouseTracker = {
        init: () => {
            document.addEventListener('mousemove', Utils.throttle((e) => {
                API.queue(EventBuilder.mouseMove(e.clientX, e.clientY));
            }, CONFIG.HEATMAP_INTERVAL), { passive: true });
        }
    };

    // ============================================
    // SCROLL DEPTH TRACKING
    // ============================================
    const ScrollTracker = {
        init: () => {
            const update = Utils.throttle(() => {
                const depth = Utils.getScrollDepth();
                if (depth > state.maxScrollDepth) {
                    state.maxScrollDepth = depth;
                    API.queue(EventBuilder.scrollDepth(depth));
                }
            }, 500);
            
            window.addEventListener('scroll', update, { passive: true });
            window.addEventListener('resize', update, { passive: true });
        }
    };

    // ============================================
    // SECTION VIEW TRACKING
    // ============================================
    const SectionTracker = {
        init: () => {
            if (!CONFIG.TRACK_SECTIONS || !('IntersectionObserver' in window)) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const section = entry.target.getAttribute('data-section');
                    if (!section) return;

                    if (entry.isIntersecting) {
                        if (!state.sectionsViewed.has(section)) {
                            state.sectionsViewed.add(section);
                            API.queue(EventBuilder.sectionView(section));
                        }
                        state.sectionTimers[section] = Date.now();
                    } else {
                        const start = state.sectionTimers[section];
                        if (start) {
                            const duration = (Date.now() - start) / 1000;
                            if (duration >= 1) {
                                API.queue(EventBuilder.sectionDuration(section, duration));
                            }
                            delete state.sectionTimers[section];
                        }
                    }
                });
            }, { threshold: 0.3, rootMargin: '0px' });

            document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));
        }
    };

    // ============================================
    // FUNNEL TRACKING
    // ============================================
    const FunnelTracker = {
        trackedSteps: new Set(),

        trackInteraction: (stepName) => {
            if (FunnelTracker.trackedSteps.has(stepName)) return;
            FunnelTracker.trackedSteps.add(stepName);
            
            const stepNumber = state.funnelSteps.length + 1;
            state.funnelSteps.push({ name: stepName, time: Date.now() });
            
            API.queue(EventBuilder.funnel(stepName, stepNumber, `User interaction: ${stepName}`));
            log('Funnel:', stepNumber, stepName);
        },

        init: () => {
            if (!CONFIG.TRACK_FUNNEL || !('IntersectionObserver' in window)) return;

            const sections = [
                { selector: '[data-section="hero"]', name: 'view_hero' },
                { selector: '[data-section="about"]', name: 'view_about' },
                { selector: '[data-section="projects"]', name: 'view_projects' },
                { selector: '[data-section="skills"]', name: 'view_skills' },
                { selector: '[data-section="contact"]', name: 'view_contact' }
            ];

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const match = sections.find(s => entry.target.matches(s.selector));
                        if (match) FunnelTracker.trackInteraction(match.name);
                    }
                });
            }, { threshold: 0.2 });

            sections.forEach(s => {
                const el = document.querySelector(s.selector);
                if (el) observer.observe(el);
            });
        }
    };

    // ============================================
    // EXIT TRACKING
    // ============================================
    const ExitTracker = {
        track: (reason) => {
            if (state.exitTracked) return;
            state.exitTracked = true;
            
            // Flush section durations
            Object.keys(state.sectionTimers).forEach(section => {
                const start = state.sectionTimers[section];
                if (start) {
                    const duration = (Date.now() - start) / 1000;
                    if (duration >= 1) API.queue(EventBuilder.sectionDuration(section, duration));
                }
            });

            API.queue(EventBuilder.exit(reason));
            API.flushSync();
            log('Exit tracked:', reason);
        },

        init: () => {
            if (!CONFIG.TRACK_EXIT) return;

            // Modern browsers
            document.addEventListener('pagehide', (e) => {
                ExitTracker.track(e.persisted ? 'pagehide_bfcache' : 'pagehide');
            });

            // Before unload
            window.addEventListener('beforeunload', () => ExitTracker.track('beforeunload'));

            // Visibility change (tab switch, minimize)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    API.flush();
                }
            });

            // Legacy
            window.addEventListener('unload', () => ExitTracker.track('unload'));

            // Track when user goes back to home
            document.addEventListener('click', (e) => {
                const el = e.target.closest('a');
                if (el) {
                    const href = el.getAttribute('href') || '';
                    const dataId = el.getAttribute('data-id') || '';
                    if (href === '#home' || href === '/' || dataId.includes('home') || dataId.includes('logo')) {
                        ExitTracker.track('home_button');
                    }
                }
            });
        }
    };

    // ============================================
    // MAIN TRACKER
    // ============================================
    const Tracker = {
        init: async () => {
            if (state.isTracking) return;
            state.isTracking = true;

            Session.init();
            state.deviceInfo = Device.getAll();

            // AWAIT geo data before firing any events
            await Geo.init();

            PageTracker.init();
            ClickTracker.init();
            MouseTracker.init();
            ScrollTracker.init();
            SectionTracker.init();
            FunnelTracker.init();
            ExitTracker.init();

            // Periodic flush
            setInterval(() => API.flush(), CONFIG.FLUSH_INTERVAL);

            // Flush on page show (returning from bfcache)
            window.addEventListener('pageshow', (e) => {
                if (e.persisted) {
                    state.exitTracked = false;
                    API.queue(EventBuilder.pageview('bfcache', window.location.pathname));
                }
            });

            log('🎯 Tracker initialized. User:', state.userId, 'Session:', state.sessionId);
            log('📍 Location:', state.geoData);
            log('💻 Device:', state.deviceInfo);
        },

        // Public API for manual events
        track: (eventName, data = {}) => {
            const event = { ...EventBuilder.base(eventName), ...data };
            API.queue(event);
        },

        trackFunnel: (stepName, stepNumber, description) => {
            API.queue(EventBuilder.funnel(stepName, stepNumber, description));
        },

        getState: () => ({
            userId: state.userId,
            sessionId: state.sessionId,
            seq: state.seq,
            geo: state.geoData,
            device: state.deviceInfo,
            scrollDepth: state.maxScrollDepth,
            funnelSteps: state.funnelSteps
        }),

        flush: () => API.flush()
    };

    // ============================================
    // AUTO-INITIALIZE
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', Tracker.init);
    } else {
        Tracker.init();
    }

    // Expose globally
    window.Tracker = Tracker;

})();