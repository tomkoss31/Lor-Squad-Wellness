import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import {
  formatDateTime,
  normalizeDateTimeLocalInputValue,
  serializeDateTimeForStorage
} from "../lib/calculations";
import { getClientActiveFollowUp } from "../lib/portfolio";

interface EditClientScheduleDraftPayload {
  clientId: string;
  nextFollowUp: string;
  followUpType: string;
}

const EDIT_CLIENT_SCHEDULE_DRAFT_PREFIX =
  "lor-squad-wellness-edit-client-schedule-draft-v1";

function getEditClientScheduleDraftKey(clientId: string) {
  return `${EDIT_CLIENT_SCHEDULE_DRAFT_PREFIX}-${clientId}`;
}

function readEditClientScheduleDraft(clientId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getEditClientScheduleDraftKey(clientId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<EditClientScheduleDraftPayload>;
    if (!parsed.clientId || parsed.clientId !== clientId) {
      return null;
    }

    return parsed as EditClientScheduleDraftPayload;
  } catch {
    return null;
  }
}

function persistEditClientScheduleDraft(payload: EditClientScheduleDraftPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getEditClientScheduleDraftKey(payload.clientId),
      JSON.stringify(payload)
    );
  } catch (error) {
    console.error("Sauvegarde du brouillon planning impossible.", error);
  }
}

function clearEditClientScheduleDraft(clientId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getEditClientScheduleDraftKey(clientId));
}

export function EditClientSchedulePage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { getClientById, followUps, updateClientSchedule } = useAppContext();
  const client = clientId ? getClientById(clientId) : undefined;

  // Hooks AVANT tout early return (rules-of-hooks / chantier nuit 2026-04-20).
  // On utilise optional chaining + fallback pour rester safe quand client
  // est undefined — le early return en bas renverra tout de même la carte.
  const currentFollowUp = useMemo(
    () => (client ? getClientActiveFollowUp(client, followUps) : null),
    [followUps, client]
  );

  const [nextFollowUp, setNextFollowUp] = useState(
    normalizeDateTimeLocalInputValue(currentFollowUp?.dueDate ?? client?.nextFollowUp ?? "")
  );
  const [followUpType, setFollowUpType] = useState(currentFollowUp?.type ?? "Suivi terrain");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    if (!client) return;
    const draft = readEditClientScheduleDraft(client.id);
    if (draft) {
      setNextFollowUp(draft.nextFollowUp);
      setFollowUpType(draft.followUpType);
    }
    setDraftReady(true);
  }, [client]);

  useEffect(() => {
    if (!client || !draftReady) {
      return;
    }

    persistEditClientScheduleDraft({
      clientId: client.id,
      nextFollowUp,
      followUpType
    });
  }, [draftReady, followUpType, nextFollowUp, client]);

  if (!client) {
    return (
      <Card>
        <p className="text-lg text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }

  const targetClient = client;

  async function handleSave() {
    setError("");
    setIsSaving(true);

    try {
      await updateClientSchedule(targetClient.id, {
        nextFollowUp: serializeDateTimeForStorage(nextFollowUp),
        followUpType,
        followUpStatus: currentFollowUp?.status ?? "scheduled"
      });
      clearEditClientScheduleDraft(targetClient.id);
      navigate(`/clients/${targetClient.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de modifier ce rendez-vous pour le moment."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Planning"
        title={`Modifier le rendez-vous de ${targetClient.firstName} ${targetClient.lastName}`}
        description="Ajuste la date, l'heure et le type de suivi pour garder un export propre et un planning juste."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow-label">Rendez-vous client</p>
              <p className="mt-3 text-2xl text-white">Le prochain créneau à corriger</p>
            </div>
            <StatusBadge label={currentFollowUp?.status === "pending" ? "Relance" : "Planifié"} tone={currentFollowUp?.status === "pending" ? "amber" : "green"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Date et heure du prochain rendez-vous"
              type="datetime-local"
              value={nextFollowUp}
              onChange={setNextFollowUp}
            />
            <Field
              label="Type de suivi"
              value={followUpType}
              onChange={setFollowUpType}
            />
          </div>

          {error ? (
            <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(`/clients/${targetClient.id}`)}>
              Annuler
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? "Enregistrement..." : "Enregistrer le rendez-vous"}
            </Button>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="eyebrow-label">Lecture rapide</p>
          <InfoCard
            title="Créneau actuel"
            text={formatDateTime(currentFollowUp?.dueDate ?? client.nextFollowUp)}
          />
          <InfoCard
            title="Créneau mis à jour"
            text={formatDateTime(nextFollowUp)}
          />
          <InfoCard
            title="Ce qui sera corrigé"
            text="Le prochain rendez-vous du dossier client et le suivi associé seront mis à jour ensemble."
          />
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">{text}</p>
    </div>
  );
}
