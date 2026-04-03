import { createClient } from "@supabase/supabase-js";
import { resolvePvProgram } from "../src/data/mockPvModule";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Methode non autorisee." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = String(req.headers.authorization ?? "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const clientId = String(req.body?.clientId ?? "").trim();
  const assessment = req.body?.assessment ?? null;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({
      ok: false,
      error: "Les variables Supabase ne sont pas configurees sur le serveur."
    });
    return;
  }

  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session introuvable." });
    return;
  }

  if (!clientId || !assessment?.id) {
    res.status(400).json({ ok: false, error: "Le bilan a modifier est introuvable." });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const {
    data: { user },
    error: authError
  } = await admin.auth.getUser(accessToken);

  if (authError || !user?.id) {
    res.status(401).json({
      ok: false,
      error: "La session n'est plus valide. Reconnecte-toi puis recommence."
    });
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("users")
    .select("id, role, active")
    .eq("id", user.id)
    .single<{ id: string; role: string; active: boolean }>();

  if (profileError || !profile || !profile.active) {
    res.status(403).json({
      ok: false,
      error: "Le profil utilisateur est introuvable ou inactif."
    });
    return;
  }

  const { data: clientRecord, error: clientError } = await admin
    .from("clients")
    .select("id, distributor_id")
    .eq("id", clientId)
    .single<{ id: string; distributor_id: string }>();

  if (clientError || !clientRecord) {
    res.status(404).json({ ok: false, error: "Le dossier client est introuvable." });
    return;
  }

  const canEdit = profile.role === "admin" || clientRecord.distributor_id === profile.id;
  if (!canEdit) {
    res.status(403).json({
      ok: false,
      error: "Tu n'as pas les droits pour modifier ce bilan."
    });
    return;
  }

  const { error: updateError } = await admin
    .from("assessments")
    .update({
      date: assessment.date,
      objective: assessment.objective,
      program_id: assessment.programId ?? null,
      program_title: assessment.programTitle,
      summary: assessment.summary,
      notes: assessment.notes,
      next_follow_up: assessment.nextFollowUp ?? null,
      body_scan: assessment.bodyScan,
      questionnaire: assessment.questionnaire,
      pedagogical_focus: assessment.pedagogicalFocus ?? []
    })
    .eq("id", assessment.id)
    .eq("client_id", clientId);

  if (updateError) {
    res.status(400).json({
      ok: false,
      error: updateError.message || "Impossible de modifier ce bilan."
    });
    return;
  }

  if (assessment.type === "initial") {
    const pvProgram = resolvePvProgram(assessment.programTitle);
    let { error: clientUpdateError } = await admin
      .from("clients")
      .update({
        start_date: assessment.date,
        current_program: assessment.programTitle,
        pv_program_id: pvProgram.id
      })
      .eq("id", clientId);

    if (clientUpdateError?.message?.toLowerCase().includes("pv_program_id")) {
      ({ error: clientUpdateError } = await admin
        .from("clients")
        .update({
          start_date: assessment.date,
          current_program: assessment.programTitle
        })
        .eq("id", clientId));
    }

    if (clientUpdateError) {
      res.status(400).json({
        ok: false,
        error: clientUpdateError.message || "Le bilan a ete modifie, mais pas la date de depart."
      });
      return;
    }
  }

  res.status(200).json({ ok: true });
}
