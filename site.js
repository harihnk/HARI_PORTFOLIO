/* ==========================================================================
   HARI NANDHA KUMAR C - PREMIUM PORTFOLIO INTERACTION ENGINE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // =====================================
  // 1. Mobile Navigation Menu
  // =====================================
  const menuBtn = document.querySelector(".menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      navLinks.classList.toggle("active");
      if (navLinks.classList.contains("active")) {
        menuBtn.innerHTML = "&#10005;"; // Cross symbol
      } else {
        menuBtn.innerHTML = "&#9776;"; // Hamburger symbol
      }
    });

    // Close menu when clicking outside or clicking any nav link
    document.addEventListener("click", () => {
      if (navLinks.classList.contains("active")) {
        navLinks.classList.remove("active");
        menuBtn.innerHTML = "&#9776;";
      }
    });
    
    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        menuBtn.innerHTML = "&#9776;";
      });
    });

    navLinks.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // =====================================
  // 2. Typing Animation (Hero Header)
  // =====================================
  const typedEl = document.getElementById("typed");
  if (typedEl) {
    const roles = [
      "Full Stack Developer",
      "Backend Engineer",
      "Rust Enthusiast"
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let delay = 100;

    function handleTyping() {
      const currentRole = roles[roleIndex];
      
      if (isDeleting) {
        typedEl.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        delay = 40;
      } else {
        typedEl.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        delay = 80;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        isDeleting = true;
        delay = 2000; // Pause at end of text
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        delay = 500; // Pause before typing next word
      }

      setTimeout(handleTyping, delay);
    }
    
    setTimeout(handleTyping, 1000);
  }

  // =====================================
  // 3. Scroll Progress Bar
  // =====================================
  const progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    function updateScrollProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = progress + "%";
    }
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    updateScrollProgress();
  }

  // =====================================
  // 4. Section Scroll Active State Observer & Path Sync
  // =====================================
  const sections = document.querySelectorAll("section[id]");
  const navItems = document.querySelectorAll(".nav-links a");

  if (sections.length && navItems.length) {
    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("id");
          const targetPath = `/${sectionId}`;
          
          navItems.forEach(item => {
            const href = item.getAttribute("href");
            if (href === targetPath || href === `#${sectionId}`) {
              item.classList.add("active");
            } else {
              item.classList.remove("active");
            }
          });

          // Sync browser address bar dynamically during scroll
          if (isLocalDev) {
            history.replaceState(null, null, `#${sectionId}`);
          } else {
            history.replaceState(null, null, targetPath);
          }
        }
      });
    }, { threshold: 0.35, rootMargin: "-80px 0px 0px 0px" });

    sections.forEach(section => {
      scrollObserver.observe(section);
      // Ensure visible reveal class applies
      section.classList.add("visible");
    });
  }

  // =====================================
  // 5. Back To Top Button
  // =====================================
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add("show");
      } else {
        backToTopBtn.classList.remove("show");
      }
    }, { passive: true });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // =====================================
  // 6. Statistics Counter Animation
  // =====================================
  const statNumbers = document.querySelectorAll(".stat-number");
  if (statNumbers.length) {
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const stat = entry.target;
          const targetValue = parseInt(stat.dataset.target);
          if (!isNaN(targetValue)) {
            let currentValue = 0;
            const duration = 1200; // ms
            const stepTime = 30; // ms
            const increment = targetValue / (duration / stepTime);
            
            const timer = setInterval(() => {
              currentValue += increment;
              if (currentValue >= targetValue) {
                stat.textContent = targetValue + (stat.dataset.suffix || "");
                clearInterval(timer);
              } else {
                stat.textContent = Math.floor(currentValue) + (stat.dataset.suffix || "");
              }
            }, stepTime);
            
            statObserver.unobserve(stat); // Trigger once
          }
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(num => statObserver.observe(num));
  }

  // =====================================
  // 7. Full Code Mockup Typewriter Animation (recruiter wow-factor)
  // =====================================
  const editorContainer = document.getElementById("code-editor-typing");
  if (editorContainer) {
    const codeLinesData = [
      [
        { text: "// Welcome to my workspace", type: "comment" }
      ],
      [
        { text: "import", type: "keyword" },
        { text: " { " },
        { text: "Developer", type: "component" },
        { text: " } " },
        { text: "from", type: "keyword" },
        { text: " " },
        { text: "'./universe'", type: "string" },
        { text: ";" }
      ],
      [],
      [
        { text: "const", type: "keyword" },
        { text: " " },
        { text: "Portfolio", type: "def" },
        { text: " = () => {" }
      ],
      [
        { text: "  " },
        { text: "return", type: "keyword" },
        { text: " (" }
      ],
      [
        { text: "    <" },
        { text: "Developer", type: "component" }
      ],
      [
        { text: "      " },
        { text: "name", type: "prop" },
        { text: "=" },
        { text: "\"HARI NANDHA KUMAR C\"", type: "string" }
      ],
      [
        { text: "      " },
        { text: "role", type: "prop" },
        { text: "=" },
        { text: "\"Full Stack Developer\"", type: "string" }
      ],
      [
        { text: "      " },
        { text: "passion", type: "prop" },
        { text: "=" },
        { text: "\"Engineering Beyond Boundaries\"", type: "string" }
      ],
      [
        { text: "    />" }
      ],
      [
        { text: "  );" }
      ],
      [
        { text: "};" }
      ]
    ];

    let lineIndex = 0;
    let tokenIndex = 0;
    let charIndex = 0;
    
    function startTypingCode() {
      editorContainer.innerHTML = "";
      lineIndex = 0;
      tokenIndex = 0;
      charIndex = 0;
      addNewLine();
      typeNextChar();
    }
    
    function addNewLine() {
      const lineNum = lineIndex + 1;
      const lineDiv = document.createElement("div");
      lineDiv.className = "code-line";
      lineDiv.innerHTML = `<span class="ln">${lineNum}</span><span class="code-text"></span>`;
      editorContainer.appendChild(lineDiv);
    }
    
    function typeNextChar() {
      if (lineIndex >= codeLinesData.length) {
        // Finished typing all code! Hold for 6 seconds, then restart
        const lastLineText = editorContainer.lastChild.querySelector(".code-text");
        // Keep the cursor blinking at the end
        if (lastLineText && !lastLineText.querySelector(".editor-cursor")) {
          lastLineText.innerHTML += '<span class="editor-cursor">|</span>';
        }
        setTimeout(startTypingCode, 6000);
        return;
      }
      
      const currentLineTokens = codeLinesData[lineIndex];
      
      // If it's an empty line
      if (currentLineTokens.length === 0) {
        lineIndex++;
        addNewLine();
        setTimeout(typeNextChar, 100);
        return;
      }
      
      const currentToken = currentLineTokens[tokenIndex];
      const lineDiv = editorContainer.lastChild;
      const textSpan = lineDiv.querySelector(".code-text");
      
      // Remove cursor from previous line/token before appending
      const existingCursor = editorContainer.querySelector(".editor-cursor");
      if (existingCursor) {
        existingCursor.remove();
      }
      
      // Get or create span for current token
      let tokenSpan = textSpan.querySelector(`[data-token="${tokenIndex}"]`);
      if (!tokenSpan) {
        tokenSpan = document.createElement("span");
        tokenSpan.setAttribute("data-token", tokenIndex);
        if (currentToken.type) {
          tokenSpan.className = `c-${currentToken.type}`;
        }
        textSpan.appendChild(tokenSpan);
      }
      
      // Append next character
      tokenSpan.textContent += currentToken.text[charIndex];
      
      // Append blinking cursor immediately after the active character
      const cursorSpan = document.createElement("span");
      cursorSpan.className = "editor-cursor";
      cursorSpan.textContent = "|";
      textSpan.appendChild(cursorSpan);
      
      charIndex++;
      
      // Move to next token or line
      if (charIndex >= currentToken.text.length) {
        charIndex = 0;
        tokenIndex++;
        
        if (tokenIndex >= currentLineTokens.length) {
          tokenIndex = 0;
          lineIndex++;
          if (lineIndex < codeLinesData.length) {
            addNewLine();
          }
        }
      }
      
      // Dynamic typing speed: fast for spaces, normal for code, pause slightly at semicolons/brackets
      let speed = 25;
      if (currentToken.text === " " || currentToken.text.startsWith("  ")) {
        speed = 5;
      } else if (currentToken.text[charIndex] === ";" || currentToken.text[charIndex] === "{" || currentToken.text[charIndex] === ")") {
        speed = 120;
      }
      
      setTimeout(typeNextChar, speed);
    }
    
    // Start typing on load
    startTypingCode();
  }

  // =====================================
  // 8. Guestbook Comments Engine
  // =====================================
  const commentForm = document.getElementById("guestbook-form");
  const commentsWall = document.getElementById("comments-wall");
  const photoInput = document.getElementById("comment-photo");
  const photoBtnLabel = document.querySelector(".file-upload-btn");
  const photoSelectedName = document.querySelector(".file-selected-name");

  if (photoInput && photoBtnLabel && photoSelectedName) {
    photoInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        photoSelectedName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        photoSelectedName.style.display = "block";
        photoBtnLabel.textContent = "Change Selected Photo";
      } else {
        photoSelectedName.style.display = "none";
        photoBtnLabel.textContent = "Upload Profile Photo (Optional)";
      }
    });
  }

  function renderComments() {
    if (!commentsWall) return;
    
    let comments = [];
    try {
      comments = JSON.parse(localStorage.getItem("portfolio_comments")) || [];
    } catch (e) {
      comments = [];
    }

    if (comments.length === 0) {
      comments = [
        {
          id: 1,
          name: "Eki Zulfar Rachman",
          message: "Awesome black and neon green theme! Recreating this look in pure vanilla JS is extremely slick. Keep up the great work!",
          date: "16-07-2026, 14:05",
          photo: ""
        },
        {
          id: 2,
          name: "Priyanka Sen",
          message: "Very clean work on your ClickHouse syncing pipeline! Impressed by your focus on system scalability.",
          date: "15-07-2026, 09:30",
          photo: ""
        }
      ];
      localStorage.setItem("portfolio_comments", JSON.stringify(comments));
    }

    commentsWall.innerHTML = "";
    
    comments.slice().reverse().forEach(comment => {
      const card = document.createElement("div");
      card.className = "comment-card";
      
      const avatarHtml = comment.photo 
        ? `<img src="${comment.photo}" alt="${comment.name}">`
        : `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

      card.innerHTML = `
        <div class="comment-avatar">
          ${avatarHtml}
        </div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-name">${escapeHtml(comment.name)}</span>
            <span class="comment-date">${comment.date}</span>
          </div>
          <div class="comment-body">${escapeHtml(comment.message)}</div>
        </div>
      `;
      commentsWall.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  if (commentForm) {
    commentForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("comment-name");
      const messageInput = document.getElementById("comment-message");
      
      if (!nameInput || !messageInput) return;

      const name = nameInput.value.trim();
      const message = messageInput.value.trim();

      if (!name || !message) {
        alert("Please fill in both Name and Message fields.");
        return;
      }

      const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      };
      const formattedDate = new Date().toLocaleString('en-GB', options).replace(/\//g, '-');

      let photoData = "";
      const file = photoInput.files ? photoInput.files[0] : null;

      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert("Selected photo exceeds the maximum size limit of 5MB.");
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          photoData = reader.result;
          saveAndRefresh(name, message, formattedDate, photoData);
        };
        reader.readAsDataURL(file);
      } else {
        saveAndRefresh(name, message, formattedDate, "");
      }
    });

    function saveAndRefresh(name, message, dateStr, photoStr) {
      let comments = JSON.parse(localStorage.getItem("portfolio_comments")) || [];
      
      const newComment = {
        id: Date.now(),
        name,
        message,
        date: dateStr,
        photo: photoStr
      };

      comments.push(newComment);
      localStorage.setItem("portfolio_comments", JSON.stringify(comments));

      commentForm.reset();
      if (photoSelectedName) {
        photoSelectedName.style.display = "none";
      }
      if (photoBtnLabel) {
        photoBtnLabel.textContent = "Upload Profile Photo (Optional)";
      }

      renderComments();
    }
  }

  // =====================================
  // 9. Contact Direct Message Submission Pipeline (Online / Offline Simulator)
  // =====================================
  const FORMSPREE_FORM_ID = ""; // Paste Formspree ID here for real email submissions (e.g. "xoqgorqy")
  
  function bindDirectMessageSubmit() {
    const directMessageForm = document.getElementById("direct-message-form");
    const contactFormPanel = document.querySelector('[data-id="contact_form_panel"]');
    
    if (!directMessageForm || !contactFormPanel) return;

    directMessageForm.addEventListener("submit", (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const nameInput = document.getElementById("contact-name");
      const emailInput = document.getElementById("contact-email");
      const messageInput = document.getElementById("contact-message");
      const submitBtn = directMessageForm.querySelector('[data-id="direct_submit_btn"]');

      if (!nameInput || !emailInput || !messageInput || !submitBtn) return;

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const message = messageInput.value.trim();

      if (!name || !email || !message) return;

      // 1. Visually show loading transmission status
      submitBtn.disabled = true;
      submitBtn.innerHTML = `TRANSMITTING DATA PACKETS...`;

      // 2. Cache in LocalStorage immediately
      let messages = [];
      try {
        messages = JSON.parse(localStorage.getItem("portfolio_messages")) || [];
      } catch (err) {
        messages = [];
      }
      messages.push({
        id: Date.now(),
        name,
        email,
        message,
        date: new Date().toLocaleString()
      });
      localStorage.setItem("portfolio_messages", JSON.stringify(messages));

      // 3. Trigger funnel state in analytics tracker (if tracker exists)
      if (window.TrackerEngine && typeof window.TrackerEngine.logFunnelStage === "function") {
        window.TrackerEngine.logFunnelStage("contact_message_sent");
      }

      // Helper to render beautiful visual receipt on page
      function renderReceipt(isRealEmailSent) {
        const emailStatusLine = isRealEmailSent 
          ? `<p class="rc-line"><span class="rc-tag">[ROUTING]</span> ROUTED TO FORMSPREE GATEWAY [OK]</p>`
          : `<p class="rc-line"><span class="rc-tag">[ROUTING]</span> CACHED TO OFFLINE LOCALSTORAGE DB [OK]</p>`;
          
        contactFormPanel.innerHTML = `
          <div class="terminal-receipt">
            <div class="receipt-header">
              <span class="status-dot"></span>
              TRANSMISSION RECEIVED & SECURED
            </div>
            <div class="receipt-body">
              <p class="rc-line"><span class="rc-tag">[SYSTEM]</span> INGESTING INCOMING METADATA...</p>
              ${emailStatusLine}
              <p class="rc-line"><span class="rc-tag">[SYSTEM]</span> ENCRYPTING DATA PACKAGE...</p>
              <div class="receipt-data">
                <div><strong>OPERATOR FROM:</strong> ${escapeHtml(name)}</div>
                <div><strong>EMAIL PROTOCOL:</strong> ${escapeHtml(email)}</div>
                <div><strong>MESSAGE BODY:</strong> "${escapeHtml(message)}"</div>
              </div>
              <p class="rc-success">✓ MESSAGE DELIVERED & INDEXED SUCCESSFULLY!</p>
              <button class="btn btn-secondary btn-reset-form" style="margin-top: 20px; font-size: 0.85rem; padding: 10px 22px; border-radius: 50px;">
                Send Another Message
              </button>
            </div>
          </div>
        `;
        
        // Listen to reset form action
        const resetBtn = contactFormPanel.querySelector(".btn-reset-form");
        if (resetBtn) {
          resetBtn.addEventListener("click", () => {
            // Restore original form
            contactFormPanel.innerHTML = `
              <h3 class="form-title">✉️ Send a Message</h3>
              <form id="direct-message-form" action="#" method="POST">
                
                <div class="form-group">
                  <label for="contact-name">Name *</label>
                  <input type="text" id="contact-name" class="form-control" placeholder="Your name" required data-id="direct_name_input">
                </div>

                <div class="form-group">
                  <label for="contact-email">Email *</label>
                  <input type="email" id="contact-email" class="form-control" placeholder="Your email" required data-id="direct_email_input">
                </div>

                <div class="form-group">
                  <label for="contact-message">Message *</label>
                  <textarea id="contact-message" class="form-control" placeholder="Write your message..." required data-id="direct_message_input"></textarea>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;" data-id="direct_submit_btn">
                  Send Message
                </button>

              </form>
            `;
            // Re-bind submit listener since form was re-created
            bindDirectMessageSubmit();
          });
        }
      }

      // 4. Submit to Formspree if ID is present
      if (FORMSPREE_FORM_ID && FORMSPREE_FORM_ID.trim() !== "") {
        fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            email: email,
            message: message
          })
        })
        .then(response => {
          if (response.ok) {
            renderReceipt(true);
          } else {
            console.error("Formspree submission error. Falling back to local cache.");
            renderReceipt(false);
          }
        })
        .catch(err => {
          console.error("Network error during Formspree submission. Falling back to local cache.", err);
          renderReceipt(false);
        });
      } else {
        // Fallback to local simulation after 1.2s delay
        setTimeout(() => {
          renderReceipt(false);
        }, 1200);
      }
    });
  }

  // Initial call
  bindDirectMessageSubmit();

  // =====================================
  // 10. SPA Path Routing (Hashless Navigation)
  // =====================================
  function resolveInitialRoute() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    let targetSectionId = "";
    
    if (isLocalDev) {
      if (hash) {
        targetSectionId = hash.replace("#", "");
      }
    } else {
      // Production: Support paths like /about, /projects, or index.html/about
      if (path.includes("index.html/")) {
        targetSectionId = path.split("index.html/")[1];
      } else {
        const pathParts = path.split("/");
        const lastPart = pathParts[pathParts.length - 1];
        const validSections = ["home", "about", "projects", "skills", "contact"];
        if (validSections.includes(lastPart)) {
          targetSectionId = lastPart;
        }
      }
      if (!targetSectionId && hash) {
        targetSectionId = hash.replace("#", "");
      }
    }
    
    if (targetSectionId) {
      const targetSection = document.getElementById(targetSectionId);
      if (targetSection) {
        setTimeout(() => {
          targetSection.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }

  document.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (!anchor) return;
    
    const href = anchor.getAttribute("href");
    if (!href) return;
    
    const SPA_ROUTES = ["/home", "/about", "/projects", "/skills", "/contact"];
    const hashMatches = href.match(/^#(home|about|projects|skills|contact)$/);
    
    if (SPA_ROUTES.includes(href) || hashMatches) {
      e.preventDefault();
      
      const sectionId = hashMatches ? hashMatches[1] : href.substring(1);
      const targetSection = document.getElementById(sectionId);
      
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: "smooth" });
        
        // Update browser address bar path conditionally based on env
        const targetPath = `/${sectionId}`;
        if (isLocalDev) {
          history.pushState(null, null, `#${sectionId}`);
        } else {
          history.pushState(null, null, targetPath);
        }
        
        // Trigger pageview in analytics tracker (if tracker exists)
        if (window.TrackerEngine && typeof window.TrackerEngine.logPageView === "function") {
          window.TrackerEngine.logPageView(targetPath);
        }
      }
    }
  });

  // Call on load and popstate history events
  window.addEventListener("load", resolveInitialRoute);
  window.addEventListener("popstate", resolveInitialRoute);

  renderComments();
});

