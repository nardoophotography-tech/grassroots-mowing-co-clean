import * as React from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError, safeOnSnapshot } from '../firebase';
import { UserProfile, UserRole, ClientType } from '../types';
import { ADMIN_EMAILS } from '../constants';
import { clientTriageService } from '../services/clientTriageService';

// LOCAL DEV ONLY — OWNER RECOVERY. DO NOT ENABLE IN PRODUCTION.
const __LOCAL_DEV_OWNER_RECOVERY__ =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");


interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setupPasscode: (passcode: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  enablePasskey: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// ============================================================
// ⚠️  LOCAL DEV ADMIN OVERRIDE — LOCALHOST / 127.0.0.1 ONLY
// Completely inert on production domains (hostname check).
// ============================================================
function isLocalDev(): boolean {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL DEV OWNER RECOVERY ONLY — localhost / 127.0.0.1 only.
  // Reads ?ownerRecovery=true OR ?localAdmin=true and writes sessionStorage
  // SYNCHRONOUSLY inside the useState initializer so the value is available
  // to the onAuthStateChanged callback before any Firebase events fire.
  // ─────────────────────────────────────────────────────────────────────────
  const [localDevAdminActive, setLocalDevAdminActive] = React.useState<boolean>(() => {
    if (!isLocalDev()) return false;
    const params = new URLSearchParams(window.location.search);
    const fromParam =
      params.get('ownerRecovery') === 'true' ||
      params.get('localAdmin') === 'true';
    const fromSession = sessionStorage.getItem('local_dev_admin') === 'true';
    // NEVER read grassroots_local_admin from localStorage — localStorage persists across
    // browser restarts and would grant admin access without any login. sessionStorage is
    // correct: it survives F5 reloads within the same tab but clears on tab/browser close.
    // Clean up any stale key left by earlier versions of this code.
    try { localStorage.removeItem('grassroots_local_admin'); } catch {}
    if (fromParam) {
      // Write synchronously — BEFORE onAuthStateChanged can fire
      sessionStorage.setItem('local_dev_admin', 'true');
      sessionStorage.setItem('app_unlocked', 'true');
    }
    return fromParam || fromSession;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL DEV OWNER RECOVERY ONLY
  // Fires when ?ownerRecovery=true or ?localAdmin=true is detected on localhost.
  // Signs in anonymously so the onAuthStateChanged pipeline can complete and
  // set loading=false with a real Firebase user (not null).
  // ─────────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!localDevAdminActive) return;
    // Only sign in if there is no current Firebase user yet
    if (!auth.currentUser) {
      console.warn('[LOCAL DEV OWNER RECOVERY] Signing in anonymously for admin override');
      firebaseSignInAnonymously(auth).catch((err) => {
        console.error('[LOCAL DEV OWNER RECOVERY] Anonymous sign-in failed:', err.message);
        // Prevent infinite loading spinner if anon auth is disabled in this project
        setLoading(false);
      });
    }
  }, [localDevAdminActive]);

  React.useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      // Clean up previous profile listener if auth state changes
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (currentUser) {
        // ── PRODUCTION ANONYMOUS GUARD ──────────────────────────────────────
        // Anonymous Firebase sessions must NOT receive an app profile on
        // production. They can still write to Firestore (e.g. booking form)
        // because Firebase auth is valid, but profile=null means every route
        // guard redirects them to /login — no "auto-login as guest" possible.
        // The local-dev bypass (?localAdmin=true) is explicitly exempted.
        if (currentUser.isAnonymous &&
            !isLocalDev() &&
            sessionStorage.getItem('local_dev_admin') !== 'true') {
          setProfile(null);
          setLoading(false);
          return;
        }
        // ────────────────────────────────────────────────────────────────────

        const userDocRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeProfile = safeOnSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;

            // PRODUCTION ADMIN ROLE CORRECTION ─────────────────────────────────
            // If the user's email is in ADMIN_EMAILS but their Firestore doc has
            // the wrong role (e.g. 'client'), correct it immediately — both in
            // memory (so the UI updates now) and in Firestore (so the next load
            // is already correct). Handles docs created before the email was in
            // ADMIN_EMAILS, or docs accidentally reset to 'client'.
            if (currentUser.email && ADMIN_EMAILS.includes(currentUser.email) && data.role !== 'admin') {
              const correctedData = { ...data, role: 'admin' as UserRole };
              updateDoc(userDocRef, { role: 'admin' }).catch(err =>
                handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`)
              );
              setProfile(correctedData);
              setLoading(false);
              return;
            }
            // ────────────────────────────────────────────────────────────────────

            // LOCAL DEV ADMIN: if the doc exists but role is not 'admin', and we're in the
            // dev bypass session, call the server to upgrade it. onSnapshot will re-fire
            // once the server writes role:'admin', and we'll fall through to setProfile below.
            if (data.role !== 'admin' && currentUser.isAnonymous &&
                sessionStorage.getItem('local_dev_admin') === 'true') {
              console.warn('[LOCAL DEV OWNER RECOVERY] Upgrading existing doc to admin via server for uid:', currentUser.uid);
              fetch('/api/auth/dev-admin-activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid }),
              }).catch((err) => {
                console.error('[LOCAL DEV OWNER RECOVERY] dev-admin-activate failed (server not restarted yet):', err.message);
                // Server not up yet — set profile in memory so the UI doesn't freeze.
                // Firestore reads will still fail until server restarts and role is written.
                setProfile({ ...data, role: 'admin' as any });
              });
              setLoading(false);
              return; // wait for onSnapshot to re-fire once role:'admin' is written
            }

            setProfile(data);

            // Periodically evaluate tier (e.g., on login)
            if (sessionStorage.getItem('tier_evaluated') !== currentUser.uid) {
               await clientTriageService.evaluateTier(currentUser.uid, data.clientType || 'one_off');
               sessionStorage.setItem('tier_evaluated', currentUser.uid);
            }

          } else {
            // Check if user is a hardcoded admin
            if (currentUser.email && ADMIN_EMAILS.includes(currentUser.email)) {
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || '',
                role: 'admin',
                clientType: 'returning',
                loginEnabled: true,
                setupComplete: true,
              };
              setDoc(userDocRef, newProfile).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
              });
              // Set profile immediately — don't wait for onSnapshot to re-fire.
              // Without this, loading=false + profile=null redirects the user to /login.
              setProfile(newProfile);
            } else if (currentUser.isAnonymous && sessionStorage.getItem('local_dev_admin') === 'true') {
              // LOCAL DEV ADMIN BYPASS: anonymous token has no email, so the Firestore
              // isAdmin() rule would fail. Call the server (Admin SDK, bypasses rules)
              // to write role:'admin' to this user's doc, then onSnapshot fires again.
              console.warn('[LOCAL DEV OWNER RECOVERY] Activating admin role via server for anonymous uid:', currentUser.uid);
              fetch('/api/auth/dev-admin-activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: currentUser.uid }),
              }).catch((err) => {
                console.error('[LOCAL DEV OWNER RECOVERY] dev-admin-activate failed (server may not be running):', err.message);
                // Fallback: set profile in memory so the UI renders even if Firestore reads fail
                setProfile({
                  uid: currentUser.uid,
                  email: 'nardoophotography@gmail.com',
                  displayName: 'David Nardoo (Dev Admin)',
                  role: 'admin',
                  clientType: 'returning',
                  loginEnabled: true,
                  setupComplete: true,
                } as UserProfile);
                setLoading(false);
              });
              // Do NOT write 'client' profile here — wait for the server to write 'admin'
              // then onSnapshot will re-fire with the correct doc.
              return;
            } else {
              // Auto-create profile for new users
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || 'Guest User',
                role: 'client',
                clientType: 'one_off',
                loginEnabled: true,
                setupComplete: true,
              };

              setDoc(userDocRef, newProfile).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
              });
            }
          }
          setLoading(false);
        }, (error) => {
          // If we log out, the token drops before the listener fully unmounts, ignoring harmless permissions errors here
          if (error.message && error.message.includes("permissions")) {
             console.warn("Harmless unmount permission error ignored");
          } else {
             handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          }
          setLoading(false);
        });

      } else {
        // LOCAL DEV OWNER RECOVERY ONLY: if dev admin mode is active,
        // don't set loading=false here — the anonymous sign-in is in flight
        // and onAuthStateChanged will fire again once it completes.
        if (isLocalDev() && sessionStorage.getItem('local_dev_admin') === 'true') {
          return;
        }
        setProfile(null);
        sessionStorage.removeItem('app_unlocked');
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribe();
    }
  }, []);

  const signIn = async (email?: string, password?: string) => {
    try {
      if (typeof email === 'string' && typeof password === 'string' && email.trim() !== '') {
        const cleanEmail = email.trim();
        const cleanPassword = password;
        
        console.log(`Auth: Attempting sign-in for ${cleanEmail}`);
        
// LOCAL DEV OWNER LOGIN BYPASS. DO NOT ENABLE IN PRODUCTION.
if (
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
  cleanEmail === "nardoophotography@gmail.com" &&
  cleanPassword === "1560"
) {
  const localUser: any = {
    uid: "local-owner-admin",
    email: "nardoophotography@gmail.com",
    displayName: "David Nardoo",
  };

  const localProfile: any = {
    uid: "local-owner-admin",
    email: "nardoophotography@gmail.com",
    displayName: "David Nardoo",
    role: "admin",
    loginEnabled: true,
    setupComplete: true,
  };

  setUser(localUser);
  setProfile(localProfile);
  setLoading(false);

  try {
    // sessionStorage survives F5 reload within this tab — correct scope for dev session
    sessionStorage.setItem("app_unlocked", "true");
    sessionStorage.setItem("local_dev_admin", "true");
    // localStorage used only for display name/uid — NOT for auth activation
    localStorage.setItem("local_dev_uid", "local-owner-admin");
    localStorage.setItem("local_dev_email", "nardoophotography@gmail.com");
    localStorage.setItem("local_dev_name", "David Nardoo");
  } catch {}
  // Activate the owner recovery path so profile survives F5 reloads
  setLocalDevAdminActive(true);

  return;
}

await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        console.log("Auth: Sign-in successful.");
      } else if (email === undefined && password === undefined) {
        console.log("Auth: Attempting Google sign-in...");
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log("Auth: Google sign-in successful.", result.user.email);
      }
    } catch (error: any) {
      console.error("Auth: Sign-in error:", error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear dev session markers
      sessionStorage.removeItem('app_unlocked');
      sessionStorage.removeItem('local_dev_admin');
      localStorage.removeItem('local_dev_uid');
      localStorage.removeItem('local_dev_email');
      localStorage.removeItem('local_dev_name');
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Auth: Sign-out error:", error.message);
      throw error;
    }
  };

  // Belt-and-suspenders: if the user's email is in ADMIN_EMAILS, always
  // surface role:'admin' regardless of what Firestore currently has stored.
  // The onSnapshot correction above will fix the Firestore doc async, but
  // this ensures the UI is correct immediately on first load.
  const effectiveProfile =
    (localDevAdminActive && profile)
      ? { ...profile, role: 'admin' as const }
      : (profile && user?.email && ADMIN_EMAILS.includes(user.email))
      ? { ...profile, role: 'admin' as const }
      : profile;

  return (
    <AuthContext.Provider value={{ user, profile: effectiveProfile, loading, signIn, signOut, localDevAdminActive }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
