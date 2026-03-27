// session.js — 15-minute session timeout for SCAMEASTER
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { auth } from "./firebase.js";

const SESSION_KEY = "scameaster_login_time";
const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes in ms

/**
 * Call this after a successful login to record the login timestamp.
 */
export function recordLoginTime() {
    localStorage.setItem(SESSION_KEY, Date.now().toString());
}

/**
 * Returns true if the current session has expired (> 15 minutes since login).
 */
export function isSessionExpired() {
    const loginTime = parseInt(localStorage.getItem(SESSION_KEY) || "0", 10);
    if (!loginTime) return true;
    return (Date.now() - loginTime) > SESSION_DURATION;
}

/**
 * Clears the stored session timestamp.
 */
export function clearSessionTime() {
    localStorage.removeItem(SESSION_KEY);
}

/**
 * Initialise session guard on a page.
 * - If the user is logged in but the session has expired → sign them out.
 * - Resets a 15-minute countdown timer on every user activity.
 * @param {string} redirectUrl - Where to redirect on session expiry (default: login.html)
 */
export function initSessionGuard(redirectUrl = "login.html") {
    let activityTimer = null;

    function resetTimer() {
        clearTimeout(activityTimer);
        // Update last-activity timestamp so isSessionExpired() tracks inactivity, not login time
        localStorage.setItem(SESSION_KEY, Date.now().toString());
        activityTimer = setTimeout(async () => {
            const user = auth.currentUser;
            if (user) {
                clearSessionTime();
                await signOut(auth);
                alert("Your session has expired after 15 minutes of inactivity. Please log in again.");
                window.location.href = redirectUrl;
            }
        }, SESSION_DURATION);
    }

    // Listen for user activity to reset the timer
    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt => {
        document.addEventListener(evt, resetTimer, { passive: true });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Check if session already expired on page load
            if (isSessionExpired()) {
                clearSessionTime();
                signOut(auth).then(() => {
                    alert("Your session has expired. Please log in again.");
                    window.location.href = redirectUrl;
                });
                return;
            }
            // Start the inactivity timer
            resetTimer();
        } else {
            clearTimeout(activityTimer);
        }
    });
}
