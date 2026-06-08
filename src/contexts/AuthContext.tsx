import * as React from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
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
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
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
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
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
    sessionStorage.setItem("app_unlocked", "true");
    localStorage.setItem("grassroots_local_admin", "true");
  } catch {}

  return;
}

await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        console.log("Auth: Sign-in successful.");
      } else if (email === undefined && password === undefined) {
        console.log("Auth: Attempting Google sign-in...");
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        console.log("Auth: Google sign-in successful.");
      } else {
        throw new Error("Invalid login credentials. Please provide both email and password.");
      }
    } catch (error: any) {
      console.error("Auth: Error during sign-in:", error.message || error);
      throw error;
    }
  };

  const signInAnonymously = async () => {
    try {
      console.log("Auth: Attempting anonymous sign-in...");
      await firebaseSignInAnonymously(auth);
      console.log("Auth: Anonymous sign-in successful.");
    } catch (error: any) {
      console.error("Auth: Error during anonymous sign-in:", error.message || error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string, role: UserRole = 'staff') => {
    try {
      if (!email || !password || !displayName) {
        throw new Error("Missing required fields for account creation.");
      }
      
      const cleanEmail = email.trim();
      console.log(`Auth: Attempting account creation for ${cleanEmail}`);
      
      const { user: newUser } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      console.log("Auth: Account created in Firebase Auth.");
      
      const userDocRef = doc(db, 'users', newUser.uid);
      await setDoc(userDocRef, {
        uid: newUser.uid,
        email: cleanEmail,
        displayName: displayName.trim(),
        role,
        setupComplete: true,
      });
      console.log("Auth: User profile document created in Firestore.");
    } catch (error: any) {
      console.error("Auth: Error during registration:", error.message || error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('app_unlocked');
  };

  const setupPasscode = async (passcode: string) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      passcode,
      setupComplete: true
    });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, updates);
  };

  const enablePasskey = async () => {
    // This is a placeholder for WebAuthn implementation
    // In a real app, you'd use navigator.credentials.create()
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { passkeyEnabled: true });
  };

  // ⚠️ LOCAL DEV ONLY — inject admin role when override is active
  const effectiveProfile: UserProfile | null = React.useMemo(() => {
    if (!localDevAdminActive || !isLocalDev()) return profile;
    const base: UserProfile = profile ?? {
      uid: user?.uid ?? 'local-dev-admin',
      email: user?.email ?? 'localdev@grassroots.dev',
      displayName: 'Local Dev Admin',
      role: 'client' as UserRole,
      clientType: 'returning' as ClientType,
      loginEnabled: true,
      setupComplete: true,
    };
    return { ...base, role: 'admin' as UserRole, displayName: base.displayName || 'Local Dev Admin', setupComplete: true };
  }, [localDevAdminActive, profile, user]);

  return (
    <AuthContext.Provider value={{
      user,
      profile: effectiveProfile,
      loading,
      signIn,
      signInAnonymously,
      signUp,
      logout,
      setupPasscode,
      updateProfile,
      enablePasskey,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
