const KEY = "budgetbuddy_notifications";

export function addNotification({ type = "info", title, text }) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    text,
    time: new Date().toISOString(),
    read: false,
  };

  let items = [];
  try {
    items = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(items)) items = [];
  } catch {
    items = [];
  }

  const next = [item, ...items].slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("budgetbuddy:notifications", { detail: item }));
  return item;
}

export function getNotifications() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(items)) return [];

    // Remove legacy milestone notifications created by the old logic.
    // Progress notifications are now generated only for the contribution that happened.
    const cleaned = items.filter((item) => {
      const title = String(item?.title || "");
      return !/^\d+% savings milestone$/i.test(title);
    });

    if (cleaned.length !== items.length) {
      localStorage.setItem(KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function getUnreadCount() {
  return getNotifications().filter((item) => !item.read).length;
}

export { KEY as NOTIFICATION_KEY };


// Used by savings-goal logic to avoid creating the same milestone/completion
// notification more than once, including for goals created before this logic
// was added.
export function hasSavingsMilestoneNotification(goalName, milestone) {
  const items = getNotifications();
  const title = `${milestone}% savings milestone`;
  return items.some(
    (item) => item.title === title && String(item.text || "").includes(`'${goalName}'`)
  );
}

export function hasSavingsCompletionNotification(goalName) {
  const items = getNotifications();
  return items.some(
    (item) =>
      item.title === "Savings goal completed" &&
      String(item.text || "").includes(`'${goalName}'`)
  );
}
