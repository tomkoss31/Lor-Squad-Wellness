// Chantier Notif in-app temps réel (2026-04-23).
//
// Subscribe au stream Supabase Realtime sur client_messages pour
// déclencher un toast in-app dès qu'un nouveau message client arrive
// pendant que le coach est sur l'app. Intégré dans AppLayout → actif
// sur toutes les pages authentifiées.
//
// Filtres appliqués :
//   - sender = 'client' (on ignore les réponses coach)
//   - distributor_id = currentUser.id (admin voit tout)
//   - L'insertion arrive DÉJÀ dans clientMessages via Realtime → pas
//     besoin de refetch manuel (on ajoute dans le state local aussi,
//     pour cohérence).
//
// Pour que ce hook fonctionne, il faut que la table client_messages
// soit dans la publication supabase_realtime (voir migration
// 20260423140000_enable_messages_realtime.sql).

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getSupabaseClient } from "../services/supabaseClient";
import type { ClientMessage } from "../types/domain";

export function useRealtimeMessages() {
  const { currentUser, addLiveClientMessage } = useAppContext();
  const { push: pushToast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb || cancelled) return;

      const channel = sb
        .channel(`client_messages_insert_${currentUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "client_messages",
          },
          (payload) => {
            const row = payload.new as Partial<ClientMessage> & {
              id: string;
              client_id?: string;
              client_name?: string;
              distributor_id?: string;
              sender?: string;
              message?: string | null;
              message_type?: string;
              created_at?: string;
            };

            // Filtre 1 : on n'alerte que pour les messages venant du client.
            if ((row.sender ?? "client") !== "client") return;

            // Filtre 2 : scope distributeur (admin voit tout).
            const isAdmin = currentUser.role === "admin";
            const isMine =
              row.distributor_id === currentUser.id ||
              row.distributor_id === currentUser.name;
            if (!isAdmin && !isMine) return;

            // Alimente le state global pour que les pages (Messagerie,
            // InboxWidget, badge sidebar) voient le message sans refetch.
            addLiveClientMessage?.(row as ClientMessage);

            // Toast discret.
            const firstName =
              (row.client_name ?? "").split(/\s+/)[0] || "Client";
            const preview = (row.message ?? "").trim().slice(0, 60);
            pushToast({
              tone: "info",
              title: `💬 Nouveau message de ${firstName}`,
              message: preview || "Ouvre la messagerie pour répondre.",
            });
          },
        )
        .subscribe();

      if (cancelled) {
        void sb.removeChannel(channel);
        return;
      }
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) {
        void getSupabaseClient().then((sb) => {
          if (sb) void sb.removeChannel(ch);
        });
        channelRef.current = null;
      }
    };
  }, [currentUser, addLiveClientMessage, pushToast]);
}
