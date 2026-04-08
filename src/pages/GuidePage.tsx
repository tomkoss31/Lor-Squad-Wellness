import { useState } from "react";
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
    <div className="space-y-6 rounded-[30px] bg-[linear-gradient(180deg,#F6F8FB_0%,#EEF3F9_100%)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)] md:p-6 xl:p-7">
      <GuideHero activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "rdv" ? <RendezVousGuide /> : <RecommendationGuide />}
    </div>
  );
}

function GuideHero({
  activeTab,
  onTabChange
}: {
  activeTab: GuideTab;
  onTabChange: (tab: GuideTab) => void;
}) {
  return (
    <div className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFE_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-3 rounded-full bg-[#EEF4FA] px-3.5 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#708096]">
              Guide rendez-vous
            </span>
          </div>
          <h1 className="mt-4 text-balance text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[#182230] md:text-[3rem]">
            Guide rendez-vous
          </h1>
          <p className="mt-3 max-w-[52rem] text-[15px] leading-7 text-[#526072] md:text-[16px]">
            Des reperes simples pour accueillir, expliquer et conclure avec justesse.
          </p>
        </div>
        <StatusBadge label="Calme + pro" tone="green" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <GuideTabButton
          active={activeTab === "rdv"}
          label="Conduite du rendez-vous"
          onClick={() => onTabChange("rdv")}
        />
        <GuideTabButton
          active={activeTab === "recos"}
          label="Recommandations"
          onClick={() => onTabChange("recos")}
        />
      </div>
    </div>
  );
}

function RendezVousGuide() {
  return (
    <div className="space-y-6">
      <GuidePanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="guide-eyebrow">Avant de commencer</p>
            <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
              Le client doit sentir qu&apos;il est attendu, pas qu&apos;il derange.
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
            subtitle="Le sourire et le prenom changent deja la tonalite."
            points={accueilPoints}
          />
          <GuideSectionCard
            title="Boisson"
            subtitle="Un vrai petit rituel d'arrivee, chaud ou froid."
            points={boissonPoints}
          />
        </div>
      </GuidePanel>

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
        <GuidePanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="guide-eyebrow">Degustation produit</p>
              <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
                Faire sentir la valeur sans en faire trop
              </h2>
            </div>
            <StatusBadge label="Formula 1" tone="amber" />
          </div>

          <div className="grid gap-3">
            {shakePoints.map((point) => (
              <GuidePointCard key={point}>{point}</GuidePointCard>
            ))}
          </div>

          <div className="rounded-[24px] border border-[#DCE6F0] bg-[#EEF4FA] px-5 py-4">
            <p className="guide-eyebrow">Phrase utile</p>
            <p className="mt-3 text-sm leading-7 text-[#526072]">
              Ce qui compte, ce n&apos;est pas ou tu es aujourd&apos;hui, c&apos;est ce qu&apos;on va construire dans
              les prochaines semaines.
            </p>
          </div>
        </GuidePanel>

        <GuidePanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="guide-eyebrow">Closing clair</p>
              <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
                Aider a choisir, pas mettre la pression
              </h2>
            </div>
            <StatusBadge label="Decision simple" tone="green" />
          </div>

          <div className="grid gap-3">
            {closingFlow.map((item) => (
              <GuideInfoCard key={item.title} title={item.title} detail={item.detail} />
            ))}
          </div>
        </GuidePanel>
      </div>

      <GuidePanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="guide-eyebrow">Phrases utiles</p>
            <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
              Des formulations simples a garder
            </h2>
          </div>
          <StatusBadge label="A dire naturellement" tone="amber" />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {usefulPhrases.map((phrase) => (
            <GuidePointCard key={phrase}>{phrase}</GuidePointCard>
          ))}
        </div>
      </GuidePanel>
    </div>
  );
}

function RecommendationGuide() {
  return (
    <div className="space-y-6">
      <GuidePanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="guide-eyebrow">Recommandations</p>
            <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
              Un rappel simple pour demander des recos au bon moment, sans forcer.
            </h2>
          </div>
          <StatusBadge label="Moment cle" tone="red" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {recommendationHighlights.map((point) => (
            <GuidePointCard key={point}>{point}</GuidePointCard>
          ))}
        </div>
      </GuidePanel>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <GuidePanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="guide-eyebrow">Le bon deroule</p>
              <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
                Un script vivant, pas une pression de vente
              </h2>
            </div>
            <StatusBadge label="Presentiel" tone="blue" />
          </div>

          <div className="grid gap-3">
            {recommendationFlow.map((item) => (
              <GuideInfoCard key={item.title} title={item.title} detail={item.detail} />
            ))}
          </div>

          <div className="rounded-[24px] border border-[#F2D7A5] bg-[rgba(239,197,141,0.16)] px-5 py-4">
            <p className="guide-eyebrow text-[#9D6F1B]">Regle d&apos;or</p>
            <p className="mt-3 text-sm leading-7 text-[#5F4B20]">
              Tu laisses vraiment le temps a la personne de remplir. Si tu reviens trop vite, tu
              coupes le moment et tu perds des noms.
            </p>
          </div>
        </GuidePanel>

        <GuidePanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="guide-eyebrow">A retenir</p>
              <h2 className="mt-3 text-balance text-[2rem] leading-[1.05] text-[#182230]">
                Les points a ne pas oublier
              </h2>
            </div>
            <StatusBadge label="Cadre simple" tone="green" />
          </div>

          <div className="grid gap-3">
            {recommendationRules.map((rule) => (
              <GuidePointCard key={rule}>{rule}</GuidePointCard>
            ))}
          </div>

          <div className="rounded-[24px] border border-[#DCE6F0] bg-[#EEF4FA] px-5 py-4">
            <p className="guide-eyebrow">Visio / en ligne</p>
            <div className="mt-3 grid gap-2">
              {visioReminder.map((point) => (
                <p key={point} className="text-sm leading-7 text-[#526072]">
                  {point}
                </p>
              ))}
            </div>
          </div>
        </GuidePanel>
      </div>
    </div>
  );
}

function GuideTabButton({
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
          ? "bg-[linear-gradient(180deg,#72C5FF_0%,#59B7FF_100%)] text-[#07111F] shadow-[0_10px_24px_rgba(89,183,255,0.18)]"
          : "border border-[#D7E2ED] bg-white text-[#526072] hover:bg-[#F4F8FC]"
      }`}
    >
      {label}
    </button>
  );
}

function GuidePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFDFE_100%)] p-5 shadow-[0_18px_38px_rgba(15,23,42,0.05)] md:p-6">
      {children}
    </div>
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
    <div className="rounded-[28px] border border-[#E0E8F1] bg-[#FCFDFE] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <p className="text-xl font-semibold text-[#182230]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#526072]">{subtitle}</p>
      <div className="mt-4 grid gap-2.5">
        {points.map((point) => (
          <GuidePointCard key={point}>{point}</GuidePointCard>
        ))}
      </div>
    </div>
  );
}

function GuideInfoCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-[#E0E8F1] bg-[#FCFDFE] px-5 py-4">
      <p className="text-lg font-semibold text-[#182230]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#526072]">{detail}</p>
    </div>
  );
}

function GuidePointCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[#E2EBF3] bg-[#F7FAFD] px-4 py-3 text-sm leading-6 text-[#314154]">
      {children}
    </div>
  );
}
