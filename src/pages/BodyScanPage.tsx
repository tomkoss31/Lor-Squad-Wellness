import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ScoreBar from "../components/ui/ScoreBar";
import { useClients } from "../hooks/useClients";
import { useBodyScans } from "../hooks/useBodyScans";

const defaultForm = {
  weight_kg: "",
  fat_mass_percent: "",
  fat_mass_kg: "",
  muscle_mass_kg: "",
  bone_mass_kg: "",
  water_percent: "",
  visceral_fat_level: "",
  bmr: "",
  metabolic_age: "",
  waist_cm: "",
  hip_cm: "",
  chest_cm: "",
  notes: ""
};

export function BodyScanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients } = useClients();
  const { createScan } = useBodyScans(id);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const client = clients.find((entry) => entry.id === id);

  const parsed = useMemo(() => {
    const weight = Number(form.weight_kg || 0);
    const height = Number(client?.height_cm || 0) / 100;
    const bmi = weight > 0 && height > 0 ? Number((weight / (height * height)).toFixed(1)) : undefined;
    return {
      weight,
      fatMassPercent: Number(form.fat_mass_percent || 0),
      muscleMassKg: Number(form.muscle_mass_kg || 0),
      waterPercent: Number(form.water_percent || 0),
      visceralFat: Number(form.visceral_fat_level || 0),
      bmi
    };
  }, [client?.height_cm, form]);

  async function handleSubmit() {
    if (!id) {
      return;
    }

    setSubmitting(true);
    try {
      await createScan({
        client_id: id,
        weight_kg: numberOrUndefined(form.weight_kg),
        fat_mass_percent: numberOrUndefined(form.fat_mass_percent),
        fat_mass_kg: numberOrUndefined(form.fat_mass_kg),
        muscle_mass_kg: numberOrUndefined(form.muscle_mass_kg),
        bone_mass_kg: numberOrUndefined(form.bone_mass_kg),
        water_percent: numberOrUndefined(form.water_percent),
        visceral_fat_level: integerOrUndefined(form.visceral_fat_level),
        bmr: integerOrUndefined(form.bmr),
        metabolic_age: integerOrUndefined(form.metabolic_age),
        bmi: parsed.bmi,
        waist_cm: numberOrUndefined(form.waist_cm),
        hip_cm: numberOrUndefined(form.hip_cm),
        chest_cm: numberOrUndefined(form.chest_cm),
        notes: form.notes || undefined
      });

      navigate(`/clients/${id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[980px] space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(defaultForm).map(([key]) =>
            key === "notes" ? null : (
              <label key={key} className="block">
                <span className="lor-label">{humanize(key)}</span>
                <input type="number" value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="lor-field" />
              </label>
            )
          )}
        </div>

        <label className="mt-4 block">
          <span className="lor-label">Notes</span>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="lor-textarea" />
        </label>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => void handleSubmit()} loading={submitting}>Enregistrer le scan</Button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="eyebrow-label">Lecture immédiate</p>
        <h2 className="mt-3 text-[1.6rem] font-bold">Interprétation des mesures</h2>
        <div className="mt-6 space-y-4">
          <ScoreBar label="Poids" value={parsed.weight} max={180} unit=" kg" color="var(--lor-gold)" />
          <ScoreBar label={`Masse grasse (${fatStatus(parsed.fatMassPercent, client?.gender).label})`} value={parsed.fatMassPercent} max={50} unit="%" color={fatStatus(parsed.fatMassPercent, client?.gender).color} />
          <ScoreBar label={`Hydratation (${waterStatus(parsed.waterPercent).label})`} value={parsed.waterPercent} max={100} unit="%" color={waterStatus(parsed.waterPercent).color} />
          <ScoreBar label={`Graisse viscérale (${visceralStatus(parsed.visceralFat).label})`} value={parsed.visceralFat} max={30} color={visceralStatus(parsed.visceralFat).color} />
        </div>
        <div className="mt-6 grid gap-3 text-sm text-[var(--lor-muted)] md:grid-cols-2">
          <p>Masse grasse homme: normale 10-20%, attention 20-25%, hors norme &gt; 25%</p>
          <p>Masse grasse femme: normale 18-28%, attention 28-35%, hors norme &gt; 35%</p>
          <p>Graisse viscérale: normale 1-9, attention 10-14, hors norme ≥ 15</p>
          <p>Hydratation: normale &gt; 55%, attention 50-55%, hors norme &lt; 50%</p>
          <p>IMC calculé: {parsed.bmi ?? "-"}</p>
        </div>
      </Card>
    </div>
  );
}

function numberOrUndefined(value: string) { return value ? Number(value) : undefined; }
function integerOrUndefined(value: string) { return value ? Number.parseInt(value, 10) : undefined; }

function humanize(value: string) {
  const map: Record<string, string> = {
    weight_kg: "Poids (kg)",
    fat_mass_percent: "Masse grasse (%)",
    fat_mass_kg: "Masse grasse (kg)",
    muscle_mass_kg: "Masse musculaire (kg)",
    bone_mass_kg: "Masse osseuse (kg)",
    water_percent: "Hydratation (%)",
    visceral_fat_level: "Graisse viscérale",
    bmr: "BMR (kcal)",
    metabolic_age: "Âge métabolique",
    waist_cm: "Tour de taille",
    hip_cm: "Hanches",
    chest_cm: "Poitrine"
  };
  return map[value] ?? value;
}

function fatStatus(value: number, gender?: string) {
  if (gender === "homme") {
    if (value <= 20) return { label: "OK", color: "var(--lor-teal)" };
    if (value <= 25) return { label: "Attention", color: "var(--lor-gold)" };
    return { label: "Hors norme", color: "var(--lor-coral)" };
  }
  if (value <= 28) return { label: "OK", color: "var(--lor-teal)" };
  if (value <= 35) return { label: "Attention", color: "var(--lor-gold)" };
  return { label: "Hors norme", color: "var(--lor-coral)" };
}

function visceralStatus(value: number) {
  if (value <= 9) return { label: "OK", color: "var(--lor-teal)" };
  if (value <= 14) return { label: "Attention", color: "var(--lor-gold)" };
  return { label: "Hors norme", color: "var(--lor-coral)" };
}

function waterStatus(value: number) {
  if (value > 55) return { label: "OK", color: "var(--lor-teal)" };
  if (value >= 50) return { label: "Attention", color: "var(--lor-gold)" };
  return { label: "Hors norme", color: "var(--lor-coral)" };
}

export default BodyScanPage;
