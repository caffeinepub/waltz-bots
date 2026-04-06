import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface WBUser {
  username: string;
  uid: string;
  subscriptionExpiry: string | null;
  subscriptionType: "1day" | "1week" | "1month" | "1year" | null;
  status: "active" | "expired" | "none";
  displayName?: string;
  email?: string;
  bio?: string;
  timezone?: string;
  phone?: string;
  currency?: string;
  tradeHistory?: { total: number; wins: number; losses: number };
  lastLogin?: string;
}

interface AuthContextType {
  user: WBUser | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  isGuest: boolean;
  userCredits: number;
  login: (
    username: string,
    password: string,
  ) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: Partial<WBUser>) => void;
  allUsers: WBUser[];
  addUser: (
    username: string,
    password: string,
    subType: "1day" | "1week" | "1month" | "1year",
  ) => { success: boolean; error?: string };
  deleteUser: (uid: string) => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_USERNAME = "malverin";
const ADMIN_PASSWORD = "hexermac";

function getSubExpiry(type: string): string {
  const d = new Date();
  if (type === "1day") d.setDate(d.getDate() + 1);
  else if (type === "1week") d.setDate(d.getDate() + 7);
  else if (type === "1month") d.setDate(d.getDate() + 30);
  else if (type === "1year") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function checkExpiry(expiry: string | null): "active" | "expired" | "none" {
  if (!expiry) return "none";
  return new Date(expiry) > new Date() ? "active" : "expired";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WBUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<WBUser[]>([]);
  const [userCredits, setUserCredits] = useState(10);

  const loadUsers = useCallback(() => {
    try {
      const raw = localStorage.getItem("wb_users");
      if (raw) setAllUsers(JSON.parse(raw));
      else setAllUsers([]);
    } catch {
      setAllUsers([]);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    // Restore session
    const savedUser = localStorage.getItem("wb_current_user");
    const savedIsAdmin = localStorage.getItem("wb_is_admin");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser) as WBUser;
        u.status = checkExpiry(u.subscriptionExpiry);
        setUser(u);
        setIsAdmin(savedIsAdmin === "true");
      } catch {
        /* ignore */
      }
    }
    const credits = localStorage.getItem("wb_guest_credits");
    if (credits) setUserCredits(Number(credits));
  }, [loadUsers]);

  // Auto-sync every 30 seconds — re-persist all data permanently
  useEffect(() => {
    const id = setInterval(() => {
      // Re-persist current user session
      const currentUser = localStorage.getItem("wb_current_user");
      const currentIsAdmin = localStorage.getItem("wb_is_admin");
      const currentUsers = localStorage.getItem("wb_users");
      const currentPasswords = localStorage.getItem("wb_user_passwords");

      // Re-write all persistent data to ensure nothing is lost
      if (currentUser) {
        localStorage.setItem("wb_current_user", currentUser);
      }
      if (currentIsAdmin) {
        localStorage.setItem("wb_is_admin", currentIsAdmin);
      }
      if (currentUsers) {
        localStorage.setItem("wb_users", currentUsers);
      }
      if (currentPasswords) {
        localStorage.setItem("wb_user_passwords", currentPasswords);
      }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const login = useCallback(
    (
      username: string,
      password: string,
    ): { success: boolean; error?: string } => {
      // Admin check
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const adminUser: WBUser = {
          username: ADMIN_USERNAME,
          uid: "WB-ADMIN-0001",
          subscriptionExpiry: null,
          subscriptionType: null,
          status: "active",
          displayName: "Malverin Stonehart",
          tradeHistory: { total: 0, wins: 0, losses: 0 },
        };
        setUser(adminUser);
        setIsAdmin(true);
        localStorage.setItem("wb_current_user", JSON.stringify(adminUser));
        localStorage.setItem("wb_is_admin", "true");
        return { success: true };
      }

      // Regular user check
      const users: WBUser[] = JSON.parse(
        localStorage.getItem("wb_users") ?? "[]",
      );
      const found = users.find((u) => u.username === username);
      if (!found) return { success: false, error: "Username not found" };

      const stored: { username: string; password: string }[] = JSON.parse(
        localStorage.getItem("wb_user_passwords") ?? "[]",
      );
      const creds = stored.find((c) => c.username === username);
      if (!creds || creds.password !== password)
        return { success: false, error: "Incorrect password" };

      const u: WBUser = {
        ...found,
        status: checkExpiry(found.subscriptionExpiry),
        lastLogin: new Date().toISOString(),
      };
      setUser(u);
      setIsAdmin(false);
      localStorage.setItem("wb_current_user", JSON.stringify(u));
      localStorage.setItem("wb_is_admin", "false");

      // Update last login
      const updated = users.map((usr) =>
        usr.uid === u.uid ? { ...usr, lastLogin: u.lastLogin } : usr,
      );
      localStorage.setItem("wb_users", JSON.stringify(updated));
      setAllUsers(updated);

      return { success: true };
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem("wb_current_user");
    localStorage.removeItem("wb_is_admin");
  }, []);

  const updateProfile = useCallback((data: Partial<WBUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("wb_current_user", JSON.stringify(updated));
      // Also update in wb_users if not admin — includes tradeHistory wins/losses
      if (prev.uid !== "WB-ADMIN-0001") {
        const users: WBUser[] = JSON.parse(
          localStorage.getItem("wb_users") ?? "[]",
        );
        const idx = users.findIndex((u) => u.uid === prev.uid);
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...data };
          localStorage.setItem("wb_users", JSON.stringify(users));
        }
      }
      return updated;
    });
  }, []);

  const addUser = useCallback(
    (
      username: string,
      password: string,
      subType: "1day" | "1week" | "1month" | "1year",
    ): { success: boolean; error?: string } => {
      const users: WBUser[] = JSON.parse(
        localStorage.getItem("wb_users") ?? "[]",
      );
      if (users.find((u) => u.username === username))
        return { success: false, error: "Username already exists" };

      const uid = `WB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const expiry = getSubExpiry(subType);
      const newUser: WBUser = {
        username,
        uid,
        subscriptionExpiry: expiry,
        subscriptionType: subType,
        status: "active",
        tradeHistory: { total: 0, wins: 0, losses: 0 },
      };

      const updated = [...users, newUser];
      localStorage.setItem("wb_users", JSON.stringify(updated));
      setAllUsers(updated);

      // Store password permanently
      const passwords: { username: string; password: string }[] = JSON.parse(
        localStorage.getItem("wb_user_passwords") ?? "[]",
      );
      passwords.push({ username, password });
      localStorage.setItem("wb_user_passwords", JSON.stringify(passwords));

      return { success: true };
    },
    [],
  );

  const deleteUser = useCallback((uid: string) => {
    const users: WBUser[] = JSON.parse(
      localStorage.getItem("wb_users") ?? "[]",
    );
    const toDelete = users.find((u) => u.uid === uid);
    const updated = users.filter((u) => u.uid !== uid);
    localStorage.setItem("wb_users", JSON.stringify(updated));
    setAllUsers(updated);
    if (toDelete) {
      const passwords: { username: string; password: string }[] = JSON.parse(
        localStorage.getItem("wb_user_passwords") ?? "[]",
      );
      localStorage.setItem(
        "wb_user_passwords",
        JSON.stringify(
          passwords.filter((p) => p.username !== toDelete.username),
        ),
      );
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoggedIn: !!user,
        isGuest: !user,
        userCredits,
        login,
        logout,
        updateProfile,
        allUsers,
        addUser,
        deleteUser,
        refreshUsers: loadUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
