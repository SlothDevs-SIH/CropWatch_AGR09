export const LEVELS = {
  normal: { label: "Normal", color: "#7bb241" },
  watch: { label: "Watch", color: "#e5a823" },
  urgent: { label: "Urgent", color: "#d14a30" },
  cannot_see: { label: "Cannot see", color: "#8f988a" },
  not_farmland: { label: "Not farmland", color: "#222b1b" },
};
export const STATUS = {
  none: "",
  awaiting_farmer: "Awaiting farmer",
  confirmed: "Confirmed",
  disputed: "Disputed by farmer",
  unverified: "Unverified",
  reported: "Reported to district",
};
export const ROLE_LABEL = {
  farmer: "Farmer",
  taluka_officer: "Taluka officer",
  district_officer: "District officer",
  admin: "Admin",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function doyLabel(doy) {
  const d = new Date(Date.UTC(2026, 0, 1) + (Number(doy) - 1) * 86400000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
