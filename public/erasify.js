// Erasify common functionality (Auth session, modals, premium limits)
document.addEventListener('DOMContentLoaded', () => {
  const signInModal = document.getElementById('signInModal');
  const signUpModal = document.getElementById('signUpModal');
  
  // Make sure modals have toggle switch links
  injectAuthSwitchLinks();

  window.openSignIn = () => {
    if (signUpModal) signUpModal.classList.remove('active');
    if (signInModal) signInModal.classList.add('active');
  };

  window.openSignUp = () => {
    if (signInModal) signInModal.classList.remove('active');
    if (signUpModal) signUpModal.classList.add('active');
  };

  window.closeAuthModals = () => {
    if (signInModal) signInModal.classList.remove('active');
    if (signUpModal) signUpModal.classList.remove('active');
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

  // Handle real API auth submission
  setupAuthFormHandlers();

  // Check login state
  checkUserSession();

  // Scroll Fade In animation logic
  const fadeElements = document.querySelectorAll('.glass-card, .pricing-card, .tool-teaser');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  fadeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    observer.observe(el);
  });
});

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
  if (!headerActions || !window.currentUser) return;

  headerActions.innerHTML = `
    <div class="nav-status">
      <span class="pulse-dot"></span>
      ${escapeHtml(window.currentUser.plan.toUpperCase())}
    </div>
    <a href="./profile.html" class="btn btn-text" style="text-decoration: none;">My Profile</a>
    <button onclick="handleSignOut()" class="btn btn-secondary">Sign Out</button>
  `;
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
