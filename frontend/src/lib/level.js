// The same rule the backend uses (backend/analysis.py level_series), so the season replay on the map agrees with the live labels.
export const STALE_BINS = 3;
export const DEFAULT_TH = { watch: -0.1, urgent: -0.2, urgent_prior: -0.1 };
export const FIRST_BIN = 152;       // day of year of 1 June; bins are 10 days long
export const BIN_COUNT = 16;

/** now, normal: arrays of 16 thousandths-of-greenness (or null). Returns "normal" | "watch" | "urgent" | "cannot_see". */
export function levelAt(now, normal, bin, th = DEFAULT_TH) {
  const valid = [];
  for (let b = 0; b <= bin; b++) if (now[b] != null && normal[b] != null) valid.push(b);
  if (!valid.length || bin - valid[valid.length - 1] > STALE_BINS) return "cannot_see";
  const dev = (b) => (now[b] - normal[b]) / 1000;
  const last = dev(valid[valid.length - 1]);
  const prior = valid.length > 1 ? dev(valid[valid.length - 2]) : null;
  if (last <= th.urgent && prior != null && prior <= th.urgent_prior) return "urgent";
  if (last <= th.watch) return "watch";
  return "normal";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function binDate(bin, end = false) {
  const d = new Date(Date.UTC(2026, 0, 1) + (FIRST_BIN + 10 * bin - 1 + (end ? 9 : 0)) * 86400000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export const ORDER_BIN = Math.floor((268 - FIRST_BIN) / 10);       // the bin containing 25 September 2026
