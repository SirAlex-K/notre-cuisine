# Notre Cuisine 🍽️

App web en couple pour gérer les repas, les courses, le budget et la nutrition.

## Fonctionnalités

- **Dashboard** — budget de la semaine, calories du jour, résumé macros
- **Planning repas** — calendrier hebdomadaire pour toi et ta copine
- **Courses** — liste partagée avec prix et calcul du total
- **Journal alimentaire** — upload photo + analyse IA (macros automatiques) + suivi calories
- **Suivi poids** — graphique d'évolution pour vous deux

---

## Installation

### Prérequis

- **Node.js 18+** avec npm — [Télécharger Node.js](https://nodejs.org/) (⚠️ ton npm est actuellement cassé, réinstalle Node.js)
- Un compte [Supabase](https://supabase.com) (gratuit)
- Une clé API [OpenAI](https://platform.openai.com/api-keys) (pour l'analyse des photos)

---

### Étape 1 — Réinstaller Node.js

1. Désinstalle Node.js depuis le Panneau de configuration → Programmes
2. Télécharge et installe Node.js LTS depuis https://nodejs.org/
3. Vérifie : `node -v` et `npm -v` dans le terminal

---

### Étape 2 — Configurer Supabase

1. Crée un projet sur https://supabase.com
2. Va dans **SQL Editor** → **New query**
3. Copie-colle tout le contenu de `supabase/schema.sql` et exécute-le
4. Va dans **Settings** → **API** et copie :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Étape 3 — Variables d'environnement

Copie `.env.local.example` en `.env.local` :

```bash
cp .env.local.example .env.local
```

Puis remplis les valeurs :

```env
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
```

---

### Étape 4 — Installer et lancer

```bash
cd notre-cuisine
npm install
npm run dev
```

Ouvre http://localhost:3000 dans le navigateur.

---

### Étape 5 — Créer les deux comptes

1. Va sur http://localhost:3000/login
2. Clique **S'inscrire** et crée ton compte
3. Déconnecte-toi, ta copine s'inscrit avec son propre email
4. Vous êtes maintenant tous les deux dans la même app !

> Astuce : pour changer ton prénom affiché, va dans Supabase → Table Editor → profiles → modifie la colonne `name`

---

## Déploiement sur Vercel (gratuit)

### Option A — Via GitHub (recommandé)

1. Crée un repo sur https://github.com/new
2. Dans le dossier du projet :
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TON_USERNAME/notre-cuisine.git
   git push -u origin main
   ```
3. Va sur https://vercel.com → **Add New Project** → importe ton repo GitHub
4. Dans **Environment Variables**, ajoute tes 3 variables (SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY)
5. Clique **Deploy** → ton app est en ligne !

### Option B — Via Vercel CLI

```bash
npm i -g vercel
vercel
```

Puis configure les variables d'env dans le dashboard Vercel.

---

## Structure du projet

```
notre-cuisine/
├── app/
│   ├── (auth)/login/          # Page de connexion
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Layout commun avec navbar
│   │   ├── dashboard/         # Page d'accueil
│   │   ├── meal-plan/         # Planning repas
│   │   ├── groceries/         # Liste de courses
│   │   ├── food-log/          # Journal alimentaire
│   │   └── weight/            # Suivi du poids
│   └── api/analyze-meal/      # API route OpenAI
├── components/Navbar.tsx
├── lib/
│   ├── supabase.ts            # Client Supabase (browser)
│   ├── supabase-server.ts     # Client Supabase (server)
│   ├── types.ts               # Types TypeScript
│   └── utils.ts               # Helpers
└── supabase/schema.sql        # Schema base de données
```

---

## Personnalisation

- **Objectif calorique** : modifie `target_calories` dans la table `profiles` sur Supabase
- **Objectif de poids** : modifie `target_weight` dans la table `profiles` sur Supabase
- **Couleurs** : modifie `tailwind.config.ts` → couleur `brand`
