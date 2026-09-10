import api from "./api";

export async function addNotification({ type = "info", title, text, action_path = null }) {
  try {
    const res = await api.post("/notifications/", { type, title, text, action_path });
    window.dispatchEvent(new CustomEvent("budgetbuddy:notifications", { detail: res.data }));
    return res.data;
  } catch {
    return null;
  }
}

export async function getNotifications() {
  try {
    const res = await api.get("/notifications/");
    return res.data || [];
  } catch {
    return [];
  }
}

export async function getUnreadCount() {
  const items = await getNotifications();
  return items.filter((item) => !item.read).length;
}

export async function markNotificationRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  window.dispatchEvent(new CustomEvent("budgetbuddy:notifications"));
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await api.post("/notifications/read-all");
  window.dispatchEvent(new CustomEvent("budgetbuddy:notifications"));
  return res.data;
}

export async function deleteNotification(id) {
  const res = await api.delete(`/notifications/${id}`);
  window.dispatchEvent(new CustomEvent("budgetbuddy:notifications"));
  return res.data;
}

export async function clearNotifications() {
  const res = await api.delete("/notifications/");
  window.dispatchEvent(new CustomEvent("budgetbuddy:notifications"));
  return res.data;
}
