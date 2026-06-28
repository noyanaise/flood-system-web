/**
 * ========================================================
 * RUNTIME SESSION SECURITY VERIFICATION & RBAC
 * ========================================================
 */
(function () {
  fetch("check_session.php")
    .then((response) => response.json())
    .then((session) => {
      // 1. Bounce unauthorized users
      if (!session || !session.logged_in) {
        window.location.href = "login.php"; // Changed to .php just in case!
        return;
      }

      // 2. Lock in the Role GLOBALLY before anything else happens
      window.USER_ROLE_PERMIT = String(session.role).toLowerCase().trim();

      // 3. Update the profile tags
      const profileUsername = document.getElementById("profileUsername");
      if (profileUsername) profileUsername.innerText = session.username;

      const profileRole = document.getElementById("profileRole");
      if (profileRole) profileRole.innerText = session.role.toUpperCase();

      // 4. Apply the global CSS security lock to the body
      const bodyTag = document.getElementById("appBody") || document.body;
      if (bodyTag) {
        bodyTag.className = "";
        bodyTag.classList.add("role-" + window.USER_ROLE_PERMIT);
      }
    })
    .catch((err) => {
      console.error("Session authorization failed:", err);
      window.location.href = "login.php";
    });
})();
