// ✅ Date helpers
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const startOfWeek = () => {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  const diff = day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
};

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export  const shiftDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const shiftWeeks = (date: Date, weeks: number) =>
  shiftDays(date, weeks * 7);

export const shiftMonths = (d: Date, months: number) =>
  new Date(d.getFullYear(), d.getMonth() + months, 1);

export const computeTrend = (current: number, previous: number, period: string) => {
  const denom = previous === 0 ? 1 : previous;
  const percentRaw = ((current - previous) / denom) * 100;
  const percent = Math.round(percentRaw * 10) / 10;
  const direction =
    percent > 0 ? "up" : percent < 0 ? "down" : "no_change";

  const periodText =
    period === "today"
      ? "day"
      : period === "week"
      ? "week"
      : "month";

  const text =
    direction === "no_change"
      ? `no change from previous ${periodText}`
      : `${Math.abs(percent)}% ${direction} from previous ${periodText}`;

  return { direction, percent: Math.abs(percent), text };
};

