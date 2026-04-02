import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";

const keyMoments = [
  "Juste apres le body scan, pendant que la boisson ou le smoothie se prepare.",
  "Le ton doit rester cadeau, experience et partage, pas pression commerciale.",
  "L'objectif est d'aider la personne a penser a qui elle aimerait faire plaisir."
];

const clientFacingPrompts = [
  "Tu aimes les cadeaux ?",
  "Tu aimes en recevoir ?",
  "A qui tu aimerais offrir ce moment bien-etre et nutrition ?"
];

const coachPrompts = [
  "Je te laisse une feuille et un crayon, tu peux noter les personnes a qui tu aimerais offrir la meme experience.",
  "Prends ton telephone, pense a tes amis, ta famille, tes collegues, et note simplement prenom + numero ou reseau.",
  "Je vais preparer le smoothie et je reviens quand tu as fini tranquillement."
];

const reminders = [
  "Ne reviens pas trop vite. Le temps seul fait remonter plus de noms.",
  "Un nom + un numero ou un reseau suffit pour demarrer.",
  "La personne doit sentir qu'elle offre quelque chose de sympa, pas qu'on lui demande un service."
];

export function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Recommandations"
        title="Un support simple pour demander des recos au bon moment"
        description="Ici, on garde un rappel terrain. Le but est d'aider le distributeur a poser ce moment naturellement, sans rendre le rendez-vous lourd."
      />

      <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.5))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Moment cle</p>
            <h2 className="mt-3 text-4xl text-white">
              Les recommandations se vivent comme un prolongement de l&apos;experience.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              L&apos;idee n&apos;est pas de forcer. On guide la personne pour qu&apos;elle pense a son
              entourage au moment ou elle vient de vivre quelque chose de positif.
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
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Texte client</p>
              <h2 className="mt-2 text-3xl text-white">Les phrases qui ouvrent le moment</h2>
            </div>
            <StatusBadge label="Simple" tone="blue" />
          </div>

          <div className="grid gap-3">
            {clientFacingPrompts.map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-white/10 bg-slate-950/35 px-5 py-4 text-lg leading-8 text-white"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Script distributeur</p>
              <h2 className="mt-2 text-3xl text-white">Comment le poser naturellement</h2>
            </div>
            <StatusBadge label="Terrain" tone="amber" />
          </div>

          <div className="grid gap-3">
            {coachPrompts.map((item, index) => (
              <div
                key={item}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4"
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
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">A retenir</p>
            <h2 className="mt-2 text-3xl text-white">Les trois regles qui changent tout</h2>
          </div>
          <StatusBadge label="Sans pression" tone="green" />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {reminders.map((item) => (
            <div
              key={item}
              className="rounded-[22px] border border-white/10 bg-slate-950/35 px-5 py-4 text-sm leading-7 text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
