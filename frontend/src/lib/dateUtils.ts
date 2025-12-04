// No external imports needed

/**
 * Parses a date string from the backend, forcing it to be treated as UTC.
 * Standardizes the string to ISO format (T separator + Z suffix) before parsing.
 */
export function parseUTC(dateString: string): Date {
  if (!dateString) return new Date();

  // 1. Force string type just in case
  let isoString = String(dateString);

  // 2. Replace SQL space with ISO 'T' (e.g., "2023-11-20 11:00" -> "2023-11-20T11:00")
  isoString = isoString.replace(' ', 'T');

  // 3. If it doesn't indicate a timezone (no 'Z' and no '+' offset), append 'Z' to force UTC.
  // This prevents the browser from assuming Local Time.
  const hasTimezone = isoString.endsWith('Z') || /[+-]\d{2}:?\d{2}/.test(isoString);
  
  if (!hasTimezone) {
    isoString += 'Z';
  }

  // 4. Create Date object. The 'Z' ensures the browser converts UTC -> Local Time.
  const date = new Date(isoString);

  // 5. Safety fallback: If the manipulation broke it (invalid date), try parsing original string
  return isNaN(date.getTime()) ? new Date(dateString) : date;
}

export function timeAgo(dateString: string): string {
  if (!dateString) return "just now";

  const date = parseUTC(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  
  return "just now";
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return "";
  const date = parseUTC(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
}