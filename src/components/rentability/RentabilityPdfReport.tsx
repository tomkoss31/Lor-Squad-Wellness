// =============================================================================
// RentabilityPdfReport — layout A4 statique pour export PDF rentabilité.
// Chantier #8 polish 2026-05-22.
//
// Rendu off-screen (top: -99999px) via html2canvas + jsPDF (lazy import).
// Une page A4 portrait : header + hero montant + calcul détaillé + top
// clients. Couleurs print-safe (pas de gradient text, pas de mesh).
// =============================================================================

import { forwardRef } from "react";
import type { RentabilityData, RentabilityTopClient } from "../../hooks/useUserRentability";

interface Props {
  data: RentabilityData;
  directMargin: number;
  downlineOverride: number;
  manualOverride: number;
  coachName: string;
  generatedAt: Date;
}

const A4_WIDTH = 794;  // 210mm @ 96dpi
const A4_HEIGHT = 1123; // 297mm @ 96dpi

function fmtEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return iso;
  }
}

export const RentabilityPdfReport = forwardRef<HTMLDivElement, Props>(
  ({ data, directMargin, downlineOverride, manualOverride, coachName, generatedAt }, ref) => {
    const total = directMargin + downlineOverride + manualOverride;
    const delta = total - data.prev_month_eur;
    const deltaPct = data.prev_month_eur > 0
      ? Math.round((delta / data.prev_month_eur) * 100)
      : 0;
    const topClients: RentabilityTopClient[] = data.top_clients ?? [];

    return (
      <div
        ref={ref}
        style={{
          width: A4_WIDTH,
          minHeight: A4_HEIGHT,
          background: "#FFFFFF",
          padding: "48px 56px",
          fontFamily: "DM Sans, sans-serif",
          color: "#1A1612",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #E5E7EB", paddingBottom: 18, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B8922A", fontWeight: 700 }}>
              La Base 360 · Rentabilité
            </div>
            <div style={{ fontSize: 26, fontFamily: "Syne, serif", fontWeight: 700, color: "#1A1612", marginTop: 6, letterSpacing: "-0.01em" }}>
              {monthLabel(data.month_start)}
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              {coachName}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: "#6B7280" }}>
            <div>Édité le {generatedAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
            <div>à {generatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        {/* Hero montant */}
        <div style={{
          background: "linear-gradient(135deg, #0D9488 0%, #5B21B6 60%, #EF4444 100%)",
          borderRadius: 22,
          padding: 32,
          color: "#FFFFFF",
          marginBottom: 28,
        }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85, fontWeight: 600 }}>
            Total net ce mois
          </div>
          <div style={{ fontSize: 64, fontFamily: "Syne, serif", fontStyle: "italic", fontWeight: 700, marginTop: 8, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {fmtEur(total)}
          </div>
          {data.prev_month_eur > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, opacity: 0.95 }}>
              {delta >= 0 ? "↑" : "↓"} {delta >= 0 ? "+" : ""}{fmtEur(delta)} ({delta >= 0 ? "+" : ""}{deltaPct}%) vs mois précédent
            </div>
          )}
        </div>

        {/* Calcul détaillé */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontFamily: "Syne, serif", fontWeight: 600, color: "#1A1612", marginBottom: 14, letterSpacing: "-0.01em" }}>
            01 · Le calcul
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              <CalcRow label="CA brut" sub={`${data.products_count} programme${data.products_count > 1 ? "s" : ""} vendu${data.products_count > 1 ? "s" : ""}`} value={fmtEur(data.revenue_brut)} />
              <CalcRow label="× Marge perso" sub={data.rank_label} value={`${Math.round(data.margin_pct)} %`} />
              <CalcRow label="= Marge directe" sub="sur tes ventes (publics + VIP)" value={fmtEur(directMargin)} color="#0D9488" emphasis />
              {downlineOverride > 0 && (
                <CalcRow label="+ Override équipe app" sub="commission downline trackée" value={`+${fmtEur(downlineOverride)}`} color="#5B21B6" />
              )}
              {manualOverride > 0 && (
                <CalcRow label="+ Override hors-app" sub="distri saisis manuellement" value={`+${fmtEur(manualOverride)}`} color="#5B21B6" />
              )}
              <tr>
                <td colSpan={2} style={{ paddingTop: 14, paddingBottom: 14, borderTop: "2px solid #1A1612" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6B7280", fontWeight: 700 }}>
                    Total net
                  </div>
                </td>
                <td style={{ paddingTop: 14, paddingBottom: 14, borderTop: "2px solid #1A1612", textAlign: "right", fontFamily: "Syne, serif", fontStyle: "italic", fontWeight: 700, fontSize: 28, color: "#1A1612" }}>
                  {fmtEur(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Split Public/VIP/Projection */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          <StatBlock label="Clients publics" value={fmtEur(data.margin_public_eur)} sub={`${data.clients_public_count} client${data.clients_public_count > 1 ? "s" : ""} · ${fmtEur(data.revenue_public)} CA`} color="#0D9488" />
          <StatBlock label="Clients VIP" value={fmtEur(data.margin_vip_eur)} sub={`${data.clients_vip_count} VIP · ${fmtEur(data.revenue_vip)} CA`} color="#B8922A" />
          <StatBlock label="Projection fin de mois" value={fmtEur(data.projection_eur)} sub={`Jour ${data.days_elapsed} / ${data.days_in_month}`} color="#5B21B6" />
        </div>

        {/* Top clients */}
        {topClients.length > 0 && (
          <div>
            <h2 style={{ fontSize: 18, fontFamily: "Syne, serif", fontWeight: 600, color: "#1A1612", marginBottom: 14, letterSpacing: "-0.01em" }}>
              02 · Top clients du mois
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB", color: "#6B7280", textTransform: "uppercase", fontSize: 9, letterSpacing: 0.4 }}>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>#</th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>Client</th>
                  <th style={{ textAlign: "left", padding: "8px 4px" }}>Status</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>CA</th>
                  <th style={{ textAlign: "right", padding: "8px 4px" }}>Marge</th>
                </tr>
              </thead>
              <tbody>
                {topClients.slice(0, 8).map((c, i) => (
                  <tr key={c.client_id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "10px 4px", color: "#6B7280", fontWeight: 600 }}>#{i + 1}</td>
                    <td style={{ padding: "10px 4px", color: "#1A1612", fontWeight: 600 }}>{c.client_name}</td>
                    <td style={{ padding: "10px 4px", color: "#6B7280" }}>
                      {c.is_vip ? `VIP ${c.vip_status} −${c.vip_discount_pct}%` : "Public"}
                    </td>
                    <td style={{ padding: "10px 4px", textAlign: "right", color: "#1A1612" }}>{fmtEur(c.revenue)}</td>
                    <td style={{ padding: "10px 4px", textAlign: "right", color: "#0D9488", fontWeight: 600 }}>{fmtEur(c.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 14, borderTop: "1px solid #E5E7EB", fontSize: 9, color: "#9CA3AF", textAlign: "center" }}>
          Calcul basé sur les ventes trackées dans La Base 360 + breakdown PV saisis pour le mois.
          Ce document est confidentiel · {coachName} · {monthLabel(data.month_start)}.
        </div>
      </div>
    );
  },
);
RentabilityPdfReport.displayName = "RentabilityPdfReport";

function CalcRow({ label, sub, value, color, emphasis }: { label: string; sub: string; value: string; color?: string; emphasis?: boolean }) {
  return (
    <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
      <td style={{ padding: "10px 0", color: emphasis ? "#1A1612" : "#4A4339", fontWeight: emphasis ? 700 : 500 }}>{label}</td>
      <td style={{ padding: "10px 8px", color: "#6B7280", fontSize: 11 }}>{sub}</td>
      <td style={{ padding: "10px 0", textAlign: "right", color: color ?? "#1A1612", fontWeight: emphasis ? 700 : 600, fontSize: emphasis ? 16 : 13 }}>
        {value}
      </td>
    </tr>
  );
}

function StatBlock({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: "#FAFAF7",
      border: "1px solid #E5E7EB",
      borderRadius: 14,
      padding: 14,
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6B7280", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontFamily: "Syne, serif", fontWeight: 700, color, marginTop: 6, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>{sub}</div>
    </div>
  );
}
