# 🚀 PROMPT CLAUDE CODE — LOR'SQUAD WELLNESS — REFONTE COMPLÈTE

Tu vas refaire entièrement l'application Lor'Squad Wellness de façon professionnelle et production-ready.
Lis tout avant de commencer. Ne demande pas de confirmation à chaque étape — exécute tout dans l'ordre.

---

## 🎨 IDENTITÉ GRAPHIQUE — RÈGLES ABSOLUES

### Palette de couleurs
```
--lor-bg:        #0B0D11   (fond principal)
--lor-surface:   #13161C   (cartes, sidebar)
--lor-surface2:  #1A1E27   (inputs, hover)
--lor-border:    rgba(255,255,255,0.07)
--lor-border2:   rgba(255,255,255,0.12)
--lor-gold:      #C9A84C   (couleur principale, CTA, accents)
--lor-gold2:     #F0C96A   (gold clair, highlights)
--lor-teal:      #2DD4BF   (données santé, succès, body scan)
--lor-purple:    #A78BFA   (hydratation, stats secondaires)
--lor-coral:     #FB7185   (alertes, graisse viscérale, danger)
--lor-text:      #F0EDE8   (texte principal)
--lor-muted:     #7A8099   (texte secondaire)
--lor-muted2:    #4A5068   (texte tertiaire, placeholders)
```

### Typographie
- Titres/Logo : `font-family: 'Syne', sans-serif` — weight 700/800
- Corps : `font-family: 'DM Sans', sans-serif` — weight 300/400/500
- Ces fonts sont déjà dans index.html et tailwind.config.js

### Design system
- Border-radius cartes : 12px
- Border-radius inputs : 10px
- Border-radius badges : 20px (pills)
- Tous les fonds de page : #0B0D11
- Toutes les cartes : background #13161C, border 1px solid rgba(255,255,255,0.07)
- Bouton primaire : background #C9A84C, color #0B0D11, font Syne 700
- Bouton secondaire : border 1px solid rgba(255,255,255,0.1), color #7A8099
- Inputs : background #1A1E27, border rgba(255,255,255,0.08), focus border rgba(201,168,76,0.5)

---

## 🗄️ STRUCTURE BASE DE DONNÉES SUPABASE

### Exécute ces SQL dans Supabase SQL Editor :

```sql
-- ══════════════════════════════════════════
-- TABLE : profiles (extension de auth.users)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'coach' CHECK (role IN ('coach', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger auto-création profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════
-- TABLE : clients
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('homme', 'femme', 'autre')),
  height_cm NUMERIC(5,1),
  objective TEXT,
  notes TEXT,
  status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'inactif', 'pause')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- TABLE : bilans (bilan bien-être complet)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bilans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,

  -- Habitudes de vie
  wake_time TEXT,
  sleep_time TEXT,
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),

  -- Repas
  breakfast TEXT,
  breakfast_time TEXT,
  lunch TEXT,
  dinner TEXT,
  snacking TEXT,
  snacking_frequency TEXT,

  -- Hydratation
  water_liters NUMERIC(3,1),
  other_drinks TEXT,

  -- Activité physique
  sport_type TEXT,
  sport_frequency TEXT,
  sport_duration TEXT,

  -- Santé
  health_issues TEXT,
  medications TEXT,
  digestion_quality INTEGER CHECK (digestion_quality BETWEEN 1 AND 5),
  transit TEXT,

  -- Objectifs & freins
  main_objective TEXT,
  secondary_objective TEXT,
  blockers TEXT,
  motivation_level INTEGER CHECK (motivation_level BETWEEN 1 AND 5),

  -- Recommandations générées
  recommendations JSONB DEFAULT '[]',

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- TABLE : body_scans
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.body_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bilan_id UUID REFERENCES public.bilans(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE,

  -- Mesures
  weight_kg NUMERIC(5,2),
  fat_mass_percent NUMERIC(5,2),
  fat_mass_kg NUMERIC(5,2),
  muscle_mass_kg NUMERIC(5,2),
  bone_mass_kg NUMERIC(5,2),
  water_percent NUMERIC(5,2),
  visceral_fat_level INTEGER CHECK (visceral_fat_level BETWEEN 1 AND 59),
  bmr INTEGER,
  metabolic_age INTEGER,
  bmi NUMERIC(4,1),

  -- Mensurations optionnelles
  waist_cm NUMERIC(5,1),
  hip_cm NUMERIC(5,1),
  chest_cm NUMERIC(5,1),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- TABLE : suivis (check-in périodiques)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.suivis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  week_number INTEGER,

  -- Ressenti semaine
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  hunger_level INTEGER CHECK (hunger_level BETWEEN 1 AND 5),
  digestion_quality INTEGER CHECK (digestion_quality BETWEEN 1 AND 5),
  bloating INTEGER CHECK (bloating BETWEEN 1 AND 5),
  water_liters NUMERIC(3,1),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),

  -- Programme
  meals_respected BOOLEAN,
  prep_difficulty TEXT,
  small_victories TEXT,
  remaining_blockers TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- TABLE : produits (catalogue)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.produits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  pv NUMERIC(6,2),
  price_public NUMERIC(6,2),
  duration_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- TABLE : client_produits (suivi PV)
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.client_produits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  produit_id UUID REFERENCES public.produits(id) ON DELETE SET NULL,
  produit_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  expected_end_date DATE,
  pv NUMERIC(6,2),
  price_public NUMERIC(6,2),
  status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'terminé', 'pause', 'annulé')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- RLS (Row Level Security) — SÉCURITÉ
-- ══════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bilans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suivis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_produits ENABLE ROW LEVEL SECURITY;

-- Profiles : chacun voit/modifie uniquement son profil
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Clients : coach voit seulement ses propres clients
CREATE POLICY "clients_coach_own" ON public.clients
  FOR ALL USING (auth.uid() = coach_id);

-- Bilans : coach voit seulement ses bilans
CREATE POLICY "bilans_coach_own" ON public.bilans
  FOR ALL USING (auth.uid() = coach_id);

-- Body scans : coach voit seulement ses scans
CREATE POLICY "body_scans_coach_own" ON public.body_scans
  FOR ALL USING (auth.uid() = coach_id);

-- Suivis : coach voit seulement ses suivis
CREATE POLICY "suivis_coach_own" ON public.suivis
  FOR ALL USING (auth.uid() = coach_id);

-- Produits : tout le monde peut lire, admin peut écrire
CREATE POLICY "produits_read" ON public.produits
  FOR SELECT USING (true);

CREATE POLICY "produits_admin_write" ON public.produits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Client produits : coach voit seulement les siens
CREATE POLICY "client_produits_coach_own" ON public.client_produits
  FOR ALL USING (auth.uid() = coach_id);

-- ══════════════════════════════════════════
-- INDEX pour les performances
-- ══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_clients_coach ON public.clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_bilans_client ON public.bilans(client_id);
CREATE INDEX IF NOT EXISTS idx_bilans_coach ON public.bilans(coach_id);
CREATE INDEX IF NOT EXISTS idx_body_scans_client ON public.body_scans(client_id);
CREATE INDEX IF NOT EXISTS idx_suivis_client ON public.suivis(client_id);
CREATE INDEX IF NOT EXISTS idx_client_produits_client ON public.client_produits(client_id);
CREATE INDEX IF NOT EXISTS idx_client_produits_coach ON public.client_produits(coach_id);
```

---

## 📁 STRUCTURE DE FICHIERS À CRÉER

```
src/
├── lib/
│   ├── supabaseClient.ts        (déjà existant — ne pas toucher)
│   └── types.ts                 (types TypeScript globaux)
├── contexts/
│   └── AuthContext.tsx          (contexte auth global)
├── hooks/
│   ├── useClients.ts
│   ├── useBilans.ts
│   ├── useBodyScans.ts
│   └── useSuivis.ts
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx        (layout principal avec sidebar)
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── ScoreBar.tsx         (barre de progression body scan)
│   │   └── EmptyState.tsx
│   └── charts/
│       └── EvolutionChart.tsx   (graphique évolution poids/MG)
├── pages/
│   ├── LoginPage.tsx            (déjà fait)
│   ├── DashboardPage.tsx
│   ├── ClientsPage.tsx          (liste clients)
│   ├── ClientDetailPage.tsx     (fiche client complète)
│   ├── NewBilanPage.tsx         (formulaire bilan multi-étapes)
│   ├── BodyScanPage.tsx         (saisie + lecture body scan)
│   ├── SuiviPage.tsx            (check-in suivi)
│   ├── RecommandationsPage.tsx
│   └── SuiviPVPage.tsx          (module suivi produits)
└── App.tsx                      (routes)
```

---

## 📝 FICHIER : src/lib/types.ts

```typescript
export interface Profile {
  id: string
  full_name: string | null
  role: 'coach' | 'admin'
  avatar_url: string | null
  created_at: string
}

export interface Client {
  id: string
  coach_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  birth_date?: string
  gender?: 'homme' | 'femme' | 'autre'
  height_cm?: number
  objective?: string
  notes?: string
  status: 'actif' | 'inactif' | 'pause'
  created_at: string
  updated_at: string
}

export interface Bilan {
  id: string
  client_id: string
  coach_id: string
  date: string
  wake_time?: string
  sleep_time?: string
  sleep_quality?: number
  energy_level?: number
  stress_level?: number
  breakfast?: string
  breakfast_time?: string
  lunch?: string
  dinner?: string
  snacking?: string
  snacking_frequency?: string
  water_liters?: number
  other_drinks?: string
  sport_type?: string
  sport_frequency?: string
  sport_duration?: string
  health_issues?: string
  medications?: string
  digestion_quality?: number
  transit?: string
  main_objective?: string
  secondary_objective?: string
  blockers?: string
  motivation_level?: number
  recommendations: Recommendation[]
  notes?: string
  created_at: string
}

export interface BodyScan {
  id: string
  client_id: string
  coach_id: string
  bilan_id?: string
  date: string
  weight_kg?: number
  fat_mass_percent?: number
  fat_mass_kg?: number
  muscle_mass_kg?: number
  bone_mass_kg?: number
  water_percent?: number
  visceral_fat_level?: number
  bmr?: number
  metabolic_age?: number
  bmi?: number
  waist_cm?: number
  hip_cm?: number
  chest_cm?: number
  notes?: string
  created_at: string
}

export interface Suivi {
  id: string
  client_id: string
  coach_id: string
  date: string
  week_number?: number
  energy_level?: number
  hunger_level?: number
  digestion_quality?: number
  bloating?: number
  water_liters?: number
  sleep_quality?: number
  meals_respected?: boolean
  prep_difficulty?: string
  small_victories?: string
  remaining_blockers?: string
  notes?: string
  created_at: string
}

export interface ClientProduit {
  id: string
  client_id: string
  coach_id: string
  produit_id?: string
  produit_name: string
  start_date: string
  expected_end_date?: string
  pv?: number
  price_public?: number
  status: 'actif' | 'terminé' | 'pause' | 'annulé'
  notes?: string
  created_at: string
}

export interface Recommendation {
  category: string
  priority: 'haute' | 'moyenne' | 'basse'
  product?: string
  reason: string
}
```

---

## 📝 FICHIER : src/contexts/AuthContext.tsx

```typescript
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { Profile } from '../lib/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

---

## 📝 FICHIER : src/App.tsx (routes complètes)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import NewBilanPage from './pages/NewBilanPage'
import BodyScanPage from './pages/BodyScanPage'
import SuiviPage from './pages/SuiviPage'
import RecommandationsPage from './pages/RecommandationsPage'
import SuiviPVPage from './pages/SuiviPVPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ background: '#0B0D11', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,0.3)', borderTop: '2px solid #C9A84C', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/clients/:id/bilan/new" element={<NewBilanPage />} />
        <Route path="/clients/:id/scan/new" element={<BodyScanPage />} />
        <Route path="/clients/:id/suivi/new" element={<SuiviPage />} />
        <Route path="/recommandations" element={<RecommandationsPage />} />
        <Route path="/suivi-pv" element={<SuiviPVPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
```

---

## 📝 FICHIER : src/components/layout/AppLayout.tsx

Layout principal avec sidebar fixe à gauche et contenu à droite.
Utilise `<Outlet />` de react-router-dom pour le contenu des pages.

Structure :
- Sidebar 220px fixe à gauche (fond #13161C, border-right rgba(255,255,255,0.06))
- Zone contenu principale scrollable (fond #0B0D11)
- TopBar 60px en haut de la zone contenu

La sidebar contient :
- Logo Lor'Squad Wellness en haut
- Navigation : Dashboard, Clients, Nouveau bilan, Body Scan, Recommandations, Suivi PV
- En bas : avatar + nom du coach + bouton déconnexion

Utilise useAuth() pour afficher le nom du coach et gérer la déconnexion.
Navigation active : fond rgba(201,168,76,0.1), border-left 2px solid #C9A84C, texte #F0EDE8.
Navigation inactive : texte #7A8099, hover texte #F0EDE8.

---

## 📝 FICHIER : src/pages/DashboardPage.tsx

Dashboard principal avec :

**Stats en haut (4 cartes) :**
- Clients actifs (count de la table clients où status='actif')
- Bilans ce mois (count bilans du mois en cours)
- Taux de suivi (% clients avec un suivi dans les 30 derniers jours)
- Renouvellements à venir (client_produits dont expected_end_date dans les 7 jours)

**Section clients récents :**
- Les 5 derniers clients créés
- Nom, prénom, objectif, statut, date dernier bilan
- Bouton "Voir" qui navigue vers /clients/:id

**Section derniers body scans :**
- Les 3 derniers body scans
- Afficher : poids, masse grasse, masse musculaire avec barres de progression colorées
- Couleurs : masse grasse → #FB7185, masse musculaire → #2DD4BF, hydratation → #A78BFA

**Bouton flottant :**
- "Nouveau client" en bas à droite, fond #C9A84C

Toutes les données viennent de Supabase avec useEffect + useState.
Afficher un skeleton loading pendant le chargement (divs gris animés).
Gérer les erreurs avec un message d'erreur élégant (fond rgba(251,113,133,0.08)).

---

## 📝 FICHIER : src/pages/ClientsPage.tsx

Liste de tous les clients avec :
- Barre de recherche (filtre par nom/prénom en temps réel)
- Filtre par statut (actif / inactif / pause)
- Tri par date création, nom, dernier bilan
- Carte par client : avatar initiales, nom complet, objectif, statut badge, date dernier bilan, bouton "Voir fiche"
- Bouton "Nouveau client" qui ouvre une modale de création

**Modale création client :**
- Prénom (required), Nom (required)
- Email, Téléphone
- Date de naissance, Genre (select)
- Taille en cm
- Objectif principal (textarea)
- Bouton "Créer le client" → INSERT dans Supabase → fermer modale → rafraîchir liste

Pagination : 12 clients par page.

---

## 📝 FICHIER : src/pages/ClientDetailPage.tsx

Fiche client complète avec onglets :

**Onglet "Profil" :**
- Informations client éditables (prénom, nom, email, téléphone, objectif, notes)
- Bouton "Sauvegarder les modifications"
- Bouton "Nouveau bilan" → navigue vers /clients/:id/bilan/new
- Bouton "Body Scan" → navigue vers /clients/:id/scan/new

**Onglet "Historique bilans" :**
- Liste de tous les bilans du client (date, énergie, sommeil, hydratation)
- Possibilité de voir le détail de chaque bilan
- Graphique d'évolution si plusieurs bilans (énergie, sommeil, hydratation au fil du temps)

**Onglet "Body Scan" :**
- Dernier body scan en grand avec toutes les valeurs
- Barres de progression pour chaque métrique
- Zones normales indiquées (ex: masse grasse femme : 20-30%)
- Historique des scans précédents en tableau
- Évolution du poids en graphique simple (line chart avec les dates)

**Onglet "Suivis" :**
- Liste des check-ins hebdomadaires
- Bouton "Nouveau suivi" → navigue vers /clients/:id/suivi/new

**Onglet "Produits / PV" :**
- Liste des produits en cours avec dates et statut
- Calcul automatique : jours écoulés depuis le début, jours restants estimés
- Badge d'alerte si renouvellement dans moins de 7 jours
- Bouton "Ajouter un produit"

---

## 📝 FICHIER : src/pages/NewBilanPage.tsx

Formulaire de bilan en 5 étapes avec barre de progression en haut.

**Étape 1 — Rythme de vie :**
- Heure de réveil, heure de coucher
- Qualité du sommeil (1-5 étoiles cliquables)
- Niveau d'énergie (1-5)
- Niveau de stress (1-5)

**Étape 2 — Alimentation :**
- Petit-déjeuner habituel + heure
- Déjeuner, dîner
- Grignotage (oui/non + fréquence si oui)
- Boissons autres qu'eau

**Étape 3 — Hydratation & activité :**
- Litres d'eau par jour (slider 0-3.5L par pas de 0.25)
- Type de sport pratiqué
- Fréquence et durée des séances

**Étape 4 — Santé & transit :**
- Problèmes de santé connus
- Médicaments en cours
- Qualité de la digestion (1-5)
- Transit (régulier / irrégulier / constipation / accéléré)

**Étape 5 — Objectifs & freins :**
- Objectif principal (select : perte de poids / prise de muscle / énergie / bien-être / autre)
- Objectif secondaire
- Principaux freins (multiselect : manque de temps / motivation / budget / organisation / autre)
- Niveau de motivation (1-5)
- Notes libres du coach

**Navigation :**
- Boutons "Précédent" / "Suivant" entre étapes
- Bouton "Enregistrer le bilan" à la dernière étape
- Sauvegarde automatique en brouillon dans localStorage à chaque étape (clé : `bilan_draft_${clientId}`)
- À la soumission : INSERT dans bilans + générer recommandations automatiques + naviguer vers /clients/:id

**Recommandations automatiques à générer à la soumission :**
```
Si sleep_quality <= 2 → { category: 'Sommeil', priority: 'haute', product: 'Herbalife24 Rebuild Strength', reason: 'Qualité du sommeil insuffisante' }
Si water_liters < 1.5 → { category: 'Hydratation', priority: 'haute', product: 'Herbal Aloe Concentrate', reason: 'Hydratation en dessous des besoins' }
Si stress_level >= 4 → { category: 'Stress', priority: 'haute', reason: 'Niveau de stress élevé détecté' }
Si snacking === 'oui' && snacking_frequency inclut 'souvent' → { category: 'Grignotage', priority: 'moyenne', product: 'Formula 1 shake', reason: 'Grignotage fréquent' }
Si digestion_quality <= 2 → { category: 'Digestion', priority: 'haute', product: 'Herbal Aloe', reason: 'Digestion difficile' }
```

---

## 📝 FICHIER : src/pages/BodyScanPage.tsx

Page de saisie body scan en 2 parties :

**Partie 1 — Saisie des mesures :**
- Poids (kg), Masse grasse (%), Masse grasse (kg)
- Masse musculaire (kg), Masse osseuse (kg)
- Hydratation (%), Graisse viscérale (niveau 1-59)
- BMR (kcal), Âge métabolique
- IMC (calculé automatiquement si poids + taille connue)
- Mensurations optionnelles : tour de taille, hanches, poitrine

**Partie 2 — Lecture immédiate (s'affiche sous la saisie) :**
- Chaque métrique avec une barre de progression colorée
- Zone "normale" indiquée sur la barre
- Couleur selon le résultat : vert (#2DD4BF) = OK, orange (#C9A84C) = attention, rouge (#FB7185) = hors norme

**Zones de référence :**
```
Masse grasse homme : normale 10-20%, attention 20-25%, hors norme >25%
Masse grasse femme : normale 18-28%, attention 28-35%, hors norme >35%
Graisse viscérale : normale 1-9, attention 10-14, hors norme >=15
Hydratation : normale >55%, attention 50-55%, hors norme <50%
```

Bouton "Enregistrer le scan" → INSERT dans body_scans → naviguer vers fiche client.

---

## 📝 FICHIER : src/pages/SuiviPage.tsx

Formulaire de check-in hebdomadaire :

- Numéro de semaine (auto-calculé depuis le début du programme)
- Niveau d'énergie cette semaine (1-5 étoiles)
- Niveau de faim (1-5)
- Qualité de digestion (1-5)
- Ballonnements (1-5)
- Litres d'eau par jour (slider)
- Qualité du sommeil (1-5)
- Repas respectés (oui/non)
- Difficultés de préparation (textarea)
- Petites victoires de la semaine (textarea)
- Points qui bloquent encore (textarea)
- Notes coach (textarea)

Bouton "Enregistrer le suivi" → INSERT dans suivis → naviguer vers fiche client.

---

## 📝 FICHIER : src/pages/SuiviPVPage.tsx

Module suivi produits / points volume :

**Vue d'ensemble :**
- Total PV du mois en cours (somme des PV des produits actifs)
- Nombre de clients avec produits actifs
- Renouvellements cette semaine

**Liste des programmes actifs :**
- Par client : nom, produit, date de début, jours écoulés, jours restants
- Barre de progression du programme (jours écoulés / durée totale)
- Badge "Renouvellement imminent" si < 7 jours restants (fond rgba(251,113,133,0.1), texte #FB7185)
- Badge "Renouvellement à prévoir" si < 14 jours (fond rgba(201,168,76,0.1), texte #C9A84C)

**Ajout d'un programme :**
- Modale : sélection client, nom du produit, date de début, durée (jours), PV, prix public
- INSERT dans client_produits

---

## 🔧 HOOKS SUPABASE

### src/hooks/useClients.ts
```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Client } from '../lib/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setClients(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const createClient = async (data: Partial<Client>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { error } = await supabase.from('clients').insert({ ...data, coach_id: user.id })
    if (error) throw error
    await fetchClients()
  }

  const updateClient = async (id: string, data: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(data).eq('id', id)
    if (error) throw error
    await fetchClients()
  }

  return { clients, loading, error, createClient, updateClient, refetch: fetchClients }
}
```

Crée des hooks similaires pour useBilans, useBodyScans, useSuivis avec les mêmes patterns.

---

## 🎯 COMPOSANTS UI RÉUTILISABLES

### src/components/ui/Button.tsx
Variants : primary (fond #C9A84C), secondary (border), ghost (transparent), danger (fond rgba(251,113,133,0.1))
Props : variant, size (sm/md/lg), loading (affiche spinner), disabled, onClick, type, children
Spinner : div 16px avec border animation

### src/components/ui/Input.tsx
Props : label, placeholder, value, onChange, type, error (message), icon (ReactNode), required
Style : label uppercase 11px #7A8099, input fond #1A1E27, border rgba(255,255,255,0.08), focus border rgba(201,168,76,0.5)
Si error : border rgba(251,113,133,0.5) + message rouge en dessous

### src/components/ui/ScoreBar.tsx
Props : value (number), max (number), color (string), label (string), unit (string)
Affiche : label à gauche, valeur + unité à droite, barre de progression colorée entre les deux
Hauteur barre : 4px, border-radius 2px, fond #1A1E27

### src/components/ui/Badge.tsx
Props : variant ('success' | 'warning' | 'danger' | 'gold' | 'default'), children
Styles selon variant, pills arrondis, font 11px

### src/components/ui/EmptyState.tsx
Props : icon (string emoji), title, subtitle, action (bouton optionnel)
Centré, fond rgba(255,255,255,0.02), border dashed rgba(255,255,255,0.07), border-radius 12px

---

## ⚡ PERFORMANCE & QUALITÉ

1. **Error Boundaries** : crée `src/components/ErrorBoundary.tsx` qui catch les erreurs React et affiche un écran d'erreur élégant (fond #0B0D11, message en #F0EDE8, bouton "Recharger la page")

2. **Loading skeletons** : pour chaque liste (clients, bilans, scans), afficher 3-5 divs gris animés pendant le chargement
```css
@keyframes shimmer {
  0% { opacity: 0.4 }
  50% { opacity: 0.7 }
  100% { opacity: 0.4 }
}
```

3. **Pagination** : toutes les listes > 10 éléments sont paginées (12 par page), avec boutons Précédent/Suivant

4. **Optimistic updates** : après création/modification, mettre à jour le state local immédiatement sans attendre le refetch

5. **TypeScript strict** : pas de `any`, toutes les props typées, toutes les réponses Supabase typées

6. **Wrappage dans ErrorBoundary** dans App.tsx :
```tsx
<ErrorBoundary>
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
</ErrorBoundary>
```

---

## 🔒 VARIABLES D'ENVIRONNEMENT

Vérifie que `.env` contient :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
Si manquant, dis-le moi — ne pas hardcoder les clés.

---

## 📋 ORDRE D'EXÉCUTION

1. Crée `src/lib/types.ts`
2. Crée `src/contexts/AuthContext.tsx`
3. Crée les hooks dans `src/hooks/`
4. Crée les composants UI dans `src/components/ui/`
5. Crée `src/components/layout/AppLayout.tsx` + Sidebar + TopBar
6. Crée toutes les pages dans `src/pages/`
7. Met à jour `src/App.tsx` avec toutes les routes
8. Lance `npm run build` — corrige toutes les erreurs TypeScript
9. Lance `npm run dev` — vérifie que tout compile
10. Commit : `git add . && git commit -m "feat: refonte complète app Lor'Squad Wellness"`

---

## ✅ DÉFINITION DE "TERMINÉ"

- `npm run build` passe sans erreur
- Toutes les pages sont accessibles et stylisées
- L'auth redirige correctement (non connecté → /login, connecté → /dashboard)
- Les données Supabase se chargent correctement sur Dashboard et ClientsPage
- Le formulaire NewBilan sauvegarde correctement en base
- Le BodyScan affiche les barres de progression colorées
- Toute l'app respecte l'identité graphique dark premium (fond #0B0D11, accents #C9A84C / #2DD4BF)
