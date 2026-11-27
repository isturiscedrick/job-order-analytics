import type { OverviewCounts } from "../types/job-order";
import { Icon } from "./Icon";

const CARDS = [
  { key: "forApproval", title: "For approval", rule: "Current status: For Approval", icon: "clock", tone: "pending" },
  { key: "active", title: "Active", rule: "Accept status: Approved", icon: "activity", tone: "active" },
  { key: "closed", title: "Closed", rule: "Closed status: Closed", icon: "archive", tone: "closed" },
] as const;

interface StatusCardsProps {
  // null while the data is still loading
  counts: OverviewCounts | null;
}

export function StatusCards({ counts }: StatusCardsProps) {
  return (
    <div className="status-cards">
      {CARDS.map((card) => {
        const value = counts ? counts[card.key] : null;
        const share = counts && counts.total > 0 && value !== null ? (value / counts.total) * 100 : 0;
        return (
          <article className={`status-card status-card--${card.tone}`} key={card.key}>
            <header className="status-card__head">
              <span className="status-card__icon"><Icon name={card.icon} size={20} /></span>
              <div>
                <h3>{card.title}</h3>
                <small>{card.rule}</small>
              </div>
            </header>
            {value === null ? <i className="skeleton skeleton--status" /> : <strong className="status-card__value">{value.toLocaleString()}</strong>}
            <div className="status-card__meter" role="img" aria-label={`${share.toFixed(1)}% of job orders`}>
              <span style={{ width: `${share}%` }} />
            </div>
            <p className="status-card__share">
              {counts === null
                ? <i className="skeleton skeleton--caption" />
                : counts.total === 0
                  ? "No job orders in this date range"
                  : `${share.toFixed(1)}% of ${counts.total.toLocaleString()} job orders`}
            </p>
          </article>
        );
      })}
    </div>
  );
}