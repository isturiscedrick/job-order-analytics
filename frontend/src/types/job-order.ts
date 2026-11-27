export interface JobOrderRecord {
  req_comp: string | null;
  req_current_status: string | null;
  req_date: string | null;
  jo_category: string | null;
  accept_status: string | null;
  jo_closed_status: string | null;
}

export interface DateBounds {
  start: string | null;
  end: string | null;
}

export interface OverviewCounts {
  total: number;
  forApproval: number;
  active: number;
  closed: number;
}

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

export interface CategoryBar {
  category: string;
  value: number;
  color: string;
}

export interface CategoryBarGroup {
  company: string;
  total: number;
  bars: CategoryBar[];
}