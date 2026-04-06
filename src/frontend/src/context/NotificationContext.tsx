import { createContext, useCallback, useContext, useState } from "react";

export interface WBNotification {
  id: string;
  type: "tp_hit" | "new_signal" | "system";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  symbol?: string;
}

interface NotificationContextType {
  notifications: WBNotification[];
  unreadCount: number;
  addNotification: (
    n: Omit<WBNotification, "id" | "timestamp" | "read">,
  ) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({
  children,
}: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<WBNotification[]>([]);

  const addNotification = useCallback(
    (n: Omit<WBNotification, "id" | "timestamp" | "read">) => {
      const newNotif: WBNotification = {
        ...n,
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  return ctx;
}
