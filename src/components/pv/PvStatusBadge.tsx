import { getPvStatusMeta } from "../../data/pvCatalog";
import type { PvStatus } from "../../types/pv";
import { StatusBadge } from "../ui/StatusBadge";

export function PvStatusBadge({ status }: { status: PvStatus }) {
  const meta = getPvStatusMeta(status);
  return <StatusBadge label={meta.label} tone={meta.tone} />;
}
