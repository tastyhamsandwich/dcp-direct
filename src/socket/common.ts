export function getSocketIdByUsername(
  users: { [key: string]: User },
  username: string
): string | null {
  for (const [socketId, user] of Object.entries(users)) {
    if (user.username === username) {
      return socketId;
    }
  }
  return null;
}

export function formatTimestamp(timestamp: number | string | Date) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function insertTimestamp(): string {
  return `${formatTimestamp(Date.now())}`;
}
