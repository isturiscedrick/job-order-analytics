import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryBarChart, ChartCard, DonutChart, EmptyChart, StatusBarChart } from "./components/Charts";
import { Icon } from "./components/Icon";
import { StatusCards } from "./components/StatusCards";
import { useJobOrders } from "./hooks/useJobOrders";
import {
  UNSPECIFIED,
  categoryColors,
  categoryGroups,
  companyColors,
  dateBounds,
  fieldLabel,
  groupCounts,
  inDateRange,
  isCancelled,
  overviewCounts,
  statusColors,
  uniqueSorted,
} from "./lib/analytics";
import { fetchHealth } from "./services/api";

type Page = "dashboard" | "breakdowns" | "reports";

function pageFromPath(pathname: string): Page {
  return pathname === "/breakdowns" ? "breakdowns" : pathname === "/reports" ? "reports" : "dashboard";
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
  // The menu stays open so several values can be picked in one go.
  // It closes on outside click, Escape, or the trigger.
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
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
  const { records, state: sourceState, error: sourceError, reload } = useJobOrders();
  const [backendHealth, setBackendHealth] = useState<"checking" | "online" | "offline">("checking");

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [companyFilters, setCompanyFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));

  useEffect(() => {
    if (window.location.pathname === "/") window.history.replaceState({}, "", "/dashboard");
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (next: Page) => {
    window.history.pushState({}, "", `/${next}`);
    setPage(next); setMobileNavOpen(false); setOpenDropdown(null); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    fetchHealth()
      .then((status) => setBackendHealth(status === "ok" ? "online" : "offline"))
      .catch(() => setBackendHealth("offline"));
  }, []);

  const bounds = useMemo(() => dateBounds(customStart, customEnd), [customStart, customEnd]);
  const dateFilterActive = Boolean(customStart || customEnd);

  const dateScoped = useMemo(() => records.filter((record) => inDateRange(record, bounds)), [records, bounds]);

  const companyOptions = useMemo(() => uniqueSorted(
    dateScoped
      .filter((record) =>
        (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, UNSPECIFIED.status))) &&
        (categoryFilters.length === 0 || categoryFilters.includes(fieldLabel(record.jo_category, UNSPECIFIED.category))),
      )
      .map((record) => fieldLabel(record.req_comp, UNSPECIFIED.company)),
  ), [dateScoped, statusFilters, categoryFilters]);

  const statusOptions = useMemo(() => uniqueSorted(
    dateScoped
      .filter((record) =>
        (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, UNSPECIFIED.company))) &&
        (categoryFilters.length === 0 || categoryFilters.includes(fieldLabel(record.jo_category, UNSPECIFIED.category))),
      )
      .map((record) => fieldLabel(record.req_current_status, UNSPECIFIED.status)),
  ), [dateScoped, companyFilters, categoryFilters]);

  const categoryOptions = useMemo(() => uniqueSorted(
    dateScoped
      .filter((record) =>
        (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, UNSPECIFIED.company))) &&
        (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, UNSPECIFIED.status))),
      )
      .map((record) => fieldLabel(record.jo_category, UNSPECIFIED.category)),
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
    (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, UNSPECIFIED.company))) &&
    (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, UNSPECIFIED.status))) &&
    (categoryFilters.length === 0 || categoryFilters.includes(fieldLabel(record.jo_category, UNSPECIFIED.category))),
  ), [dateScoped, companyFilters, statusFilters, categoryFilters]);

  const nonCancelledRecords = useMemo(
    () => filteredRecords.filter((record) => !isCancelled(record)),
    [filteredRecords],
  );

  // The Overview counts follow the date range shown on that page only. The
  // company, status and category filters live on Breakdowns and do not apply here.
  const overview = useMemo(() => overviewCounts(dateScoped), [dateScoped]);

  // Colors come from the full loaded dataset so they never change with filters.
  const companyColorMap = useMemo(() => companyColors(records), [records]);
  const categoryColorMap = useMemo(() => categoryColors(records), [records]);
  const statusColorMap = useMemo(() => statusColors(records), [records]);

  const companyData = useMemo(
    () => groupCounts(nonCancelledRecords, (record) => fieldLabel(record.req_comp, UNSPECIFIED.company), companyColorMap),
    [nonCancelledRecords, companyColorMap],
  );

  // Status analysis includes every filtered record, including Cancelled.
  // Company distribution intentionally continues to use non-cancelled records.
  const statusData = useMemo(
    () => groupCounts(filteredRecords, (record) => fieldLabel(record.req_current_status, UNSPECIFIED.status), statusColorMap),
    [filteredRecords, statusColorMap],
  );

  // Category selection filters the rest of the page, but this chart keeps every
  // category in its source records (the chart hides unselected ones itself):
  // apply date, company and status filters, and leave only the category filter out.
  const categoryChartRecords = useMemo(
    () => dateScoped.filter((record) =>
      (companyFilters.length === 0 || companyFilters.includes(fieldLabel(record.req_comp, UNSPECIFIED.company))) &&
      (statusFilters.length === 0 || statusFilters.includes(fieldLabel(record.req_current_status, UNSPECIFIED.status))),
    ),
    [dateScoped, companyFilters, statusFilters],
  );

  const categoryData = useMemo(
    () => categoryGroups(categoryChartRecords, categoryColorMap),
    [categoryChartRecords, categoryColorMap],
  );

  const cancelledCount = filteredRecords.filter(isCancelled).length;
  const nonCancelledCount = filteredRecords.length - cancelledCount;
  const companyCount = new Set(filteredRecords.map((record) => fieldLabel(record.req_comp, UNSPECIFIED.company))).size;
  const hasFilters = dateFilterActive || companyFilters.length > 0 || statusFilters.length > 0 || categoryFilters.length > 0;
  const dataReady = sourceState === "ready";

  const clearDates = () => { setCustomStart(""); setCustomEnd(""); };

  const resetFilters = () => {
    clearDates();
    setCompanyFilters([]);
    setStatusFilters([]);
    setCategoryFilters([]);
    setOpenDropdown(null);
  };

  const selectCompany = (label: string) => setCompanyFilters((current) => current.length === 1 && current[0] === label ? [] : [label]);
  const selectStatus = (label: string) => setStatusFilters((current) => current.length === 1 && current[0] === label ? [] : [label]);
  const selectCategory = (label: string) => setCategoryFilters((current) => current.length === 1 && current[0] === label ? [] : [label]);

  const chartEmptyTitle = !dataReady ? "Your analytics will appear here" : "No matching job orders";
  const chartEmptyDescription = !dataReady
    ? "Load job-order records from the configured backend to populate this visualization."
    : "Try widening the date range or clearing one or more filters.";

  const pageTitle = page === "dashboard" ? "Overview" : page === "breakdowns" ? "Breakdowns" : "Reports";

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
            <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><strong>{pageTitle}</strong></div>
          </div>
          <div className="topbar__right">
            <span className={`topbar-status topbar-status--${sourceState}`}><i />{sourceState === "ready" ? "Data connected" : sourceState === "loading" ? "Loading data" : "Data source issue"}</span>
            <div className="avatar" aria-label="Workspace account">JA</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="page-kicker"><span className="page-kicker__line" /> JOB ORDER INTELLIGENCE</div>
              <h1>{page === "dashboard" ? "Job Order Overview" : page === "breakdowns" ? "Job Order Breakdowns" : "Job Order Reports"}<span>.</span></h1>
              <p>{page === "dashboard" ? "See how many job orders are waiting for approval, active, or closed." : page === "breakdowns" ? "Explore detailed combinations across companies, statuses, and categories." : "Review and export the current job order distribution."}</p>
            </div>
            {page === "dashboard" ? <div className="overview-date-range">
              <label><span>From</span><input aria-label="Overview start date" type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} /></label>
              <label><span>To</span><input aria-label="Overview end date" type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} /></label>
              {dateFilterActive ? <button type="button" onClick={clearDates}>Clear</button> : null}
            </div> : null}
          </section>

          {sourceState === "error" ? (
            <section className="source-notice source-notice--error" id="data-source">
              <div className="source-notice__icon"><Icon name="activity" size={21} /></div>
              <div className="source-notice__copy">
                <strong>Could not load job-order data</strong>
                <p>{sourceError}</p>
              </div>
              <button type="button" className="button button--secondary" onClick={reload}>Retry</button>
            </section>
          ) : null}

          {page === "breakdowns" ? <section className="filter-section" aria-label="Dashboard filters">
            <div className="filter-section__top">
              <div className="filter-heading"><div className="filter-heading__icon"><Icon name="filter" size={17} /></div><div><strong>Filters</strong><span>Refine your dashboard view</span></div></div>
              <button type="button" className="mobile-filter-toggle" onClick={() => setFiltersOpen((value) => !value)}><Icon name="filter" size={16} /> Filters {hasFilters ? <b>{[companyFilters, statusFilters, categoryFilters].reduce((sum, values) => sum + values.length, dateFilterActive ? 1 : 0)}</b> : null}</button>
              <button type="button" className="clear-filters" onClick={resetFilters} disabled={!hasFilters}>Reset filters <span>↺</span></button>
            </div>
            <div className={`filter-controls ${filtersOpen ? "filter-controls--open" : ""}`}>
              <div className="custom-date-range date-range-picker">
                <label><span>Start date</span><input aria-label="Start date" type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} /></label>
                <label><span>End date</span><input aria-label="End date" type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} /></label>
                {dateFilterActive ? <button type="button" className="date-clear" onClick={clearDates}>Clear dates</button> : null}
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
                {dateFilterActive ? <span className="filter-chip">{`${customStart || "Any"} to ${customEnd || "Any"}`}</span> : null}
              </div>
            ) : null}
          </section> : null}

          {page === "reports" ? <section className="metrics-grid" aria-label="Job order key performance indicators">
            <MetricCard title="Total job orders" value={dataReady ? filteredRecords.length : null} detail="All statuses in selection" icon="orders" tone="metric-card__icon--purple" />
            <MetricCard title="Non-cancelled orders" value={dataReady ? nonCancelledCount : null} detail="Excludes cancelled records" icon="check" tone="metric-card__icon--green" />
            <MetricCard title="Cancelled orders" value={dataReady ? cancelledCount : null} detail="Cancelled status only" icon="ban" tone="metric-card__icon--rose" />
            <MetricCard title="Companies" value={dataReady ? companyCount : null} detail="Distinct companies in selection" icon="building" tone="metric-card__icon--amber" />
          </section> : null}

          {page === "dashboard" ? <section className="analytics-section" id="overview">
            <div className="section-heading">
              <div><span className="eyebrow">JOB ORDER STATUS</span><h2>Where job orders stand</h2><p>Counts for the selected date range. Charts and filters are on Breakdowns.</p></div>
              <div className="record-count"><span className="record-count__dot" />{dataReady ? `${overview.total.toLocaleString()} records` : "Awaiting data"}</div>
            </div>
            <StatusCards counts={dataReady ? overview : null} />
            <p className="analytics-note"><span>i</span> Each count reads its own field, so one job order can appear in more than one card.</p>
          </section> : null}

          {page === "breakdowns" ? <section className="analytics-section" id="analytics">
            <div className="section-heading">
              <div className="record-count"><span className="record-count__dot" />{dataReady ? `${filteredRecords.length.toLocaleString()} records` : "Awaiting data"}</div>
            </div>

            <div className="charts-grid">
              <ChartCard title="Job orders per company" description="Share of non-cancelled job orders by requesting company." action="DISTRIBUTION">
                {!dataReady ? <div className="chart-skeleton"><i /><i /><i /></div> : companyData.length > 0 ? <DonutChart data={companyData} total={companyData.reduce((sum, item) => sum + item.value, 0)} onSelect={selectCompany} /> : <EmptyChart title={chartEmptyTitle} description={chartEmptyDescription} />}
              </ChartCard>

              <ChartCard title="Job Orders by Status" description="Compare all filtered job orders by current status, including cancelled orders." action="STATUS MIX">
                {!dataReady ? <div className="chart-skeleton chart-skeleton--bars"><i /><i /><i /><i /></div> : statusData.length > 0 ? <StatusBarChart data={statusData} onSelect={selectStatus} /> : <EmptyChart title={chartEmptyTitle} description={chartEmptyDescription} />}
              </ChartCard>

              <div className="charts-grid__wide">
                <ChartCard title="Job Orders by Category" description="Compare job orders by category for each company. Cancelled records remain included." action="CATEGORY MIX">
                  {!dataReady ? <div className="chart-skeleton chart-skeleton--bars"><i /><i /><i /><i /></div> : categoryData.length > 0 ? <CategoryBarChart groups={categoryData} selectedCategories={categoryFilters} selectedCompanies={companyFilters} onSelectCategory={selectCategory} onSelectCompany={selectCompany} /> : <EmptyChart title={chartEmptyTitle} description={chartEmptyDescription} />}
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
              {dataReady && companyData.length === 0 ? <tr><td colSpan={3}>No report data is available.</td></tr> : null}
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