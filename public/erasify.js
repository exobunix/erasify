// Erasify common functionality (Auth modal, premium interactions)
document.addEventListener('DOMContentLoaded', () => {
  const signInModal = document.getElementById('signInModal');
  const signUpModal = document.getElementById('signUpModal');
  
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

  // Handle mock auth submission
  const forms = document.querySelectorAll('.auth-card form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Authentication Successful!');
      closeAuthModals();
    });
  });

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
