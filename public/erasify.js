// Erasify common functionality (Auth session, modals, premium limits, mobile drawer, interactive UI)
document.addEventListener('DOMContentLoaded', () => {
  const signInModal = document.getElementById('signInModal');
  const signUpModal = document.getElementById('signUpModal');
  
  // Make sure modals have toggle switch links
  injectAuthSwitchLinks();

  window.openSignIn = () => {
    closeMobileMenu();
    if (signUpModal) signUpModal.classList.remove('active');
    if (signInModal) signInModal.classList.add('active');
  };

  window.openSignUp = () => {
    closeMobileMenu();
    if (signInModal) signInModal.classList.remove('active');
    if (signUpModal) signUpModal.classList.add('active');
  };

  window.closeAuthModals = () => {
    if (signInModal) signInModal.classList.remove('active');
    if (signUpModal) signUpModal.classList.remove('active');
  };

  // Userscript install guide modal
  window.openUserscriptModal = () => {
    const m = document.getElementById('userscriptModal');
    if (m) m.classList.add('active');
  };
  window.closeUserscriptModal = () => {
    const m = document.getElementById('userscriptModal');
    if (m) m.classList.remove('active');
  };

  // Close modals on clicking outside the card
  [signInModal, signUpModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeAuthModals();
        }
      });
    }
  });

  // Mobile Drawer Toggle
  setupMobileDrawer();

  // Bottom Navigation Active State
  setupBottomNav();

  // FAQ Accordion Setup
  setupFaqAccordion();

  // Showcase Tabs Setup
  setupShowcaseTabs();

  // Handle real API auth submission
  setupAuthFormHandlers();

  // Check login state
  checkUserSession();

  // Scroll Fade In animation logic
  const fadeElements = document.querySelectorAll('.glass-card, .pricing-card, .tool-teaser, .step-card, .benchmark-card, .catalog-card, .ecosystem-card, .usecase-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.08 });

  fadeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
});

// Mobile Drawer Controller
function setupMobileDrawer() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.querySelector('.mobile-drawer');
  const backdrop = document.querySelector('.mobile-backdrop');

  window.toggleMobileMenu = () => {
    if (!drawer) return;
    const isActive = drawer.classList.contains('active');
    if (isActive) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  };

  window.openMobileMenu = () => {
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    if (menuBtn) menuBtn.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeMobileMenu = () => {
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    if (menuBtn) menuBtn.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (menuBtn) {
    menuBtn.addEventListener('click', window.toggleMobileMenu);
  }
  if (backdrop) {
    backdrop.addEventListener('click', window.closeMobileMenu);
  }
}

// Bottom App Bar Active State
function setupBottomNav() {
  const currentPath = window.location.pathname.toLowerCase();
  const tabs = document.querySelectorAll('.bottom-tab');
  
  tabs.forEach(tab => {
    const href = (tab.getAttribute('href') || '').toLowerCase();
    if (
      (currentPath.endsWith('index.html') || currentPath === '/' || currentPath === '') && href.includes('index.html') ||
      currentPath.includes('image-remover') && href.includes('image-remover') ||
      currentPath.includes('video-remover') && href.includes('video-remover') ||
      currentPath.includes('pricing') && href.includes('pricing') ||
      currentPath.includes('profile') && href.includes('profile')
    ) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// Interactive FAQ Accordion
function setupFaqAccordion() {
  window.toggleFaq = (button) => {
    const item = button.closest('.faq-item');
    if (!item) return;
    const wasActive = item.classList.contains('active');
    
    // Close other open faq items in container
    const allFaqs = document.querySelectorAll('.faq-item');
    allFaqs.forEach(faq => faq.classList.remove('active'));

    if (!wasActive) {
      item.classList.add('active');
    }
  };
}

// Interactive Showcase Tabs on Homepage
function setupShowcaseTabs() {
  const showcaseTabs = document.querySelectorAll('.showcase-tab');
  if (!showcaseTabs.length) return;

  const showcaseData = {
    'gemini-flash': {
      model: 'Gemini 3.1 Flash',
      resolution: '2048 x 2048 (2K Preview)',
      anchor: '64px right / 64px bottom',
      speed: '115ms',
      quality: '99.9% Zero Loss',
      originalDesc: 'Gemini 3.1 Flash with 96x96 semitransparent watermark stamp',
      cleanedDesc: 'Inverse-alpha mathematical removal: exact background recovered'
    },
    'gemini-pro': {
      model: 'Gemini 3 Pro',
      resolution: '4096 x 4096 (4K Ultra-Res)',
      anchor: '64px right / 64px bottom (or 192px new margin)',
      speed: '180ms',
      quality: '100% Subpixel Restored',
      originalDesc: 'Gemini 3 Pro complex fine-detail art with semitransparent watermark',
      cleanedDesc: 'Deep FDnCNN neural denoising + subpixel edge anti-aliasing'
    },
    'veo-video': {
      model: 'Google Veo 2',
      resolution: '1920 x 1080 @ 60fps MP4',
      anchor: 'Bottom-Right Moving Anchor',
      speed: 'Hardware WebCodecs 30fps+',
      quality: 'Temporal Stabilized',
      originalDesc: 'Veo generated high-motion video frame with bottom watermark',
      cleanedDesc: 'Frame-by-frame canvas temporal de-blend and hardware decode'
    }
  };

  showcaseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showcaseTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const modelId = tab.getAttribute('data-model');
      const data = showcaseData[modelId];
      if (!data) return;

      const specResolution = document.getElementById('showcaseSpecResolution');
      const specAnchor = document.getElementById('showcaseSpecAnchor');
      const specSpeed = document.getElementById('showcaseSpecSpeed');
      const specQuality = document.getElementById('showcaseSpecQuality');
      const originalText = document.getElementById('showcaseOriginalText');
      const cleanedText = document.getElementById('showcaseCleanedText');

      if (specResolution) specResolution.textContent = data.resolution;
      if (specAnchor) specAnchor.textContent = data.anchor;
      if (specSpeed) specSpeed.textContent = data.speed;
      if (specQuality) specQuality.textContent = data.quality;
      if (originalText) originalText.textContent = data.originalDesc;
      if (cleanedText) cleanedText.textContent = data.cleanedDesc;
    });
  });
}

// Global user session state
window.currentUser = null;

async function checkUserSession() {
  try {
    const res = await fetch('/api/user/profile');
    if (res.ok) {
      window.currentUser = await res.json();
      updateHeaderForLoggedInUser();
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
}

function updateHeaderForLoggedInUser() {
  const headerActions = document.querySelector('.header-actions');
  if (headerActions && window.currentUser) {
    headerActions.innerHTML = `
      <div class="nav-status">
        <span class="pulse-dot"></span>
        ${escapeHtml(window.currentUser.plan.toUpperCase())}
      </div>
      <a href="./profile.html" class="btn btn-text" style="text-decoration: none;">My Profile</a>
      <button onclick="handleSignOut()" class="btn btn-secondary">Sign Out</button>
    `;
  }

  // Also update mobile drawer account section
  const mobileDrawerFooter = document.querySelector('.mobile-drawer-footer');
  if (mobileDrawerFooter && window.currentUser) {
    mobileDrawerFooter.innerHTML = `
      <div style="padding: 12px; background: rgba(16, 185, 129, 0.08); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 6px;">
        <p style="font-size: 11px; text-transform: uppercase; color: var(--primary); font-weight: 800;">Logged In (${escapeHtml(window.currentUser.plan.toUpperCase())})</p>
        <p style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 2px;">${escapeHtml(window.currentUser.name || window.currentUser.email)}</p>
      </div>
      <a href="./profile.html" class="btn btn-primary w-full" style="text-decoration: none;">My Profile</a>
      <button onclick="handleSignOut()" class="btn btn-secondary w-full">Sign Out</button>
    `;
  }

  // Update Bottom Tab for Profile
  const profileTab = document.querySelector('.bottom-tab-profile');
  if (profileTab) {
    profileTab.setAttribute('href', './profile.html');
    profileTab.onclick = null;
  }
}

async function handleSignOut() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      window.location.reload();
    }
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

function injectAuthSwitchLinks() {
  const signInCard = document.querySelector('#signInModal .auth-card');
  if (signInCard && !signInCard.querySelector('.auth-switch-text')) {
    const switchText = document.createElement('p');
    switchText.className = 'auth-switch-text';
    switchText.style.cssText = 'text-align: center; margin-top: 20px; font-size: 13px; color: var(--text-muted);';
    switchText.innerHTML = `Don't have an account? <a href="#" onclick="openSignUp(); return false;" style="color: var(--primary); text-decoration: none; font-weight: bold;">Register</a>`;
    signInCard.appendChild(switchText);
  }

  const signUpCard = document.querySelector('#signUpModal .auth-card');
  if (signUpCard && !signUpCard.querySelector('.auth-switch-text')) {
    const switchText = document.createElement('p');
    switchText.className = 'auth-switch-text';
    switchText.style.cssText = 'text-align: center; margin-top: 20px; font-size: 13px; color: var(--text-muted);';
    switchText.innerHTML = `Already have an account? <a href="#" onclick="openSignIn(); return false;" style="color: var(--primary); text-decoration: none; font-weight: bold;">Sign In</a>`;
    signUpCard.appendChild(switchText);
  }
}

function setupAuthFormHandlers() {
  const loginForm = document.querySelector('#signInModal form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('input[type="email"]').value;
      const password = loginForm.querySelector('input[type="password"]').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Sign In Successful!');
          window.location.reload();
        } else {
          alert(data.error || 'Login failed');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred during sign in');
      }
    });
  }

  const registerForm = document.querySelector('#signUpModal form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = registerForm.querySelector('input[placeholder="Your Name"], input[type="text"]').value;
      const email = registerForm.querySelector('input[type="email"]').value;
      const password = registerForm.querySelector('input[type="password"]').value;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          alert('Registration Successful!');
          window.location.reload();
        } else {
          alert(data.error || 'Registration failed');
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred during registration');
      }
    });
  }
}

// Global utility for HTML escaping
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global helper to verify auth and plan limits
window.checkAuthAndQuota = async (type) => {
  if (!window.currentUser) {
    alert('Please sign in or register to process files!');
    window.openSignIn();
    return false;
  }

  const { plan, imagesUsed, imagesLimit, videosUsed, videosLimit } = window.currentUser;

  if (type === 'image') {
    if (imagesLimit !== -1 && imagesUsed >= imagesLimit) {
      alert(`Plan limit reached (${imagesLimit}/${imagesLimit} images used). Please buy a plan to continue!`);
      window.location.href = './profile.html';
      return false;
    }
  } else if (type === 'video') {
    if (videosLimit !== -1 && videosUsed >= videosLimit) {
      alert(`Plan limit reached (${videosUsed}/${videosLimit} videos used). Please buy a plan to continue!`);
      window.location.href = './profile.html';
      return false;
    }
  }

  return true;
};
