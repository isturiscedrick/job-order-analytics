import type {
  CategoryBarGroup,
  ChartDatum,
  DateBounds,
  JobOrderRecord,
  OverviewCounts,
} from "../types/job-order";

export const UNSPECIFIED = {
  company: "Unspecified company",
  status: "Unspecified status",
  category: "Unspecified category",
} as const;

export const companyPalette = ["#548FC4", "#E79A25", "#7B623D", "#9C83D8", "#6D9B86", "#D77D61", "#7B83BD", "#C78BA8"];
export const statusPalette = ["#548FC4", "#6D9B86", "#E79A25", "#D66B68", "#8A79BC", "#7B83BD", "#8B929B"];
const FALLBACK_COLOR = "#8B929B";
const CANCELLED_COLOR = "#D64545";

// Business order for the category chart. Categories the API returns that are
// not listed here follow in alphabetical order, so a new category appears
// without a code change. To pin a new category's position, add it here.
export const CATEGORY_ORDER: readonly string[] = [
  "Motorpool",
  "For Branch Visit",
  "Tie Up Shop",
  "Refurbish MC",
];

// ---------------------------------------------------------------- dates

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoDate = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
}

export function dateBounds(start: string, end: string): DateBounds {
  return { start: start || null, end: end || null };
}

// Records with a missing or unreadable req_date are excluded only when a bound is set.
export function inDateRange(record: JobOrderRecord, bounds: DateBounds): boolean {
  if (!bounds.start && !bounds.end) return true;
  const key = parseDateKey(record.req_date);
  if (!key) return false;
  if (bounds.start && key < bounds.start) return false;
  if (bounds.end && key > bounds.end) return false;
  return true;
}

// -------------------------------------------------------------- records

export function fieldLabel(value: string | null, fallback: string): string {
  return value?.trim() || fallback;
}

function equalsIgnoreCase(value: string | null, expected: string): boolean {
  return (value ?? "").trim().toLocaleLowerCase() === expected.toLocaleLowerCase();
}

export function isCancelled(record: JobOrderRecord): boolean {
  return equalsIgnoreCase(record.req_current_status, "Cancelled");
}

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

// Each count reads its own field, so one job order can be counted in more than one.
export function overviewCounts(records: JobOrderRecord[]): OverviewCounts {
  let forApproval = 0;
  let active = 0;
  let closed = 0;
  records.forEach((record) => {
    if (equalsIgnoreCase(record.req_current_status, "For Approval")) forApproval += 1;
    if (equalsIgnoreCase(record.accept_status, "Approved")) active += 1;
    if (equalsIgnoreCase(record.jo_closed_status, "Closed")) closed += 1;
  });
  return { total: records.length, forApproval, active, closed };
}

// --------------------------------------------------------------- colors

// Colors are assigned from the alphabetical list of every label in the loaded
// data, not the filtered view, so a company or status keeps its color in every
// chart and under every filter.
function colorMap(labels: string[], palette: string[], cancelledRed = false): Map<string, string> {
  return new Map(
    uniqueSorted(labels).map((label, index) => [
      label,
      cancelledRed && label.trim().toLocaleLowerCase() === "cancelled" ? CANCELLED_COLOR : palette[index % palette.length],
    ]),
  );
}

export function companyColors(records: JobOrderRecord[]): Map<string, string> {
  return colorMap(records.map((record) => fieldLabel(record.req_comp, UNSPECIFIED.company)), companyPalette);
}

export function statusColors(records: JobOrderRecord[]): Map<string, string> {
  return colorMap(records.map((record) => fieldLabel(record.req_current_status, UNSPECIFIED.status)), statusPalette, true);
}

// ---------------------------------------------------------------- groups

export function groupCounts(
  records: JobOrderRecord[],
  getLabel: (record: JobOrderRecord) => string,
  colors: Map<string, string>,
): ChartDatum[] {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const label = getLabel(record);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value, color: colors.get(label) ?? FALLBACK_COLOR }))
    .sort((a, b) => b.value - a.value);
}

export const categoryPalette = ["#E79A25", "#6D9B86", "#D77D61", "#7B83BD", "#548FC4", "#9C83D8", "#C78BA8", "#8B929B"];

// Known categories first, in business order, then any others alphabetically.
export function orderedCategories(records: JobOrderRecord[]): string[] {
  const found = uniqueSorted(records.map((record) => fieldLabel(record.jo_category, UNSPECIFIED.category)));
  return [...CATEGORY_ORDER, ...found.filter((category) => !CATEGORY_ORDER.includes(category))];
}

export function categoryColors(records: JobOrderRecord[]): Map<string, string> {
  return new Map(orderedCategories(records).map((category, index) => [category, categoryPalette[index % categoryPalette.length]]));
}

// One group per company, one bar per category inside it. Every group lists the
// same categories in the same order, including zeros, so bars line up and
// compare across companies. Largest company first.
export function categoryGroups(records: JobOrderRecord[], colors: Map<string, string>): CategoryBarGroup[] {
  if (records.length === 0) return [];

  const counts = new Map<string, Map<string, number>>();
  records.forEach((record) => {
    const company = fieldLabel(record.req_comp, UNSPECIFIED.company);
    const category = fieldLabel(record.jo_category, UNSPECIFIED.category);
    const byCategory = counts.get(company) ?? new Map<string, number>();
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
    counts.set(company, byCategory);
  });

  const categories = orderedCategories(records);
  return Array.from(counts.entries())
    .map(([company, byCategory]) => {
      const bars = categories.map((category) => ({
        category,
        value: byCategory.get(category) ?? 0,
        color: colors.get(category) ?? FALLBACK_COLOR,
      }));
      return { company, total: bars.reduce((sum, bar) => sum + bar.value, 0), bars };
    })
    .sort((a, b) => b.total - a.total || a.company.localeCompare(b.company));
}