// Chantier birthday block (2026-04-25).
// Affiche les clients dont l'anniversaire est aujourd'hui (gold) ou
// dans les 7 prochains jours (gris). CTA WhatsApp pré-rempli.
// Filtre : clients actifs uniquement (les autres distractions clients
// "perdus" sortent du dashboard quotidien). Filtré côté caller.

import type { Client } from "../../types/domain";
import {
  isBirthdayToday,
  isBirthdaySoon,
  buildBirthdayWhatsAppUrl,
  ageAtNextBirthday,
  daysUntilBirthday,
} from "../../lib/birthday";
import { formatBirthDateShort } from "../../lib/age";

interface Props {
  clients: Client[];
}

interface BirthdayItem extends Client {
  isToday: boolean;
  daysAhead: number;
}

export function BirthdayBlock({ clients }: Props) {
  const list: BirthdayItem[] = clients
    .filter((c) => !!c.birthDate)
    .filter((c) => isBirthdayToday(c.birthDate) || isBirthdaySoon(c.birthDate, 7))
    .map((c) => ({
      ...c,
      isToday: isBirthdayToday(c.birthDate),
      daysAhead: daysUntilBirthday(c.birthDate) ?? 999,
    }))
    .sort((a, b) => a.daysAhead - b.daysAhead);

  if (list.length === 0) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeft: "4px solid #B8922A",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#B8922A",
          letterSpacing: "1.5px",
          fontWeight: 500,
          marginBottom: 12,
          textTransform: "uppercase",
        }}
      >
        🎂 Anniversaires
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((client) => {
          const age = ageAtNextBirthday(client.birthDate);
          return (
            <div
              key={client.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: 10,
                background: client.isToday ? "#FAEEDA" : "#F4F4F4",
                borderRadius: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#444",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {client.firstName} {client.lastName}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {client.isToday
                    ? `🎉 Aujourd'hui — ${age} ans`
                    : `${formatBirthDateShort(client.birthDate)} · dans ${client.daysAhead} jour${client.daysAhead > 1 ? "s" : ""} — ${age} ans`}
                </div>
              </div>
              {client.phone ? (
                <a
                  href={buildBirthdayWhatsAppUrl(
                    client.phone,
                    client.firstName,
                    age,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#25D366",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
