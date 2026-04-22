// Chantier Messagerie finalisée (2026-04-23) — commit 2/5.
//
// Façade stable pour les actions coach sur un message. Les fonctions
// vivent dans AppContext (avec optimistic update via setClientMessages
// interne), ce hook les expose en une API minimaliste pour les consumers.

import { useAppContext } from "../context/AppContext";

export interface MessageActionsApi {
  archive: (messageId: string) => Promise<void>;
  unarchive: (messageId: string) => Promise<void>;
  resolve: (messageId: string) => Promise<void>;
  unresolve: (messageId: string) => Promise<void>;
  markRead: (messageId: string) => Promise<void>;
  markReadMany: (messageIds: string[]) => Promise<void>;
}

export function useMessageActions(): MessageActionsApi {
  const {
    archiveMessage,
    unarchiveMessage,
    resolveMessage,
    unresolveMessage,
    markMessageRead,
    markMessagesRead,
  } = useAppContext();

  return {
    archive: archiveMessage,
    unarchive: unarchiveMessage,
    resolve: resolveMessage,
    unresolve: unresolveMessage,
    markRead: markMessageRead,
    markReadMany: markMessagesRead,
  };
}
