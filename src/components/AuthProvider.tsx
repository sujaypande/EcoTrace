"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createUser, getUserByEmail } from "@/utils/db/actions";

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const email = localStorage.getItem("userEmail");
        const userId = localStorage.getItem("userId");
        const userName = localStorage.getItem("userName");

        if (email && userId && userName) {
          // Verify user still exists in database
          const dbUser = await getUserByEmail(email);
          if (dbUser) {
            setUser({
              id: parseInt(userId),
              email: email,
              name: userName,
            });
          } else {
            // User doesn't exist in database, clear localStorage
            localStorage.removeItem("userEmail");
            localStorage.removeItem("userId");
            localStorage.removeItem("userName");
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Clear localStorage on error
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simple validation
      if (!email || !password) {
        return false;
      }

      // Check if user exists
      let dbUser = await getUserByEmail(email);

      if (!dbUser) {
        // Create new user if doesn't exist
        dbUser = await createUser(email, email.split("@")[0]);
        if (!dbUser) {
          return false;
        }
      }

      // Store user info in localStorage
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", dbUser.name);
      localStorage.setItem("userId", dbUser.id.toString());

      setUser({
        id: dbUser.id,
        email: email,
        name: dbUser.name,
      });

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

