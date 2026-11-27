import { useState } from "react";
import type {
  CategoryBarGroup,
  ChartDatum,
} from "../types/job-order";

interface ChartCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: string;
  children: React.ReactNode;
}

export function ChartCard({
  eyebrow = "ANALYTICS",
  title,
  description,
  action,
  children,
}: ChartCardProps) {
  return (
    <section className="chart-card">
      <div className="chart-card__header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action ? <span className="chart-card__action">{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

interface EmptyChartProps {
  title: string;
  description: string;
}

export function EmptyChart({ title, description }: EmptyChartProps) {
  return (
    <div className="chart-empty">
      <div className="chart-empty__icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="17" stroke="currentColor" strokeWidth="1.7" strokeDasharray="3 4" />
          <path d="M24 8v16l11 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

interface DonutChartProps {
  data: ChartDatum[];
  total: number;
  onSelect: (label: string) => void;
}

export function DonutChart({ data, total, onSelect }: DonutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const circumference = 2 * Math.PI * 78;
  let offset = 0;

  return (
    <div className="donut-layout">
      <div className="donut-visual">
        <svg viewBox="0 0 220 220" role="img" aria-label="Job orders per company">
          <circle cx="110" cy="110" r="78" fill="none" stroke="#f0edf1" strokeWidth="26" />
          {data.map((item) => {
            const dash = total > 0 ? (item.value / total) * circumference : 0;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={item.label}
                className="donut-segment"
                cx="110"
                cy="110"
                r="78"
                fill="none"
                stroke={item.color}
                strokeWidth={hovered === item.label ? 31 : 26}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 110 110)"
                tabIndex={0}
                role="button"
                aria-label={`${item.label}: ${item.value} job orders`}
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(item.label)}
                onBlur={() => setHovered(null)}
                onClick={() => onSelect(item.label)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item.label);
                  }
                }}
              >
                <title>
                  {item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                </title>
              </circle>
            );
          })}
        </svg>
        <div className="donut-center">
          <span>Total Job Orders</span>
          <strong>{total.toLocaleString()}</strong>
          <small>in selection</small>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((item) => (
          <button
            type="button"
            className={`legend-row ${hovered === item.label ? "is-highlighted" : ""}`}
            key={item.label}
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(item.label)}
          >
            <span className="legend-swatch" style={{ backgroundColor: item.color }} />
            <span className="legend-label" title={item.label}>{item.label}</span>
            <strong>{item.value.toLocaleString()}</strong>
            <small>{((item.value / total) * 100).toFixed(1)}%</small>
          </button>
        ))}
      </div>
    </div>
  );
}


interface StatusBarChartProps {
  data: ChartDatum[];
  onSelect: (label: string) => void;
}

export function StatusBarChart({ data, onSelect }: StatusBarChartProps) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="status-bar-chart">
      {data.map((item) => (
        <button
          type="button"
          className={`status-bar-row ${hovered === item.label ? "is-highlighted" : ""}`}
          key={item.label}
          onMouseEnter={() => setHovered(item.label)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(item.label)}
          onBlur={() => setHovered(null)}
          onClick={() => onSelect(item.label)}
          aria-label={`${item.label}: ${item.value} job orders. Filter by this status.`}
        >
          <span className="status-bar-row__label" title={item.label}>{item.label}</span>
          <span className="status-bar-row__track">
            <span
              className="status-bar-row__fill"
              style={{ width: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }}
            />
          </span>
          <strong className="status-bar-row__value">{item.value.toLocaleString()}</strong>
        </button>
      ))}
      <p className="chart-footnote">Select a status bar to filter the dashboard.</p>
    </div>
  );
}

// Round the tallest bar up to a clean axis maximum (1, 2, 5 x 10^n) with about four steps.
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / magnitude;
  const step = Math.max(1, (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { top, ticks };
}

interface CategoryBarChartProps {
  groups: CategoryBarGroup[];
  selectedCategories?: string[];
  selectedCompanies?: string[];
  onSelectCategory: (category: string) => void;
  onSelectCompany: (company: string) => void;
}

export function CategoryBarChart({ groups, selectedCategories = [], selectedCompanies = [], onSelectCategory, onSelectCompany }: CategoryBarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  // A category selection hides the other categories' bars in every company, as the filter does for the rest of the page.
  const visible = groups.map((group) => ({
    ...group,
    bars: selectedCategories.length > 0 ? group.bars.filter((bar) => selectedCategories.includes(bar.category)) : group.bars,
  }));
  const legend = visible[0]?.bars ?? [];
  const { top, ticks } = niceScale(Math.max(0, ...visible.flatMap((group) => group.bars.map((bar) => bar.value))));
  const minWidth = 48 + visible.length * (legend.length * 34 + 72);

  return (
    <div className="category-chart">
      <div className="category-chart__scroll">
        <div className="category-chart__plot" style={{ minWidth }}>
          <div className="category-chart__axis" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>{tick.toLocaleString()}</span>
            ))}
          </div>
          <div className="category-chart__body">
            <div className="category-chart__area">
              {ticks.map((tick) => (
                <i className="category-chart__gridline" key={tick} style={{ bottom: `${(tick / top) * 100}%` }} aria-hidden="true" />
              ))}
              <div className="category-chart__groups">
                {visible.map((group) => (
                  <div className="category-group" key={group.company} role="group" aria-label={`${group.company}: ${group.total} job orders`}>
                    {group.bars.map((bar) => {
                      const height = (bar.value / top) * 100;
                      return (
                        <button
                          type="button"
                          key={bar.category}
                          className={`category-bar ${hovered !== null && hovered !== bar.category ? "is-dimmed" : ""}`}
                          title={`${group.company} - ${bar.category}: ${bar.value.toLocaleString()}`}
                          aria-label={`${group.company}, ${bar.category}: ${bar.value} job orders. Filter by this category.`}
                          onMouseEnter={() => setHovered(bar.category)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(bar.category)}
                          onBlur={() => setHovered(null)}
                          onClick={() => onSelectCategory(bar.category)}
                        >
                          <span className="category-bar__value" style={{ bottom: `calc(${height}% + 5px)` }}>{bar.value.toLocaleString()}</span>
                          <span className="category-bar__fill" style={{ height: `${height}%`, backgroundColor: bar.color }} />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="category-chart__labels">
              {visible.map((group) => (
                <button
                  type="button"
                  key={group.company}
                  title={group.company}
                  className={`category-chart__label ${selectedCompanies.includes(group.company) ? "is-selected" : ""}`}
                  onClick={() => onSelectCompany(group.company)}
                >
                  {group.company}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ul className="category-chart__legend" aria-label="Categories">
        {legend.map((bar) => (
          <li
            key={bar.category}
            className={hovered === bar.category ? "is-highlighted" : ""}
            onMouseEnter={() => setHovered(bar.category)}
            onMouseLeave={() => setHovered(null)}
          >
            <span style={{ backgroundColor: bar.color }} />
            {bar.category}
          </li>
        ))}
      </ul>
      <p className="chart-footnote">Select a bar to filter by its category, or a company name to filter by company.</p>
    </div>
  );
}