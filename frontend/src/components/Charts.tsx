import { useMemo, useState } from "react";
import type {
  ChartDatum,
  StackedChartGroup,
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

interface StackedBarChartProps {
  groups: StackedChartGroup[];
  onSelect: (label: string) => void;
  kind: "status" | "category";
}

export function StackedBarChart({
  groups,
  onSelect,
  kind,
}: StackedBarChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxValue = useMemo(
    () => Math.max(1, ...groups.map((group) => group.total)),
    [groups],
  );
  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    groups.forEach((group) =>
      group.segments.forEach((segment) => seen.set(segment.label, segment.color)),
    );
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [groups]);

  return (
    <div className="stacked-chart">
      <div className="stacked-chart__rows">
        {groups.map((group) => (
          <div className="stacked-row" key={group.label}>
            <div className="stacked-row__meta">
              <span title={group.label}>{group.label}</span>
              <strong>{group.total.toLocaleString()}</strong>
            </div>
            <div
              className="stacked-track"
              role="img"
              aria-label={`${group.label}, ${group.total} job orders`}
            >
              <div
                className="stacked-track__fill"
                style={{ width: `${(group.total / maxValue) * 100}%` }}
              >
                {group.segments.map((segment) => {
                  const width = group.total > 0 ? (segment.value / group.total) * 100 : 0;
                  return (
                    <button
                      type="button"
                      key={segment.label}
                      className={`stacked-segment ${hovered === segment.label ? "is-highlighted" : ""}`}
                      style={{ width: `${width}%`, backgroundColor: segment.color }}
                      title={`${group.label} · ${segment.label}: ${segment.value} (${segment.percentage.toFixed(1)}%)`}
                      aria-label={`${group.label}, ${segment.label}: ${segment.value}`}
                      onMouseEnter={() => setHovered(segment.label)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(segment.label)}
                      onBlur={() => setHovered(null)}
                      onClick={() => onSelect(segment.label)}
                    >
                      {width >= 17 ? segment.value : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        {legend.map((item) => (
          <button
            className={`chart-legend__item ${hovered === item.label ? "is-highlighted" : ""}`}
            type="button"
            key={item.label}
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(item.label)}
          >
            <span style={{ backgroundColor: item.color }} />
            {item.label}
          </button>
        ))}
      </div>
      <p className="chart-footnote">
        {kind === "status"
          ? "Select a status segment or legend item to filter the dashboard."
          : "Select a category segment or legend item to filter the dashboard."}
      </p>
    </div>
  );
}
