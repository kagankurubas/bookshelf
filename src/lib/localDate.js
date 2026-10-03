function pad2(value) {
  return String(value).padStart(2, '0');
}

// YYYY-MM-DD in the user's local time zone. toISOString() would give the UTC
// day instead, which is the previous day just after local midnight in
// time zones ahead of UTC.
export function toLocalIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
