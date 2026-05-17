// Redirect SPA des routes legacy /opportunite et /simulateur vers /business.
// Preserve les query params (notamment ?ref=). vercel.json applique aussi un
// redirect 301 cote serveur pour SEO + preview cards WhatsApp.

import { Navigate, useSearchParams } from "react-router-dom";

interface Props {
  hash?: string;
}

export function RedirectToBusiness({ hash }: Props) {
  const [params] = useSearchParams();
  const search = params.toString();
  const to = `/business${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
  return <Navigate to={to} replace />;
}

export default RedirectToBusiness;
