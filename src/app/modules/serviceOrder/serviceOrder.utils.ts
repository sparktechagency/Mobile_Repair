import { sendNotificationEmail } from "../../utils/emailNotification";
import { TUserCreate } from "../user/user.interface";
import { User } from "../user/user.model";

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




export const sendNewOrderEmailToTechnicians = async (
  technicians: TUserCreate[]
) => {
  for (const tech of technicians) {
    if (!tech.email) continue;

    try {
      await sendNotificationEmail({
        sentTo: tech.email,
        subject: "New Service Order Available!",
        userName: tech.name || "Technician",
        messageText: `Hello ${tech.name || "Technician"},

A new service order has been created that may match your expertise.
Please check your app dashboard to view details and accept the order.

Thank you for being a valued technician.`,
      });
    } catch (error: any) {
      console.error(
        `❌ Email failed for ${tech.email}:`,
        error.message
      );
    }
  }
};


export const notifyTechniciansForNewOrder = async () => {
  const verifiedTechnicians = await User.find({
    role: "technician",
    adminVerified: "verified",
    isDeleted: { $ne: true },
    email: { $exists: true, $ne: "" },
  });

  // 🚀 Fire-and-forget background execution
  setImmediate(() => {
    sendNewOrderEmailToTechnicians(verifiedTechnicians);
  });
};