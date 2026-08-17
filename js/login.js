/**
 * js/login.js — logic for index.html (login page)
 */
document.getElementById('yearSpan').textContent = new Date().getFullYear();

// If already logged in, skip straight to the right dashboard
(function redirectIfLoggedIn() {
  const user = Auth.getCurrentUser();
  if (user) Auth.redirectForRole(user.role);
})();

const loginForm = document.getElementById('loginForm');
const loginAlert = document.getElementById('loginAlert');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginAlert.classList.add('d-none');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  if (!email || !password) {
    loginAlert.textContent = 'Please enter both email and password.';
    loginAlert.classList.remove('d-none');
    return;
  }

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Signing in...';

  try {
    const session = await Auth.login(email, password, rememberMe);
    Auth.redirectForRole(session.role);
  } catch (err) {
    loginAlert.textContent = err.message || 'Unable to sign in.';
    loginAlert.classList.remove('d-none');
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.innerHTML = '<span>Sign In</span><span class="material-symbols-outlined" style="font-size:20px;">arrow_forward</span>';
  }
});

// Show / hide password
document.getElementById('togglePasswordBtn').addEventListener('click', () => {
  const input = document.getElementById('loginPassword');
  const icon = document.getElementById('togglePasswordIcon');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  icon.textContent = show ? 'visibility_off' : 'visibility';
});

// Quick demo login buttons
document.querySelectorAll('.demo-account-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('loginEmail').value = btn.dataset.email;
    document.getElementById('loginPassword').value = 'password123';
  });
});

// Forgot password (prototype: simulates sending an email)
document.getElementById('sendResetLinkBtn').addEventListener('click', async () => {
  const email = document.getElementById('forgotEmail').value.trim();
  const alertBox = document.getElementById('forgotAlert');
  if (!email) return;
  const user = await API.users.getByEmail(email);
  alertBox.classList.remove('d-none');
  alertBox.textContent = user
    ? `A password reset link has been sent to ${email}.`
    : `If an account exists for ${email}, a reset link has been sent.`;
});
