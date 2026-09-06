# Setup Louisa Shopping — guide WSL2 (Ubuntu)

Toutes les commandes ci-dessous s'exécutent dans ton terminal WSL2 (pas PowerShell/CMD Windows).

## 0. Prérequis (une seule fois)

```bash
# Node 22 LTS via nvm (si pas déjà installé)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v   # doit afficher v22.x

# Git (généralement déjà présent sous WSL2 Ubuntu)
git --version

# Netlify CLI
npm install -g netlify-cli
netlify --version

# GitHub CLI (facultatif, pratique pour créer le repo + secrets en ligne de commande)
sudo apt update && sudo apt install -y gh
```

## 1. Récupérer les fichiers livrés

Télécharge l'archive `louisa-devops-setup.zip` fournie dans le chat, puis :

```bash
mkdir -p ~/projects/louisa-shopping
cd ~/projects/louisa-shopping
unzip ~/louisa-devops-setup.zip -d .
# Adapte le chemin ci-dessus si ton dossier de téléchargements WSL est différent,
# ex: /mnt/c/Users/<toi>/Downloads/louisa-devops-setup.zip
```

Structure attendue après extraction :

```
louisa-shopping/
├── package.json, tsconfig.json, .gitignore, postcss.config.js
├── next.config.ts, tailwind.config.ts, drizzle.config.ts, netlify.toml
├── instrumentation.ts, sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
├── lighthouserc.json, .env.example
├── .github/workflows/ci-cd.yml
├── devops-reference.md
└── src/
    ├── app/{layout.tsx,page.tsx,globals.css}   ← placeholders, agent UI les remplacera
    └── lib/cloudinary/loader.ts
```

⚠️ **Ne touche pas à `src/lib/db/`** : c'est le périmètre de l'agent DB — ces fichiers arrivent séparément et ne sont pas dans cette archive.

## 2. Installer les dépendances

```bash
npm install
```

Les versions dans `package.json` datent de ma dernière vérification (09/2026, publiée après mon cutoff d'entraînement) — `npm install` résout automatiquement vers les dernières versions compatibles. Si tu veux la toute dernière minor de chaque paquet :

```bash
npx npm-check-updates -u
npm install
```

## 3. Variables d'environnement locales

```bash
cp .env.example .env.local
```

Remplis `.env.local` avec tes vraies valeurs (Supabase, Upstash, Cloudinary, Sentry, Better Auth — voir `devops-reference.md` §3 pour le détail de chaque variable). **Ne commite jamais ce fichier** (`.gitignore` l'exclut déjà).

## 4. Premier lancement local

```bash
npm run dev
```

→ http://localhost:3000 doit afficher "Louisa Shopping — setup DevOps OK." (page placeholder, en attendant les livrables de l'agent UI).

## 5. Initialiser Git + repo GitHub

```bash
git init
git add .
git commit -m "chore: init setup DevOps (Netlify/CI-CD/Sentry)"

# Avec gh CLI :
gh repo create louisa-shopping --private --source=. --remote=origin
git push -u origin main

# Sans gh CLI : crée le repo sur github.com puis
git remote add origin git@github.com:<ton-user>/louisa-shopping.git
git branch -M main
git push -u origin main
```

## 6. Créer le site Netlify

```bash
netlify login
netlify init
# Choisir "Create & configure a new site"
# Build command: npm run build
# Publish directory: .next
```

Note l'**API ID** du site (`netlify status` ou dashboard → Site settings → Site information) : c'est ta valeur `NETLIFY_SITE_ID`.

Génère un token personnel : dashboard Netlify → User settings → Applications → New access token → c'est ta valeur `NETLIFY_AUTH_TOKEN`.

**Désactive les builds automatiques Netlify** (Site settings → Build & deploy → Stop builds) — le déploiement passe uniquement par GitHub Actions (voir `devops-reference.md` §2, évite un double build).

Déclare les variables d'environnement de prod dans Netlify (Site settings → Environment variables) — mêmes noms que `.env.example`.

## 7. Secrets GitHub Actions

```bash
# Avec gh CLI, un par un :
gh secret set NETLIFY_AUTH_TOKEN
gh secret set NETLIFY_SITE_ID
gh secret set NEXT_PUBLIC_SUPABASE_URL
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_ROLE_KEY
gh secret set DATABASE_URL
gh secret set BETTER_AUTH_SECRET
gh secret set BETTER_AUTH_URL
gh secret set UPSTASH_REDIS_REST_URL
gh secret set UPSTASH_REDIS_REST_TOKEN
gh secret set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
gh secret set CLOUDINARY_API_KEY
gh secret set CLOUDINARY_API_SECRET
gh secret set NEXT_PUBLIC_SENTRY_DSN
gh secret set SENTRY_AUTH_TOKEN
gh secret set SENTRY_ORG
gh secret set SENTRY_PROJECT
```

Chaque commande demande la valeur en saisie masquée. Sans `gh` : GitHub → repo → Settings → Secrets and variables → Actions → New repository secret (mêmes noms).

## 8. Vérifier le pipeline

```bash
git checkout -b test/ci
git commit --allow-empty -m "test: déclenche le pipeline"
git push -u origin test/ci
gh pr create --fill
```

→ Ouvre la PR sur GitHub : le job `quality` puis `deploy-preview` (Lighthouse CI) doivent passer au vert. Merge sur `main` pour déclencher `deploy-production`.

## 9. Supabase — éviter la pause auto (7j d'inactivité, cf. devops-reference §5)

Pas d'automatisation en V1 (hors périmètre demandé), mais si tu veux un keep-alive minimal dès maintenant :

```yaml
# .github/workflows/supabase-keepalive.yml (optionnel, pas fourni par défaut)
on:
  schedule:
    - cron: '0 6 * * 1'  # tous les lundis
```

Je peux te le générer si tu le veux — dis-le-moi.

---

**Ordre recommandé pour la suite** : une fois ce setup validé (page placeholder visible + pipeline vert), c'est à l'agent **DB** de livrer `src/lib/db/` (schéma, client, migrations) en premier — les autres agents (UI, Admin, Logique métier) s'alignent dessus (règle du premier agent, §6).
