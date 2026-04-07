import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";
import type { AppUserProfile, SubscriptionStatus } from "../hooks/useActor";

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
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<WBUser>) => void;
  allUsers: WBUser[];
  addUser: (
    username: string,
    password: string,
    subType: "1day" | "1week" | "1month" | "1year",
  ) => Promise<{ success: boolean; error?: string }>;
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

/** Map WBUser to AppUserProfile for cloud persistence */
function toAppUserProfile(u: WBUser): AppUserProfile {
  return {
    uid: u.uid,
    username: u.username,
    status: (u.status === "active"
      ? "active"
      : u.status === "expired"
        ? "expired"
        : "trial") as unknown as SubscriptionStatus,
    subscriptionExpiry: u.subscriptionExpiry
      ? BigInt(Math.floor(new Date(u.subscriptionExpiry).getTime() * 1_000_000))
      : BigInt(0),
  };
}

/** Map AppUserProfile from cloud to partial WBUser */
function fromAppUserProfile(
  p: AppUserProfile,
): Partial<WBUser> & { uid: string; username: string } {
  const statusVal = p.status as unknown as string;
  const subscriptionExpiry =
    p.subscriptionExpiry > BigInt(0)
      ? new Date(Number(p.subscriptionExpiry) / 1_000_000).toISOString()
      : null;
  return {
    uid: p.uid,
    username: p.username,
    subscriptionExpiry,
    subscriptionType: null,
    status: (statusVal === "active"
      ? "active"
      : statusVal === "expired"
        ? "expired"
        : "none") as "active" | "expired" | "none",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { actor } = useActor();
  const [user, setUser] = useState<WBUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState<WBUser[]>([]);
  const [userCredits, setUserCredits] = useState(10);

  /** Merge cloud users AND credentials into localStorage, then load into state */
  const syncFromCloud = useCallback(async () => {
    if (!actor) return;
    try {
      // Run both in parallel
      const [cloudProfiles, cloudCreds] = await Promise.all([
        actor.getAllAppUserProfiles().catch(() => [] as AppUserProfile[]),
        actor.getAllUserCredentials().catch(() => []),
      ]);

      const localRaw = localStorage.getItem("wb_users");
      const localUsers: WBUser[] = localRaw ? JSON.parse(localRaw) : [];

      // Merge users: cloud is source of truth for user existence
      const merged: WBUser[] = [...localUsers];
      for (const profile of cloudProfiles) {
        const exists = merged.findIndex((u) => u.uid === profile.uid);
        const fromCloud = fromAppUserProfile(profile);
        if (exists === -1) {
          merged.push({
            username: fromCloud.username,
            uid: fromCloud.uid,
            subscriptionExpiry: fromCloud.subscriptionExpiry ?? null,
            subscriptionType: null,
            status: fromCloud.status ?? "none",
            tradeHistory: { total: 0, wins: 0, losses: 0 },
          });
        }
      }

      localStorage.setItem("wb_users", JSON.stringify(merged));
      setAllUsers(merged);

      // Merge cloud credentials into local password store
      if (cloudCreds.length > 0) {
        const localPasswords: { username: string; password: string }[] =
          JSON.parse(localStorage.getItem("wb_user_passwords") ?? "[]");
        let updated = false;
        for (const cred of cloudCreds) {
          const exists = localPasswords.find(
            (p) => p.username === cred.username,
          );
          if (!exists && cred.passwordHash) {
            localPasswords.push({
              username: cred.username,
              password: cred.passwordHash,
            });
            updated = true;
          }
        }
        if (updated) {
          localStorage.setItem(
            "wb_user_passwords",
            JSON.stringify(localPasswords),
          );
        }

        // Also merge subscriptionType from cloud creds into users
        const reloaded: WBUser[] = JSON.parse(
          localStorage.getItem("wb_users") ?? "[]",
        );
        let usersUpdated = false;
        for (const cred of cloudCreds) {
          const idx = reloaded.findIndex((u) => u.uid === cred.uid);
          if (
            idx !== -1 &&
            !reloaded[idx].subscriptionType &&
            cred.subscriptionType
          ) {
            reloaded[idx] = {
              ...reloaded[idx],
              subscriptionType:
                cred.subscriptionType as WBUser["subscriptionType"],
            };
            usersUpdated = true;
          }
        }
        if (usersUpdated) {
          localStorage.setItem("wb_users", JSON.stringify(reloaded));
          setAllUsers(reloaded);
        }
      }
    } catch {
      // Cloud sync failed — silently fall back to localStorage
    }
  }, [actor]);

  const loadUsers = useCallback(() => {
    try {
      const raw = localStorage.getItem("wb_users");
      if (raw) setAllUsers(JSON.parse(raw));
      else setAllUsers([]);
    } catch {
      setAllUsers([]);
    }
  }, []);

  // Initial load: localStorage first, then sync from cloud
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

  // Sync from cloud when actor becomes available
  useEffect(() => {
    if (actor) {
      syncFromCloud();
    }
  }, [actor, syncFromCloud]);

  // Auto-sync every 30 seconds — push to cloud + pull from cloud
  useEffect(() => {
    const id = setInterval(async () => {
      if (!actor) return;

      // Push users + credentials to cloud
      try {
        const currentUsers: WBUser[] = JSON.parse(
          localStorage.getItem("wb_users") ?? "[]",
        );
        const passwords: { username: string; password: string }[] = JSON.parse(
          localStorage.getItem("wb_user_passwords") ?? "[]",
        );

        await Promise.all(
          currentUsers.map(async (u) => {
            try {
              await actor.addAppUserProfile(toAppUserProfile(u));
              const pwd = passwords.find((p) => p.username === u.username);
              if (pwd) {
                await actor.saveUserCredential({
                  uid: u.uid,
                  username: u.username,
                  passwordHash: pwd.password,
                  subscriptionType: u.subscriptionType ?? "1month",
                  createdAt: BigInt(Date.now() * 1_000_000),
                });
              }
            } catch {
              // Skip individual failures
            }
          }),
        );
      } catch {
        // Sync failed — silently continue
      }

      // Also pull from cloud to catch cross-device changes
      await syncFromCloud();
    }, 30000);
    return () => clearInterval(id);
  }, [actor, syncFromCloud]);

  const login = useCallback(
    async (
      username: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
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

      // Try local users first
      let users: WBUser[] = JSON.parse(
        localStorage.getItem("wb_users") ?? "[]",
      );
      let found = users.find((u) => u.username === username);

      // Check local password store
      let localPasswords: { username: string; password: string }[] = JSON.parse(
        localStorage.getItem("wb_user_passwords") ?? "[]",
      );
      let localCred = localPasswords.find((c) => c.username === username);

      // --- Cross-device login: if user or password not found locally, check cloud ---
      if ((!found || !localCred) && actor) {
        try {
          const cloudCred = await actor.getUserCredentialByUsername(username);
          if (cloudCred) {
            // Found in cloud — verify password
            if (cloudCred.passwordHash !== password) {
              return { success: false, error: "Incorrect password" };
            }

            // Save to localStorage for fast future logins
            if (!localCred) {
              localPasswords.push({
                username: cloudCred.username,
                password: cloudCred.passwordHash,
              });
              localStorage.setItem(
                "wb_user_passwords",
                JSON.stringify(localPasswords),
              );
              localCred = { username, password };
            }

            // Find or restore user profile
            if (!found) {
              // Pull all profiles from cloud to find matching one
              try {
                const allProfiles = await actor.getAllAppUserProfiles();
                const cloudProfile = allProfiles.find(
                  (p) => p.username === username,
                );
                if (cloudProfile) {
                  const fromCloud = fromAppUserProfile(cloudProfile);
                  const restoredUser: WBUser = {
                    username: fromCloud.username,
                    uid: cloudCred.uid,
                    subscriptionExpiry: fromCloud.subscriptionExpiry ?? null,
                    subscriptionType:
                      (cloudCred.subscriptionType as WBUser["subscriptionType"]) ??
                      null,
                    status: fromCloud.status ?? "none",
                    tradeHistory: { total: 0, wins: 0, losses: 0 },
                  };
                  users = [...users, restoredUser];
                  localStorage.setItem("wb_users", JSON.stringify(users));
                  setAllUsers(users);
                  found = restoredUser;
                } else {
                  // Build user from credential alone
                  const expiryFromType = getSubExpiry(
                    cloudCred.subscriptionType,
                  );
                  const restoredUser: WBUser = {
                    username: cloudCred.username,
                    uid: cloudCred.uid,
                    subscriptionExpiry: expiryFromType,
                    subscriptionType:
                      (cloudCred.subscriptionType as WBUser["subscriptionType"]) ??
                      null,
                    status: "active",
                    tradeHistory: { total: 0, wins: 0, losses: 0 },
                  };
                  users = [...users, restoredUser];
                  localStorage.setItem("wb_users", JSON.stringify(users));
                  setAllUsers(users);
                  found = restoredUser;
                }
              } catch {
                // Profile fetch failed — build minimal user from credential
                const expiryFromType = getSubExpiry(cloudCred.subscriptionType);
                const restoredUser: WBUser = {
                  username: cloudCred.username,
                  uid: cloudCred.uid,
                  subscriptionExpiry: expiryFromType,
                  subscriptionType:
                    (cloudCred.subscriptionType as WBUser["subscriptionType"]) ??
                    null,
                  status: "active",
                  tradeHistory: { total: 0, wins: 0, losses: 0 },
                };
                users = [...users, restoredUser];
                localStorage.setItem("wb_users", JSON.stringify(users));
                setAllUsers(users);
                found = restoredUser;
              }
            }

            // Log in successfully via cloud credential
            const u: WBUser = {
              ...found,
              status: checkExpiry(found.subscriptionExpiry),
              lastLogin: new Date().toISOString(),
            };
            setUser(u);
            setIsAdmin(false);
            localStorage.setItem("wb_current_user", JSON.stringify(u));
            localStorage.setItem("wb_is_admin", "false");
            const updated = users.map((usr) =>
              usr.uid === u.uid ? { ...usr, lastLogin: u.lastLogin } : usr,
            );
            localStorage.setItem("wb_users", JSON.stringify(updated));
            setAllUsers(updated);
            return { success: true };
          }
        } catch {
          // Cloud lookup failed — fall through to local check
        }
      }

      if (!found) return { success: false, error: "Username not found" };

      // Reload localCred in case it was just added during cloud lookup
      localCred = (
        JSON.parse(localStorage.getItem("wb_user_passwords") ?? "[]") as {
          username: string;
          password: string;
        }[]
      ).find((c) => c.username === username);

      if (!localCred || localCred.password !== password)
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
    [actor],
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
    async (
      username: string,
      password: string,
      subType: "1day" | "1week" | "1month" | "1year",
    ): Promise<{ success: boolean; error?: string }> => {
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

      // Store password permanently in local store
      const passwords: { username: string; password: string }[] = JSON.parse(
        localStorage.getItem("wb_user_passwords") ?? "[]",
      );
      passwords.push({ username, password });
      localStorage.setItem("wb_user_passwords", JSON.stringify(passwords));

      // Persist to cloud — both profile and credential
      if (actor) {
        const createdAt = BigInt(Date.now() * 1_000_000);
        await Promise.all([
          actor.addAppUserProfile(toAppUserProfile(newUser)).catch(() => {}),
          actor
            .saveUserCredential({
              uid,
              username,
              passwordHash: password,
              subscriptionType: subType,
              createdAt,
            })
            .catch(() => {}),
        ]);
      }

      return { success: true };
    },
    [actor],
  );

  const deleteUser = useCallback(
    (uid: string) => {
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
        // Delete from cloud too
        if (actor) {
          actor.deleteUserCredential(uid).catch(() => {});
        }
      }
    },
    [actor],
  );

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
