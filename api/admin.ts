// =============================================================================
// api/admin — routeur unique des opérations admin (nettoyage 2026-08-01).
//
// Le plan Vercel Hobby plafonne à 12 fonctions SERVERLESS/déploiement, et le
// projet y était pile à 12. Les 6 fonctions admin (create-user, update-user,
// repair-user, update-user-password, delete-client, create-external-distributor)
// sont désormais UNE seule fonction : ce routeur délègue à leur handler d'origine
// selon le champ `action` du body. Les handlers vivent dans api/_admin/ — préfixe
// `_` = Vercel ne les compte PAS comme fonctions (ils sont bundlés ici).
//
// ⚠️ ZÉRO changement de comportement : chaque handler est déplacé tel quel
// (git mv, byte-pour-byte) et reçoit un body IDENTIQUE à avant — le routeur
// retire son champ d'aiguillage `__adminRoute` avant de déléguer (certains
// handlers font `payload = req.body` en entier, un champ en trop casserait leur
// insert). Chaque handler garde sa propre auth (Bearer admin) et sa validation.
//
// ⚠️ Le champ d'aiguillage est `__adminRoute`, PAS `action` : create-external-
// distributor utilise DÉJÀ `action` en interne (create/update/delete) — écraser
// `action` transformerait un « modifier » en « créer ». On ne touche donc jamais
// aux `action`/`mode` internes des handlers.
// =============================================================================

import createUser from "./_admin/create-user";
import updateUser from "./_admin/update-user";
import repairUser from "./_admin/repair-user";
import updateUserPassword from "./_admin/update-user-password";
import deleteClient from "./_admin/delete-client";
import createExternalDistributor from "./_admin/create-external-distributor";

type AdminHandler = (req: any, res: any) => unknown | Promise<unknown>;

const ROUTES: Record<string, AdminHandler> = {
  "create-user": createUser,
  "update-user": updateUser,
  "repair-user": repairUser,
  "update-user-password": updateUserPassword,
  "delete-client": deleteClient,
  "create-external-distributor": createExternalDistributor,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const route = String(req.body?.__adminRoute ?? req.query?.__adminRoute ?? "").trim();
  const fn = ROUTES[route];
  if (!fn) {
    res.status(400).json({ ok: false, error: `unknown_admin_route:${route || "(vide)"}` });
    return;
  }

  // Le handler d'origine doit voir son body EXACT (sans le champ d'aiguillage) :
  // create-user / repair-user / create-external-distributor lisent req.body en
  // entier. On retire UNIQUEMENT __adminRoute — jamais `action`/`mode` (internes
  // à create-external-distributor).
  if (req.body && typeof req.body === "object") {
    delete req.body.__adminRoute;
  }

  return fn(req, res);
}
