export interface JobOrderRecord {
  req_comp: string | null;
  req_current_status: string | null;
  req_date: string | null;
  jo_category: string | null;
}

export type DatePreset =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateBounds {
  start: string | null;
  end: string | null;
}

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}

export interface StackedChartSegment extends ChartDatum {
  percentage: number;
}

export interface StackedChartGroup {
  label: string;
  total: number;
  segments: StackedChartSegment[];
}
