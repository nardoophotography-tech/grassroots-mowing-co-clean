import React, { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { UserProfile, UserRole } from "../types";

type LocalUser = {
  id: string;
  uid: string;
  name: string;
  email: string;
  displayName: string;
  getIdToken: () => Promise<string>;
} | null;

type AuthContextType = {
  user: LocalUser;
  profile: UserProfile | null;
  loading: boolean;
  isLocked: boolean;
  login: (name: string) => void;
  logout: () => void;
  signIn: (email?: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  unlock: (passcode: string) => Promise<boolean>;
  setupPasscode: (passcode: string) => Promise<void>;
  enablePasskey: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function createLocalUser(emailOrName: string, displayName?: string): NonNullable<LocalUser> {
  const email = emailOrName.includes("@") ? emailOrName : "local@grassroots.test";
  const name = displayName || emailOrName || "Local User";

  return {
    id: "local-user",
    uid: "local-user",
    name,
    email,
    displayName: name,
    getIdToken: async () => "local-dev-token",
  };
}

function createProfile(user: NonNullable<LocalUser>, role: UserRole = "admin"): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role,
    setupComplete: true,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<LocalUser>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    loading: false,
    isLocked,
    login: (name: string) => {
      const nextUser = createLocalUser(name);
      setUser(nextUser);
      setProfile(createProfile(nextUser));
    },
    logout: () => {
      setUser(null);
      setProfile(null);
      setIsLocked(false);
    },
    signIn: async (email = "local@grassroots.test") => {
      const nextUser = createLocalUser(email);
      setUser(nextUser);
      setProfile(createProfile(nextUser));
    },
    signUp: async (email: string, _password: string, displayName: string, role: UserRole = "staff") => {
      const nextUser = createLocalUser(email, displayName);
      setUser(nextUser);
      setProfile(createProfile(nextUser, role));
    },
    unlock: async (passcode: string) => {
      const success = Boolean(passcode.trim());
      if (success) setIsLocked(false);
      return success;
    },
    setupPasscode: async (passcode: string) => {
      setProfile((current) => current ? { ...current, passcode, setupComplete: true } : current);
    },
    enablePasskey: async () => {
      setProfile((current) => current ? { ...current, passkeyEnabled: true } : current);
    },
    updateProfile: async (updates: Partial<UserProfile>) => {
      setProfile((current) => current ? { ...current, ...updates } : current);
    },
  }), [isLocked, profile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
