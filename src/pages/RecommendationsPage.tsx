import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";

const keyMoments = [
  "Juste apres le body scan, au moment ou la boisson ou le smoothie se prepare.",
  "Le ton reste cadeau, experience et partage, jamais pression commerciale.",
  "Le but est d'aider la personne a penser naturellement a qui elle aimerait faire plaisir."
];

const clientFacingPrompts = [
  "Tu aimes les cadeaux ?",
  "Tu aimes en recevoir ?",
  "A qui tu aimerais offrir ce moment bien-etre et nutrition ?"
];

const coachPrompts = [
  "Je te laisse noter tranquillement les personnes a qui tu aimerais offrir la meme experience.",
  "Prends ton telephone, pense a tes amis, ta famille, tes collegues, et note simplement prenom + numero ou reseau.",
  "Je prepare le smoothie et je reviens juste apres, prends ton temps."
];

const reminders = [
  "Ne reviens pas trop vite. Le temps calme fait souvent remonter plus de noms.",
  "Un nom + un numero ou un reseau suffit pour demarrer.",
  "La personne doit sentir qu'elle offre un moment sympa, pas qu'on lui demande un service."
];

export function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Recommandations"
        title="Recommandations"
        description="Le bon moment, les bonnes phrases et le bon ton."
      />

      <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.5))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="eyebrow-label">Moment cle</p>
            <h2 className="mt-3 text-3xl text-white">
              Les recommandations se vivent comme un prolongement de l&apos;experience.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Un rappel simple pour garder ce moment naturel.
            </p>
          </div>
          <StatusBadge label="Pendant le smoothie" tone="green" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {keyMoments.map((item) => (
            <div
              key={item}
              className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Texte client</p>
              <h2 className="mt-3 text-3xl text-white">Les phrases qui ouvrent le moment</h2>
            </div>
            <StatusBadge label="Simple" tone="blue" />
          </div>

          <div className="grid gap-3">
            {clientFacingPrompts.map((item) => (
              <div
                key={item}
                className="rounded-[22px] bg-slate-950/24 px-5 py-4 text-lg leading-8 text-white"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Script distributeur</p>
              <h2 className="mt-3 text-3xl text-white">Comment le poser naturellement</h2>
            </div>
            <StatusBadge label="Terrain" tone="amber" />
          </div>

          <div className="grid gap-3">
            {coachPrompts.map((item, index) => (
              <div
                key={item}
                className="rounded-[22px] bg-white/[0.03] px-5 py-4"
              >
                <p className="text-sm font-semibold text-white">Etape {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">A retenir</p>
            <h2 className="mt-3 text-3xl text-white">Les trois regles qui changent tout</h2>
          </div>
          <StatusBadge label="Sans pression" tone="green" />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {reminders.map((item) => (
            <div
              key={item}
              className="rounded-[22px] bg-slate-950/24 px-5 py-4 text-sm leading-7 text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
