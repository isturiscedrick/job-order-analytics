import { useEffect, useMemo, useRef, useState } from "react";
import { ChartCard, DonutChart, EmptyChart, StackedBarChart, StatusBarChart } from "./components/Charts";
import { fetchHealth, fetchJobOrders } from "./services/api";
import type {
  ChartDatum,
  DateBounds,
  DatePreset,
  JobOrderRecord,
  StackedChartGroup,
  StackedChartSegment,
} from "./types/job-order";

type SourceState = "loading" | "ready" | "error";

const companyPalette = ["#548FC4", "#E79A25", "#7B623D", "#9C83D8", "#6D9B86", "#D77D61", "#7B83BD", "#C78BA8"];
const statusPalette = ["#548FC4", "#6D9B86", "#E79A25", "#D66B68", "#8A79BC", "#7B83BD", "#8B929B"];
const categoryPalette = ["#548FC4", "#E79A25", "#7B623D", "#9C83D8", "#6D9B86", "#D77D61", "#7B83BD", "#8B929B"];


function iconPath(name: string) {
  switch (name) {
    case "grid":
      return <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>;
    case "orders":
      return <><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" /><path d="M14 3.5V8h4M8.5 12h7M8.5 16h7" /></>;
    case "company":
      return <><rect x="3.5" y="7" width="17" height="14" rx="1.5" /><path d="M8 7V4h8v3M8 11v2m4-2v2m4-2v2M8 17v4m8-4v4" /></>;
    case "calendar":
      return <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></>;
    case "filter":
      return <><path d="M4 5h16M7 12h10m-7 7h4" /><circle cx="8" cy="5" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /></>;
    case "check":
      return <><path d="m5 12 4.2 4.2L19 6.5" /></>;
    case "ban":
      return <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>;
    case "building":
      return <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3" /></>;
    case "menu":
      return <><path d="M4 6h16M4 12h16M4 18h16" /></>;
    case "chevron":
      return <path d="m9 18 6-6-6-6" />;
    case "activity":
      return <><path d="M3 12h4l3-7 4 14 3-7h4" /></>;
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPath(name)}
    </svg>
  );
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const isoDate = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : localDateKey(parsed);
}

function dateBounds(preset: DatePreset, start: string, end: string): DateBounds {
  const today = new Date();
  const todayKey = localDateKey(today);
  const subtractDays = (days: number) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    date.setDate(date.getDate() - days);
    return localDateKey(date);
  };

  switch (preset) {
    case "today":
      return { start: todayKey, end: todayKey };
    case "last7":
      return { start: subtractDays(6), end: todayKey };
    case "last30":
      return { start: subtractDays(29), end: todayKey };
    case "thisMonth":
      return { start: localDateKey(new Date(today.getFullYear(), today.getMonth(), 1)), end: todayKey };
    case "lastMonth": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: localDateKey(first), end: localDateKey(last) };
    }
    case "custom":
      return { start: start || null, end: end || null };
    default:
      return { start: null, end: null };
  }
}

function fieldLabel(value: string | null, fallback: string): string {
  return value?.trim() || fallback;
}

function isCancelled(record: JobOrderRecord): boolean {
  return (record.req_current_status ?? "").trim().toLocaleLowerCase() === "cancelled";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function groupCounts(
  records: JobOrderRecord[],
  getLabel: (record: JobOrderRecord) => string,
  palette: string[],
): ChartDatum[] {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const label = getLabel(record);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  // Assign colors by a stable alphabetical order so separate companies never
  // collide simply because their label hashes map to the same palette index.
  const colorByLabel = new Map(
    uniqueSorted(Array.from(counts.keys())).map((label, index) => [
      label,
      palette[index % palette.length],
    ]),
  );

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value, color: colorByLabel.get(label) ?? palette[0] }))
    .sort((a, b) => b.value - a.value);
}

// Canonical category sequence and colors are independent of API order,
// record counts, and active filters. Keep these mappings stable for comparisons.
const CATEGORY_ORDER = [
  "Motorpool",
  "For Branch Visit",
  "Tie Up Shop",
  "Refurbish MC",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Motorpool": "#E79A25",
  "For Branch Visit": "#6D9B86",
  "Tie Up Shop": "#D77D61",
  "Refurbish MC": "#7B83BD",
};

function groupedSegments(
  records: JobOrderRecord[],
  groupField: (record: JobOrderRecord) => string,
  segmentField: (record: JobOrderRecord) => string,
): StackedChartGroup[] {
  const groups = new Map<string, Map<string, number>>();
  records.forEach((record) => {
    const group = groupField(record);
    const segment = segmentField(record);
    const segmentCounts = groups.get(group) ?? new Map<string, number>();
    segmentCounts.set(segment, (segmentCounts.get(segment) ?? 0) + 1);
    groups.set(group, segmentCounts);
  });

  // Keep the known business categories first in the same order for every
  // company. Any additional API categories follow in a stable alphabetical
  // order, never by count or API/object insertion order.
  const discoveredCategories = uniqueSorted(
    Array.from(groups.values()).flatMap((counts) => Array.from(counts.keys())),
  );
  const orderedCategories = [
    ...CATEGORY_ORDER,
    ...discoveredCategories.filter(
      (category) => !CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]),
    ),
  ];

  return Array.from(groups.entries())
    .map(([label, counts]) => {
      const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
      const segments: StackedChartSegment[] = orderedCategories.map((category, index) => {
        const value = counts.get(category) ?? 0;
        return {
          label: category,
          value,
          color: CATEGORY_COLORS[category] ?? categoryPalette[index % categoryPalette.length],
          percentage: total > 0 ? (value / total) * 100 : 0,
        };
      });
      return { label, total, segments };
    })
    .sort((a, b) => b.total - a.total);
}

function FilterDropdown({ title, options, selected, onChange, open, onOpenChange }: {
  title: string; options: string[]; selected: string[]; onChange: (next: string[]) => void;
  open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onOpenChange(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open, onOpenChange]);
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
    onOpenChange(false);
  };
  return <div ref={root} className={"filter-dropdown " + (open ? "filter-dropdown--open" : "")}>
    <button type="button" className="filter-dropdown__trigger" aria-expanded={open} onClick={() => onOpenChange(!open)}>
      <span>{title}</span>{selected.length ? <b>{selected.length}</b> : null}<Icon name="chevron" size={15}/>
    </button>
    {open ? <div className="filter-dropdown__menu">
      {options.length === 0 ? <p className="filter-dropdown__empty">No available options</p> : options.map(option =>
        <label className="filter-option" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)}/><span>{option}</span></label>)}
    </div> : null}
  </div>;
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string;
  value: number | null;
  detail: string;
  icon: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-card__icon ${tone}`}>
        <Icon name={icon} size={21} />
      </div>
      <div className="metric-card__copy">
        <span>{title}</span>
        {value === null ? <><i className="skeleton skeleton--metric" /><i className="skeleton skeleton--caption" /></> : <><strong>{value.toLocaleString()}</strong><small>{detail}</small></>}
      </div>
      <span className="metric-card__spark" aria-hidden="true">
        <Icon name="activity" size={29} />
      </span>
    </article>
  );
}

function App() {
  const [records, setRecords] = useState<JobOrderRecord[]>([]);
  const [sourceState, setSourceState] = useState<SourceState>("loading");
  const [sourceError, setSourceError] = useState("");
  const [backendHealth, setBackendHealth] = useState<"checking" | "online" | "offline">("checking");

  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [companyFilters, setCompanyFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [page, setPage] = useState(() => window.location.pathname === "/breakdowns" ? "breakdowns" : window.location.pathname === "/reports" ? "reports" : "dashboard");

  useEffect(() => {
    if (window.location.pathname === "/") window.history.replaceState({}, "", "/dashboard");
    const onPopState = () => setPage(window.location.pathname === "/breakdowns" ? "breakdowns" : window.location.pathname === "/reports" ? "reports" : "dashboard");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (next: "dashboard" | "breakdowns" | "reports") => {
    window.history.pushState({}, "", next === "dashboard" ? "/dashboard" : next === "breakdowns" ? "/breakdowns" : "/reports");
    setPage(next); setMobileNavOpen(false); setOpenDropdown(null); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const controller = new AbortController();

    fetchHealth()
      .then((status) => setBackendHealth(status === "ok" ? "online" : "offline"))
      .catch(() => setBackendHealth("offline"));

    setSourceState("loading");
    fetchJobOrders(controller.signal)
      .then((data) => {
        setRecords(data);
        setSourceState("ready");
        setSourceError("");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSourceState("error");
        setSourceError(error instanceof Error ? error.message : "Unable to load job-order records.");
      });

    return () => controller.abort();
  }, []);

  const bounds = useMemo(
    () => dateBounds(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd],
  );

  const matchesDate = (record: JobOrderRecord) => {
    if (!bounds.start && !bounds.end) return true;
    const key = parseDateKey(record.req_date);
    if (!key) return false;
    if (bounds.start && key < bounds.start) return false;
    if (bounds.end && key > bounds.end) return false;
    return true;
  };

  const dateScoped = useMemo(() => records.filter(matchesDate), [records, bounds.start, bounds.end]);

  const companyOptions = useMemo(() => uniqueSorted(
    dateScoped
      .filter((record) =>
        (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, "Unspecified status"))) &&
        (categoryFilters.length === 0 || categoryFilters.includes(fieldLabel(record.jo_category, "Unspecified category"))),
      )
      .map((record) => fieldLabel(record.req_comp, "Unspecified company")),
  ), [dateScoped, statusFilters, categoryFilters]);

  const statusOptions = useMemo(() => uniqueSorted(
    dateScoped
      .filter((record) =>
        (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, "Unspecified company"))) &&
        (categoryFilters.length === 0 || categoryFilters.includes(fieldLabel(record.jo_category, "Unspecified category"))),
      )
      .map((record) => fieldLabel(record.req_current_status, "Unspecified status")),
  ), [dateScoped, companyFilters, categoryFilters]);

  const categoryOptions = useMemo(() => uniqueSorted(
    dateScoped
      .filter((record) =>
        (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, "Unspecified company"))) &&
        (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, "Unspecified status"))),
      )
      .map((record) => fieldLabel(record.jo_category, "Unspecified category")),
  ), [dateScoped, companyFilters, statusFilters]);

  // Keep selected values aligned with the currently available dataset.
  // This prevents stale selections after changing dates or another dimension.
  useEffect(() => {
    setCompanyFilters((current) => {
      const next = current.filter((value) => companyOptions.includes(value));
      return next.length === current.length ? current : next;
    });
  }, [companyOptions]);

  useEffect(() => {
    setStatusFilters((current) => {
      const next = current.filter((value) => statusOptions.includes(value));
      return next.length === current.length ? current : next;
    });
  }, [statusOptions]);

  useEffect(() => {
    setCategoryFilters((current) => {
      const next = current.filter((value) => categoryOptions.includes(value));
      return next.length === current.length ? current : next;
    });
  }, [categoryOptions]);

  const filteredRecords = useMemo(() => dateScoped.filter((record) =>
    (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, "Unspecified company"))) &&
    (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, "Unspecified status"))) &&
    (categoryFilters.length === 0 || categoryFilters.includes(fieldLabel(record.jo_category, "Unspecified category"))),
  ), [dateScoped, companyFilters, statusFilters, categoryFilters]);

  const nonCancelledRecords = useMemo(
    () => filteredRecords.filter((record) => !isCancelled(record)),
    [filteredRecords],
  );

  const companyData = useMemo(
    () => groupCounts(nonCancelledRecords, (record) => fieldLabel(record.req_comp, "Unspecified company"), companyPalette),
    [nonCancelledRecords],
  );

  // Status analysis includes every filtered record, including Cancelled.
  // Company distribution intentionally continues to use non-cancelled records.
  const statusData = useMemo(
    () => groupCounts(
      filteredRecords,
      (record) => fieldLabel(record.req_current_status, "Unspecified status"),
      statusPalette,
    ),
    [filteredRecords],
  );

  const categoryData = useMemo(
    () => groupedSegments(
      filteredRecords,
      (record) => fieldLabel(record.req_comp, "Unspecified company"),
      (record) => fieldLabel(record.jo_category, "Unspecified category"),
    ),
    [filteredRecords],
  );

  const cancelledCount = filteredRecords.filter(isCancelled).length;
  const nonCancelledCount = filteredRecords.length - cancelledCount;
  const companyCount = new Set(filteredRecords.map((record) => fieldLabel(record.req_comp, "Unspecified company"))).size;
  const hasFilters = datePreset !== "all" || companyFilters.length > 0 || statusFilters.length > 0 || categoryFilters.length > 0;
  const dataReady = sourceState === "ready";

  const resetFilters = () => {
    setDatePreset("all");
    setCustomStart("");
    setCustomEnd("");
    setCompanyFilters([]);
    setStatusFilters([]);
    setCategoryFilters([]);
    setOpenDropdown(null);
  };

  const retryLoad = () => {
    setSourceState("loading");
    setSourceError("");
    fetchJobOrders()
      .then((data) => {
        setRecords(data);
        setSourceState("ready");
      })
      .catch((error: unknown) => {
        setSourceState("error");
        setSourceError(error instanceof Error ? error.message : "Unable to load job-order records.");
      });
  };

  const selectCompany = (label: string) => setCompanyFilters((current) => current.length === 1 && current[0] === label ? [] : [label]);
  const selectStatus = (label: string) => setStatusFilters((current) => current.length === 1 && current[0] === label ? [] : [label]);
  const selectCategory = (label: string) => setCategoryFilters((current) => current.length === 1 && current[0] === label ? [] : [label]);

  const chartEmptyTitle = !dataReady ? "Your analytics will appear here" : "No matching job orders";
  const chartEmptyDescription = !dataReady
    ? "Load job-order records from the configured backend to populate this visualization."
    : "Try widening the date range or clearing one or more filters.";

  return (
    <div className="app-shell">
      {mobileNavOpen ? <button type="button" className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} /> : null}
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${mobileNavOpen ? "sidebar--mobile-open" : ""}`}>
        <div className="sidebar__brand">
          <div className="brand-mark"><span /><span /><span /></div>
          {!collapsed ? <div className="brand-copy"><strong>JOB<span> INSIGHT</span></strong><small>OPERATIONS ANALYTICS</small></div> : null}
          <button type="button" className="sidebar__collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <Icon name="chevron" size={16} />
          </button>
        </div>

        <div className="sidebar__section-label">{!collapsed ? "WORKSPACE" : " "}</div>
        <nav className="sidebar-nav">
          <button type="button" className={"sidebar-nav__item " + (page === "dashboard" ? "is-active" : "")} title="Overview" onClick={() => navigate("dashboard")}><Icon name="grid" />{!collapsed ? <span>Overview</span> : null}<i /></button>
          <button type="button" className={"sidebar-nav__item " + (page === "breakdowns" ? "is-active" : "")} title="Breakdowns" onClick={() => navigate("breakdowns")}><Icon name="orders" />{!collapsed ? <span>Breakdowns</span> : null}<i /></button>
          <button type="button" className={"sidebar-nav__item " + (page === "reports" ? "is-active" : "")} title="Reports" onClick={() => navigate("reports")}><Icon name="activity" />{!collapsed ? <span>Reports</span> : null}<i /></button>
        </nav>

        <div className="sidebar__bottom">
          <div className={`connection-card ${collapsed ? "connection-card--compact" : ""}`}>
            <span className={`connection-dot connection-dot--${backendHealth}`} />
            {!collapsed ? (
              <div><strong>API connection</strong><small>{backendHealth === "online" ? "Backend available" : backendHealth === "checking" ? "Checking backend…" : "Backend unavailable"}</small></div>
            ) : null}
          </div>
          {!collapsed ? <div className="sidebar-footer"><span>Job Order Insight</span><span>v0.1</span></div> : null}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar__left">
            <button type="button" className="mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
            <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><strong>{page === "dashboard" ? "Overview" : page === "breakdowns" ? "Breakdowns" : "Reports"}</strong></div>
          </div>
          <div className="topbar__right">
            <span className={`topbar-status topbar-status--${sourceState}`}><i />{sourceState === "ready" ? "Data connected" : sourceState === "loading" ? "Loading data" : sourceState === "error" ? "Data source issue" : "Data source not set"}</span>
            <div className="avatar" aria-label="Workspace account">JA</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="page-kicker"><span className="page-kicker__line" /> JOB ORDER INTELLIGENCE</div>
              <h1>{page === "dashboard" ? "Job Order Overview" : page === "breakdowns" ? "Job Order Breakdowns" : "Job Order Reports"}<span>.</span></h1>
              <p>{page === "dashboard" ? "A high-level view of job order activity and operational status." : page === "breakdowns" ? "Explore detailed combinations across companies, statuses, and categories." : "Review and export the current job order distribution."}</p>
            </div>
            {page === "dashboard" ? <div className="overview-date-range">
  <label><span>From</span><input aria-label="Overview start date" type="date" value={customStart} max={customEnd || undefined} onChange={(event) => { setCustomStart(event.target.value); setDatePreset(event.target.value || customEnd ? "custom" : "all"); }} /></label>
  <label><span>To</span><input aria-label="Overview end date" type="date" value={customEnd} min={customStart || undefined} onChange={(event) => { setCustomEnd(event.target.value); setDatePreset(event.target.value || customStart ? "custom" : "all"); }} /></label>
  {(customStart || customEnd) ? <button type="button" onClick={() => { setCustomStart(""); setCustomEnd(""); setDatePreset("all"); }}>Clear</button> : null}
</div> : null}
          </section>

          {sourceState === "error" ? (
            <section className={`source-notice ${sourceState === "error" ? "source-notice--error" : ""}`} id="data-source">
              <div className="source-notice__icon"><Icon name="activity" size={21} /></div>
              <div className="source-notice__copy">
                <strong>{sourceState === "error" ? "Could not load job-order data" : "Connect your job-order data source"}</strong>
                <p>{sourceState === "error" ? sourceError : "Check the backend API configuration and connection, then retry. No fabricated metrics are displayed."}</p>
                
              </div>
              {sourceState === "error" ? <button type="button" className="button button--secondary" onClick={retryLoad}>Retry</button> : null}
            </section>
          ) : null}

          {page === "breakdowns" ? <section className="filter-section" aria-label="Dashboard filters">
            <div className="filter-section__top">
              <div className="filter-heading"><div className="filter-heading__icon"><Icon name="filter" size={17} /></div><div><strong>Filters</strong><span>Refine your dashboard view</span></div></div>
              <button type="button" className="mobile-filter-toggle" onClick={() => setFiltersOpen((value) => !value)}><Icon name="filter" size={16} /> Filters {hasFilters ? <b>{[companyFilters, statusFilters, categoryFilters].reduce((sum, values) => sum + values.length, datePreset !== "all" ? 1 : 0)}</b> : null}</button>
              <button type="button" className="clear-filters" onClick={resetFilters} disabled={!hasFilters}>Reset filters <span>↺</span></button>
            </div>
            <div className={`filter-controls ${filtersOpen ? "filter-controls--open" : ""}`}>
              <div className="custom-date-range date-range-picker">
                <label><span>Start date</span><input aria-label="Start date" type="date" value={customStart} max={customEnd || undefined} onChange={(event) => { setCustomStart(event.target.value); setDatePreset(event.target.value || customEnd ? "custom" : "all"); }} /></label>
                <label><span>End date</span><input aria-label="End date" type="date" value={customEnd} min={customStart || undefined} onChange={(event) => { setCustomEnd(event.target.value); setDatePreset(event.target.value || customStart ? "custom" : "all"); }} /></label>
                {(customStart || customEnd) ? <button type="button" className="date-clear" onClick={() => { setCustomStart(""); setCustomEnd(""); setDatePreset("all"); }}>Clear dates</button> : null}
              </div>
              <FilterDropdown title="Company" options={companyOptions} selected={companyFilters} onChange={setCompanyFilters} open={openDropdown === "company"} onOpenChange={(value) => setOpenDropdown(value ? "company" : null)} />
              <FilterDropdown title="Status" options={statusOptions} selected={statusFilters} onChange={setStatusFilters} open={openDropdown === "status"} onOpenChange={(value) => setOpenDropdown(value ? "status" : null)} />
              <FilterDropdown title="Job Order category" options={categoryOptions} selected={categoryFilters} onChange={setCategoryFilters} open={openDropdown === "category"} onOpenChange={(value) => setOpenDropdown(value ? "category" : null)} />
            </div>
            {hasFilters ? (
              <div className="active-filter-summary">
                <span>Active filters</span>
                {[...companyFilters, ...statusFilters, ...categoryFilters].map((label, index) => (
                  <span className="filter-chip" key={`${label}-${index}`}>{label}</span>
                ))}
                {datePreset !== "all" ? <span className="filter-chip">{datePreset === "custom" ? "Custom dates" : datePreset === "last7" ? "Last 7 days" : datePreset === "last30" ? "Last 30 days" : datePreset === "thisMonth" ? "This month" : datePreset === "lastMonth" ? "Last month" : "Today"}</span> : null}
              </div>
            ) : null}
          </section> : null}

          {page !== "breakdowns" ? <section className="metrics-grid" aria-label="Job order key performance indicators">
            <MetricCard title="Total job orders" value={dataReady ? filteredRecords.length : null} detail="All statuses in selection" icon="orders" tone="metric-card__icon--purple" />
            <MetricCard title="Non-cancelled orders" value={dataReady ? nonCancelledCount : null} detail="Excludes cancelled records" icon="check" tone="metric-card__icon--green" />
            <MetricCard title="Cancelled orders" value={dataReady ? cancelledCount : null} detail="Cancelled status only" icon="ban" tone="metric-card__icon--rose" />
            <MetricCard title="Companies" value={dataReady ? companyCount : null} detail="Distinct companies in selection" icon="building" tone="metric-card__icon--amber" />
          </section> : null}

          {page !== "reports" ? <section className="analytics-section" id="analytics">
            <div className="section-heading">
              <div><span className="eyebrow">DATA VISUALIZATION</span><h2>{page === "dashboard" ? "Fleet activity at a glance" : "Job order breakdown"}</h2><p>Explore how work is distributed across companies, statuses, and categories.</p></div>
              <div className="record-count"><span className="record-count__dot" />{dataReady ? `${filteredRecords.length.toLocaleString()} records` : "Awaiting data"}</div>
            </div>

            <div className="charts-grid">
              <ChartCard title="Job orders per company" description="Share of non-cancelled job orders by requesting company." action="DISTRIBUTION">
                {!dataReady ? <div className="chart-skeleton"><i /><i /><i /></div> : companyData.length > 0 ? <DonutChart data={companyData} total={companyData.reduce((sum, item) => sum + item.value, 0)} onSelect={(label) => { selectCompany(label); if (page === "dashboard") navigate("breakdowns"); }} /> : <EmptyChart title={chartEmptyTitle} description={chartEmptyDescription} />}
              </ChartCard>

              <ChartCard title="Job Orders by Status" description="Compare all filtered job orders by current status, including cancelled orders." action="STATUS MIX">
                {!dataReady ? <div className="chart-skeleton chart-skeleton--bars"><i /><i /><i /><i /></div> : statusData.length > 0 ? <StatusBarChart data={statusData} onSelect={(label) => { selectStatus(label); if (page === "dashboard") navigate("breakdowns"); }} /> : <EmptyChart title={chartEmptyTitle} description={chartEmptyDescription} />}
              </ChartCard>

              <div className="charts-grid__wide">
                <ChartCard title="Job Orders by Category" description="Compare total job orders and category composition for each company. Cancelled records remain included." action="CATEGORY MIX">
                  {!dataReady ? <div className="chart-skeleton chart-skeleton--bars"><i /><i /><i /><i /></div> : categoryData.length > 0 ? <StackedBarChart groups={categoryData} onSelect={(label) => { selectCategory(label); if (page === "dashboard") navigate("breakdowns"); }} /> : <EmptyChart title={chartEmptyTitle} description={chartEmptyDescription} />}
                </ChartCard>
              </div>
            </div>
            <p className="analytics-note"><span>i</span> Status and category analysis include all filtered job orders, including cancelled records. Company distribution intentionally excludes cancelled job orders.</p>
          </section> : null}

          {page === "reports" ? <section className="analytics-section reports-section">
            <div className="section-heading"><div><span className="eyebrow">EXPORTABLE SUMMARY</span><h2>Company distribution report</h2><p>Aggregated non-cancelled job orders in the current dataset.</p></div>
              <button type="button" className="button button--primary" onClick={() => {
                const rows = [["Company", "Non-cancelled job orders"], ...companyData.map(item => [item.label, String(item.value)])];
                const csv = rows.map(row => row.map(value => '"' + value.replace(/"/g, '""') + '"').join(",")).join("\r\n");
                const link = document.createElement("a"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
                link.href = url; link.download = "job-order-distribution.csv"; link.click(); URL.revokeObjectURL(url);
              }}>Export CSV</button>
            </div>
            <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Company</th><th>Non-cancelled job orders</th><th>Share</th></tr></thead><tbody>
              {!dataReady ? Array.from({ length: 5 }, (_, index) => <tr key={index}><td colSpan={3}><i className="skeleton skeleton--table" /></td></tr>) : companyData.map(item => <tr key={item.label}><td>{item.label}</td><td>{item.value.toLocaleString()}</td><td>{((item.value / Math.max(1, nonCancelledCount)) * 100).toFixed(1)}%</td></tr>)}
              {companyData.length === 0 ? <tr><td colSpan={3}>No report data is available.</td></tr> : null}
            </tbody></table></div>
          </section> : null}

          <footer className="page-footer">
            <span>Job Order Insight <span>·</span> Job Order Analytics</span>
            <span>Metrics reflect the selected filters and connected records.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
