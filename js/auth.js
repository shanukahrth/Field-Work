/**
 * ============================================================================
 * FWMS AUTH MODULE  (js/auth.js)
 * ----------------------------------------------------------------------------
 * Handles login, logout, session persistence and role-based route guarding.
 * Session is stored client-side for this prototype. When a real backend is
 * connected, `Auth.login()` should exchange credentials for a server session
 * / JWT and `Auth.getCurrentUser()` should read the decoded token instead of
 * localStorage — every other file only calls these two functions, so the
 * swap is contained to this file.
 * ============================================================================
 */

const Auth = {

  /**
   * Attempt to log a user in. Returns the user object (without password) on
   * success, or throws an Error with a user-facing message on failure.
   */
  login: async (email, password, rememberMe) => {
    const user = await API.users.getByEmail(email.trim());
    if (!user || user.password !== password) {
      throw new Error('Invalid email or password.');
    }
    if (user.status === 'disabled') {
      throw new Error('This account has been disabled. Please contact your administrator.');
    }
    const session = {
      id: user.id, name: user.name, email: user.email, role: user.role,
      avatarColor: user.avatarColor, title: user.title, loginAt: new Date().toISOString()
    };
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(session));
    // Clear any stale session in the other storage
    (rememberMe ? sessionStorage : localStorage).removeItem(SESSION_KEY);
    return session;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  },

  getCurrentUser: () => {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },

  isLoggedIn: () => !!Auth.getCurrentUser(),

  /** Redirect helper used right after login */
  redirectForRole: (role) => {
    if (role === 'super_admin') window.location.href = 'admin-dashboard.html';
    else if (role === 'manager') window.location.href = 'manager-dashboard.html';
    else window.location.href = 'employee-dashboard.html';
  },

  /**
   * Page guard. Call at the top of every protected page.
   * `allowedRoles` is a comma separated string, e.g. "manager,super_admin".
   * Redirects to login if not authenticated, or to the user's own
   * dashboard if authenticated but not permitted on this page.
   */
  requireAuth: (allowedRoles) => {
    const user = Auth.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    if (allowedRoles) {
      const roles = allowedRoles.split(',').map(r => r.trim());
      if (!roles.includes(user.role)) {
        Auth.redirectForRole(user.role);
        return null;
      }
    }
    return user;
  }
};
