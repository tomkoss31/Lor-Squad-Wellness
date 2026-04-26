// Chantier birthday block (2026-04-25).
// Affiche les clients dont l'anniversaire est aujourd'hui (gold) ou
// dans les 7 prochains jours (gris).
//
// Chantier N (2026-04-26) :
//   - bouton "Voir le message" ouvre BirthdayMessageDialog (popup riche)
//   - filtrage des clients deja notifies cette annee (birthday_sent_at)
//   - mark sent → UPDATE clients.birthday_sent_at + retire de la liste

import { useMemo, useState } from "react";
import type { Client } from "../../types/domain";
import {
  isBirthdayToday,
  isBirthdaySoon,
  ageAtNextBirthday,
  daysUntilBirthday,
} from "../../lib/birthday";
import { formatBirthDateShort } from "../../lib/age";
import { BirthdayMessageDialog } from "./BirthdayMessageDialog";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  clients: Client[];
  coachFirstName?: string;
}

interface BirthdayItem extends Client {
  isToday: boolean;
  daysAhead: number;
}

/** True si un message a deja ete envoye cette annee civile. */
function isAlreadySentThisYear(birthdaySentAt: string | null | undefined): boolean {
  if (!birthdaySentAt) return false;
  const sent = new Date(birthdaySentAt);
  if (Number.isNaN(sent.getTime())) return false;
  return sent.getFullYear() === new Date().getFullYear();
}

export function BirthdayBlock({ clients, coachFirstName = "Thomas" }: Props) {
  const [openClient, setOpenClient] = useState<Client | null>(null);
  // Optimistic exclusion : clients dont on vient de marquer "envoye"
  // disparaissent immediatement, sans attendre un refetch global.
  const [locallySent, setLocallySent] = useState<Set<string>>(new Set());

  const list: BirthdayItem[] = useMemo(
    () =>
      clients
        .filter((c) => !!c.birthDate)
        .filter((c) => isBirthdayToday(c.birthDate) || isBirthdaySoon(c.birthDate, 7))
        .filter((c) => !isAlreadySentThisYear(c.birthdaySentAt))
        .filter((c) => !locallySent.has(c.id))
        .map((c) => ({
          ...c,
          isToday: isBirthdayToday(c.birthDate),
          daysAhead: daysUntilBirthday(c.birthDate) ?? 999,
        }))
        .sort((a, b) => a.daysAhead - b.daysAhead),
    [clients, locallySent],
  );

  const handleMarkSent = async (clientId: string) => {
    try {
      const sb = await getSupabaseClient();
      if (sb) {
        const { error } = await sb
          .from("clients")
          .update({ birthday_sent_at: new Date().toISOString() })
          .eq("id", clientId);
        if (error) {
          console.error("[birthday] mark sent error", error);
          return;
        }
      }
      setLocallySent((prev) => {
        const next = new Set(prev);
        next.add(clientId);
        return next;
      });
    } catch (err) {
      console.error("[birthday] mark sent failed", err);
    }
  };

  if (list.length === 0) return null;

  return (
    <>
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
                <button
                  type="button"
                  onClick={() => setOpenClient(client)}
                  style={{
                    background: "#B8922A",
                    color: "white",
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Voir le message
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {openClient ? (
        <BirthdayMessageDialog
          client={openClient}
          coachFirstName={coachFirstName}
          onClose={() => setOpenClient(null)}
          onMarkSent={handleMarkSent}
        />
      ) : null}
    </>
  );
}
