/**
 * Date and Time utilities tailored for Indian Standard Time (Asia/Kolkata)
 * and timezone-safe calendar date handling across the application.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

/**
 * Extracts YYYY-MM-DD from any date representation (String, Date object, ISO string)
 * without timezone drift (always preserving calendar date or using Asia/Kolkata timezone).
 */
export const toCalendarYMD = (dateVal) => {
  if (!dateVal) return "";
  try {
    if (typeof dateVal === "string") {
      const match = dateVal.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
};

/**
 * Formats a date value into "Sep 16, 2026" or "16 Sep 2026".
 * Guaranteed not to date-shift on ISO strings like "2026-09-16T00:00:00.000Z".
 *
 * @param {string|Date|number} dateVal
 * @param {object} options
 * @param {boolean} [options.dayFirst=false] - Format as "16 Sep 2026" if true, "Sep 16, 2026" if false
 * @param {boolean} [options.padDay=false] - Pad single digit days with 0 (e.g. "09" vs "9")
 * @param {boolean} [options.includeWeekday=false] - Prepend weekday (e.g. "Wed, Sep 16, 2026")
 * @param {string} [options.monthFormat='short'] - 'short' for "Sep", 'full' for "September"
 * @param {string} [options.fallback='—'] - Value when dateVal is missing
 */
export const formatCalendarDate = (dateVal, options = {}) => {
  if (!dateVal) return options.fallback || "—";
  try {
    const rawStr = String(dateVal).trim();
    const match = rawStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [_, y, m, d] = match;
      const mIdx = parseInt(m, 10) - 1;
      const monthName = (options.monthFormat === "full" ? MONTHS_FULL : MONTHS_SHORT)[mIdx] || m;
      const dayNum = parseInt(d, 10);
      const dayStr = options.padDay ? String(dayNum).padStart(2, "0") : String(dayNum);

      let weekdayStr = "";
      if (options.includeWeekday) {
        const utcDate = new Date(Date.UTC(parseInt(y, 10), mIdx, dayNum));
        const dayIdx = utcDate.getUTCDay();
        weekdayStr = `${(options.weekdayFormat === "full" ? WEEKDAYS_FULL : WEEKDAYS_SHORT)[dayIdx] || ""}, `;
      }

      if (options.dayFirst) {
        return `${weekdayStr}${dayStr} ${monthName} ${y}`;
      }
      return `${weekdayStr}${monthName} ${dayStr}, ${y}`;
    }

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      day: options.padDay ? "2-digit" : "numeric",
      month: options.monthFormat === "full" ? "long" : "short",
      year: "numeric",
      weekday: options.includeWeekday ? (options.weekdayFormat === "full" ? "long" : "short") : undefined,
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Formats a time string or timestamp into IST 12-hour format ("01:00 PM")
 */
export const formatISTTime = (timeStr, fallbackDate) => {
  const target = timeStr || fallbackDate;
  if (!target) return "—";

  if (typeof target === "string") {
    const trimmed = target.trim();
    if (/^\d{1,2}:\d{2}(\s?[APap][Mm])?$/.test(trimmed)) {
      return trimmed;
    }
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // ignore
    }
    return trimmed;
  }

  if (target instanceof Date && !isNaN(target.getTime())) {
    return target.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return "—";
};
