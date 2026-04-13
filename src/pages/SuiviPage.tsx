import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useClients } from "../hooks/useClients";
import { useSuivis } from "../hooks/useSuivis";
import { supabase } from "../lib/supabaseClient";

const defaultForm = {
  energy_level: 3,
  hunger_level: 3,
  digestion_quality: 3,
  bloating: 3,
  water_liters: 1.5,
  sleep_quality: 3,
  meals_respected: true,
  prep_difficulty: "",
  small_victories: "",
  remaining_blockers: "",
  notes: ""
};

export function SuiviPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients } = useClients();
  const { createSuivi } = useSuivis(id);
  const [form, setForm] = useState(defaultForm);
  const [programStartDate, setProgramStartDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const client = clients.find((entry) => entry.id === id);

  useEffect(() => {
    async function fetchProgramStart() {
      if (!id) return;
      const { data } = await supabase.from("client_produits").select("start_date").eq("client_id", id).order("start_date", { ascending: true }).limit(1).maybeSingle();
      setProgramStartDate((data?.start_date as string | undefined) ?? null);
    }
    void fetchProgramStart();
  }, [id]);

  const weekNumber = useMemo(() => {
    const start = programStartDate ? new Date(programStartDate) : client ? new Date(client.created_at) : new Date();
    const now = new Date();
    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.floor(days / 7) + 1;
  }, [client, programStartDate]);

  async function handleSubmit() {
    if (!id) return;
    setSubmitting(true);
    try {
      await createSuivi({ client_id: id, week_number: weekNumber, energy_level: form.energy_level, hunger_level: form.hunger_level, digestion_quality: form.digestion_quality, bloating: form.bloating, water_liters: form.water_liters, sleep_quality: form.sleep_quality, meals_respected: form.meals_respected, prep_difficulty: form.prep_difficulty || undefined, small_victories: form.small_victories || undefined, remaining_blockers: form.remaining_blockers || undefined, notes: form.notes || undefined });
      navigate(`/clients/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[860px] space-y-6">
      <Card className="p-6">
        <p className="eyebrow-label">Check-in hebdomadaire</p>
        <h2 className="mt-3 text-[1.8rem] font-bold">Semaine {weekNumber}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <RatingField label="Niveau d'énergie" value={form.energy_level} onChange={(value) => setForm((current) => ({ ...current, energy_level: value }))} />
          <RatingField label="Niveau de faim" value={form.hunger_level} onChange={(value) => setForm((current) => ({ ...current, hunger_level: value }))} />
          <RatingField label="Qualité de digestion" value={form.digestion_quality} onChange={(value) => setForm((current) => ({ ...current, digestion_quality: value }))} />
          <RatingField label="Ballonnements" value={form.bloating} onChange={(value) => setForm((current) => ({ ...current, bloating: value }))} />
          <Field label={`Litres d'eau: ${form.water_liters.toFixed(2)}L`}><input type="range" min="0" max="3.5" step="0.25" value={form.water_liters} onChange={(event) => setForm((current) => ({ ...current, water_liters: Number(event.target.value) }))} /></Field>
          <RatingField label="Qualité du sommeil" value={form.sleep_quality} onChange={(value) => setForm((current) => ({ ...current, sleep_quality: value }))} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Repas respectés">
            <select value={form.meals_respected ? "oui" : "non"} onChange={(event) => setForm((current) => ({ ...current, meals_respected: event.target.value === "oui" }))} className="lor-select">
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </Field>
          <Field label="Difficultés de préparation"><textarea value={form.prep_difficulty} onChange={(event) => setForm((current) => ({ ...current, prep_difficulty: event.target.value }))} className="lor-textarea" /></Field>
          <Field label="Petites victoires"><textarea value={form.small_victories} onChange={(event) => setForm((current) => ({ ...current, small_victories: event.target.value }))} className="lor-textarea" /></Field>
          <Field label="Points qui bloquent encore"><textarea value={form.remaining_blockers} onChange={(event) => setForm((current) => ({ ...current, remaining_blockers: event.target.value }))} className="lor-textarea" /></Field>
        </div>

        <Field label="Notes coach"><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="lor-textarea" /></Field>
        <div className="mt-6 flex justify-end"><Button onClick={() => void handleSubmit()} loading={submitting}>Enregistrer le suivi</Button></div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="lor-label">{label}</span>{children}</label>;
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const current = index + 1;
          const active = current <= value;
          return <button key={current} type="button" onClick={() => onChange(current)} className={["flex h-10 w-10 items-center justify-center rounded-full border text-lg transition", active ? "border-[rgba(201,168,76,0.34)] bg-[rgba(201,168,76,0.14)] text-[var(--lor-gold2)]" : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--lor-muted)]"].join(" ")}>★</button>;
        })}
      </div>
    </Field>
  );
}

export default SuiviPage;
