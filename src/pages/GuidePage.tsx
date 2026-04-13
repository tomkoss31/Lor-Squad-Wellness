import { useState } from "react";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";

type GuideTab = "rdv" | "recos";

const preparationPoints = [
  "Sois a l'heure, idealement un peu en avance.",
  "Club range, propre et accueillant.",
  "Balance, fiche bilan et stylo deja prets."
];

const accueilPoints = [
  "Accueille avec le sourire et utilise le prenom.",
  "Mets la personne a l'aise des les premieres secondes.",
  "Elle doit sentir qu'on l'attendait vraiment."
];

const boissonPoints = [
  "Demande d'abord : chaude ou froide ?",
  "Propose ensuite ta meilleure boisson.",
  "Prends aussi ta boisson pour creer un vrai moment partage."
];

const relationPoints = [
  "Mode coach humain, jamais vendeur.",
  "Pose des questions ouvertes et laisse parler.",
  "Ecoute sans juger, puis reformule calmement."
];

const balancePoints = [
  "Explique toujours ce que tu vas mesurer.",
  "Presente les chiffres comme une base de depart.",
  "Le ton doit rester positif et constructif."
];

const shakePoints = [
  "Formula 1 = base d'un repas equilibre.",
  "Fais gouter un shake tres bon et bien presente.",
  "Le client doit se dire : je pourrais prendre ca tous les jours."
];

const closingFlow = [
  {
    title: "1. Reformuler",
    detail: "Si je resume, tu veux surtout X, Y, Z. On valide bien ce cap ensemble."
  },
  {
    title: "2. Proposer",
    detail: "Donne 2 ou 3 options maximum, pas plus."
  },
  {
    title: "3. Faire choisir",
    detail: "Demande clairement : lequel te convient pour demarrer ?"
  },
  {
    title: "4. Poser la suite",
    detail: "Programme, reglement, date de demarrage, groupe ou challenge, prochain suivi."
  }
];

const usefulPhrases = [
  "Bienvenue, installe-toi, tu vas voir, on va passer un bon moment.",
  "Qu'est-ce qui t'a donne envie de venir aujourd'hui ?",
  "Ce qui compte, ce n'est pas ou tu es aujourd'hui, mais ce qu'on va construire ensemble.",
  "On ne cherche pas la perfection, on cherche un plan simple a tenir."
];

const recommendationHighlights = [
  "Ton resultat produit renforce la confiance.",
  "Une EBE reussie ouvre les recos puis le demarrage.",
  "Tu vends une experience, pas juste un shake.",
  "Ton temps, ton ecoute et ton bilan ont une vraie valeur.",
  "Le script et l'intonation comptent autant que le fond.",
  "Les recos ne vivent pas seulement le jour du bilan."
];

const recommendationFlow = [
  {
    title: "Le bon moment",
    detail: "Juste apres l'explication des valeurs et avant le closing final."
  },
  {
    title: "Les deux questions",
    detail: "Est-ce que tu aimes les cadeaux ? Est-ce que tu aimes faire des cadeaux ?"
  },
  {
    title: "La feuille + le crayon",
    detail: "Tu donnes la feuille, tu expliques l'idee, puis tu t'eloignes vraiment."
  },
  {
    title: "Le retour",
    detail: "Tu remercies, tu expliques le cadeau et tu proposes d'envoyer un petit message aux contacts."
  }
];

const recommendationRules = [
  "Ne reviens pas tant que le crayon n'est pas pose.",
  "Laisse un vrai temps seul pour que la personne pense a son entourage.",
  "En cas d'objection, respire, rassure et guide sans pression."
];

const visioReminder = [
  "En visio, le principe reste le meme avec feuille blanche + photo.",
  "Tu peux couper 5 minutes puis reprendre ensuite.",
  "L'important reste de laisser un vrai temps de reflexion."
];

export function GuidePage() {
  const [activeTab, setActiveTab] = useState<GuideTab>("rdv");

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Guide rendez-vous"
        title="Guide rendez-vous"
        description="Des reperes simples pour accueillir, expliquer et conclure avec justesse."
      />

      <Card className="space-y-5 overflow-hidden bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.5))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="eyebrow-label">Support terrain</p>
            <h2 className="mt-3 text-3xl text-white">Le bon ton, la bonne structure, le bon rythme.</h2>
            <p className="mt-3 text-sm leading-6 text-[#B0B4C4]">
              Un rappel rapide pour garder le rendez-vous net, fluide et pro.
            </p>
          </div>
          <StatusBadge label="Calme + pro" tone="green" />
        </div>

        <div className="flex flex-wrap gap-3">
          <TabButton
            active={activeTab === "rdv"}
            label="Conduite du rendez-vous"
            onClick={() => setActiveTab("rdv")}
          />
          <TabButton
            active={activeTab === "recos"}
            label="Recommandations"
            onClick={() => setActiveTab("recos")}
          />
        </div>
      </Card>

      {activeTab === "rdv" ? <RendezVousGuide /> : <RecommendationGuide />}
    </div>
  );
}

function RendezVousGuide() {
  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Avant de commencer</p>
            <h2 className="mt-3 text-3xl text-white">
              Le client doit sentir qu'il est attendu, pas qu'il derange.
            </h2>
          </div>
          <StatusBadge label="Premiere impression" tone="blue" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <GuideSectionCard
            title="Preparation"
            subtitle="Tout doit etre deja pret avant l'arrivee."
            points={preparationPoints}
          />
          <GuideSectionCard
            title="Accueil"
            subtitle="Le sourire et le prenom change deja la tonalite."
            points={accueilPoints}
          />
          <GuideSectionCard
            title="Boisson"
            subtitle="Un vrai petit rituel d'arrivee, chaud ou froid."
            points={boissonPoints}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <GuideSectionCard
          title="Pause boisson & discussion"
          subtitle="Laisse gouter tranquillement et reste simple."
          points={[
            "Assieds-toi avec la personne et observe sa reaction.",
            "Explique les bienfaits simplement, sans jargon.",
            "Ce moment sert a baisser la pression et installer la relation."
          ]}
        />
        <GuideSectionCard
          title="Ecoute active"
          subtitle="Le but est de comprendre avant de proposer."
          points={relationPoints}
        />
        <GuideSectionCard
          title="Balance & chiffres"
          subtitle="Les chiffres doivent rassurer, pas juger."
          points={balancePoints}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Degustation produit</p>
              <h2 className="mt-3 text-3xl text-white">Faire sentir la valeur sans en faire trop</h2>
            </div>
            <StatusBadge label="Formula 1" tone="amber" />
          </div>

          <div className="grid gap-3">
            {shakePoints.map((point) => (
              <div
                key={point}
                className="rounded-[22px] border border-white/10 bg-[#0B0D11]/80 px-5 py-4 text-sm leading-7 text-[#F0EDE8]"
              >
                {point}
              </div>
            ))}
          </div>

          <div className="surface-soft rounded-[22px] px-5 py-4">
            <p className="eyebrow-label">Phrase utile</p>
            <p className="mt-3 text-sm leading-7 text-[#B0B4C4]">
              Ce qui compte, ce n'est pas ou tu es aujourd'hui, c'est ce qu'on va construire dans
              les prochaines semaines.
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Closing clair</p>
              <h2 className="mt-3 text-3xl text-white">Aider a choisir, pas mettre la pression</h2>
            </div>
            <StatusBadge label="Decision simple" tone="green" />
          </div>

          <div className="grid gap-3">
            {closingFlow.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#7A8099]">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Phrases utiles</p>
            <h2 className="mt-3 text-3xl text-white">Des formulations simples a garder</h2>
          </div>
          <StatusBadge label="A dire naturellement" tone="amber" />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {usefulPhrases.map((phrase) => (
            <div
              key={phrase}
              className="rounded-[22px] border border-white/10 bg-[#0B0D11]/80 px-5 py-4 text-sm leading-7 text-[#F0EDE8]"
            >
              {phrase}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RecommendationGuide() {
  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Recommandations</p>
            <h2 className="mt-3 text-3xl text-white">
              Un rappel simple pour demander des recos au bon moment, sans forcer.
            </h2>
          </div>
          <StatusBadge label="Moment cle" tone="red" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {recommendationHighlights.map((point) => (
            <div
              key={point}
              className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm leading-7 text-[#F0EDE8]"
            >
              {point}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Le bon deroule</p>
              <h2 className="mt-3 text-3xl text-white">Un script vivant, pas une pression de vente</h2>
            </div>
            <StatusBadge label="Presentiel" tone="blue" />
          </div>

          <div className="grid gap-3">
            {recommendationFlow.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#7A8099]">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[22px] bg-amber-300/10 px-5 py-4">
            <p className="eyebrow-label text-amber-100/80">Regle d'or</p>
            <p className="mt-3 text-sm leading-7 text-amber-50">
              Tu laisses vraiment le temps a la personne de remplir. Si tu reviens trop vite, tu
              coupes le moment et tu perds des noms.
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">A retenir</p>
              <h2 className="mt-3 text-3xl text-white">Les points a ne pas oublier</h2>
            </div>
            <StatusBadge label="Cadre simple" tone="green" />
          </div>

          <div className="grid gap-3">
            {recommendationRules.map((rule) => (
              <div
                key={rule}
                className="rounded-[22px] border border-white/10 bg-[#0B0D11]/80 px-5 py-4 text-sm leading-7 text-[#F0EDE8]"
              >
                {rule}
              </div>
            ))}
          </div>

          <div className="surface-soft rounded-[22px] px-5 py-4">
            <p className="eyebrow-label">Visio / en ligne</p>
            <div className="mt-3 grid gap-2">
              {visioReminder.map((point) => (
                <p key={point} className="text-sm leading-7 text-[#B0B4C4]">
                  {point}
                </p>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-white text-[#0B0D11]"
          : "bg-white/[0.04] text-[#F0EDE8] hover:bg-white/[0.08]"
      }`}
    >
      {label}
    </button>
  );
}

function GuideSectionCard({
  title,
  subtitle,
  points
}: {
  title: string;
  subtitle: string;
  points: string[];
}) {
  return (
    <div className="rounded-[26px] bg-white/[0.03] p-5">
      <p className="text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#7A8099]">{subtitle}</p>
      <div className="mt-4 grid gap-2">
        {points.map((point) => (
          <div
            key={point}
            className="rounded-[18px] bg-[#0B0D11]/60 px-4 py-3 text-sm leading-6 text-[#F0EDE8]"
          >
            {point}
          </div>
        ))}
      </div>
    </div>
  );
}
