export type ManagerDateRange =
  | "this_week"
  | "this_month"
  | "this_year"
  | "custom";

export type SubmittedDateRangePreset = "any" | ManagerDateRange;

type DateRangeInput = {
  range?: string;
  submittedFrom?: string;
  submittedTo?: string;
  now?: Date;
};

type DateBounds = {
  submittedFrom?: string;
  submittedTo?: string;
};

const manilaTimeZone = "Asia/Manila";

export function resolveSubmittedDateRangeFilters({
  range,
  submittedFrom,
  submittedTo,
  now = new Date(),
}: DateRangeInput): DateBounds {
  if (range === "custom") {
    return toUtcBounds(submittedFrom, submittedTo);
  }

  const presetBounds = getManagerSubmittedDateRange(range, now);
  if (presetBounds.submittedFrom || presetBounds.submittedTo) {
    return toUtcBounds(presetBounds.submittedFrom, presetBounds.submittedTo);
  }

  if (range !== "any" && (submittedFrom || submittedTo)) {
    return toUtcBounds(submittedFrom, submittedTo);
  }

  return {};
}

export function getManagerSubmittedDateRange(
  range: string | undefined,
  now = new Date(),
): { submittedFrom?: string; submittedTo?: string } {
  if (range === "this_week") {
    const today = getManilaDateParts(now);
    const start = addDays(today, -getMondayOffset(today));

    return {
      submittedFrom: formatDateParts(start),
      submittedTo: formatDateParts(addDays(start, 6)),
    };
  }

  if (range === "this_month") {
    const today = getManilaDateParts(now);

    return {
      submittedFrom: formatDateParts({ ...today, day: 1 }),
      submittedTo: formatDateParts({
        ...today,
        day: daysInMonth(today.year, today.month),
      }),
    };
  }

  if (range === "this_year") {
    const today = getManilaDateParts(now);

    return {
      submittedFrom: `${today.year}-01-01`,
      submittedTo: `${today.year}-12-31`,
    };
  }

  return {};
}

function toUtcBounds(from?: string, to?: string): DateBounds {
  return {
    submittedFrom: from ? manilaDateStartUtc(from) : undefined,
    submittedTo: to ? manilaDateEndUtc(to) : undefined,
  };
}

function getManilaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: manilaTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function getMondayOffset(date: { year: number; month: number; day: number }) {
  const day = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function addDays(
  date: { year: number; month: number; day: number },
  days: number,
) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDateParts(date: { year: number; month: number; day: number }) {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

function manilaDateStartUtc(date: string) {
  return `${date}T00:00:00.000+08:00`;
}

function manilaDateEndUtc(date: string) {
  return `${date}T23:59:59.999+08:00`;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}
