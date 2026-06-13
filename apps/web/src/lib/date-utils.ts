export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthStartInputValue() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}
