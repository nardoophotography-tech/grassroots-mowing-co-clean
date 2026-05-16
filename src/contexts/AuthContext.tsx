import * as React from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { ADMIN_EMAILS } from '../constants';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isLocked: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  unlock: (passcode: string) => Promise<boolean>;
  setupPasscode: (passcode: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  enablePasskey: () => Promise<void>;
  lock: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isLocked, setIsLocked] = React.useState(false);
  const lastActivityRef = React.useRef<number>(Date.now());

  const AUTO_LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes

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
        
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            
            // If user has a passcode and we just logged in (or refreshed), lock the app
            if (data.passcode && !isLocked && !sessionStorage.getItem('app_unlocked')) {
              setIsLocked(true);
            }
          } else {
            // Check if user is a hardcoded admin
            if (currentUser.email && ADMIN_EMAILS.includes(currentUser.email)) {
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || '',
                role: 'admin',
                setupComplete: false,
              };
              setDoc(userDocRef, newProfile).catch(err => {
                handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
              });
            } else {
              // Auto-create profile for new users (Default to client role if not hardcoded admin)
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || 'Guest User',
                role: 'client', // Default role for new sign-ups
                setupComplete: true, // Clients don't need the passcode setup necessarily
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
        setProfile(null);
        setIsLocked(false);
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

  // Inactivity detection
  React.useEffect(() => {
    if (!user || isLocked) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = setInterval(() => {
      if (Date.now() - lastActivityRef.current > AUTO_LOCK_TIMEOUT) {
        setIsLocked(true);
        sessionStorage.removeItem('app_unlocked');
      }
    }, 60000); // Check every minute

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearInterval(checkInactivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [user, isLocked]);

  const signIn = async (email?: string, password?: string) => {
    try {
      if (typeof email === 'string' && typeof password === 'string' && email.trim() !== '') {
        const cleanEmail = email.trim();
        const cleanPassword = password;
        
        console.log(`Auth: Attempting sign-in for ${cleanEmail}`);
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
        setupComplete: false,
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

  const lock = () => {
    setIsLocked(true);
    sessionStorage.removeItem('app_unlocked');
  };

  const unlock = async (passcode: string): Promise<boolean> => {
    if (!profile || !profile.passcode) return false;
    
    // In a real app, we'd hash this. For now, direct comparison.
    if (profile.passcode === passcode) {
      setIsLocked(false);
      sessionStorage.setItem('app_unlocked', 'true');
      lastActivityRef.current = Date.now();
      return true;
    }
    return false;
  };

  const setupPasscode = async (passcode: string) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { 
      passcode,
      setupComplete: true 
    });
    sessionStorage.setItem('app_unlocked', 'true');
    setIsLocked(false);
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isLocked, 
      signIn, 
      signUp, 
      logout, 
      unlock, 
      setupPasscode, 
      updateProfile,
      enablePasskey,
      lock
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
