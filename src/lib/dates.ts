/**
 * Q-not's initial operating timezone is Africa/Lagos (UTC+01:00).
 * HTML datetime-local fields contain no timezone, so parsing them with
 * `new Date(value)` would silently use the server's timezone instead.
 */
export function parseLagosDateTime(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return new Date(Number.NaN);
  const [, year, month, day, hour, minute] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00+01:00`);
}

export function lagosDateTimeInputValue(date: Date): string {
  // Nigeria observes UTC+01:00 year-round; format for datetime-local.
  return new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
}
