# STOCKLY — Handoff dokument i potpuni setup vodič

**Svrha dokumenta:**  
Ovaj dokument je potpuni handoff cijelog dosadašnjeg razgovora i rada na projektu **Stockly**. Napisan je tako da:

1. drugi AI agent može nastaviti rad bez ponavljanja setupa,
2. druga osoba može razumjeti što je već napravljeno,
3. isti dokument može poslužiti kao vodič za izradu sličnog projekta od nule.

> **VAŽNO — sigurnost**
>
> U dokumentu namjerno **nisu zapisane lozinke, secret/service-role ključevi niti stvarne vrijednosti environment varijabli**.
> Ne spremati secret vrijednosti u GitHub, screenshotove ili handoff dokumente.
> `.env.local` je lokalni izvor istine za development, a Vercel Environment Variables za produkciju.

---

# 1. Što je Stockly

Stockly je privatna zajednička web aplikacija za dvoje korisnika koja služi za:

- evidenciju stvari/proizvoda u kući,
- stanje zaliha u frižideru, ormarima, kupaonici itd.,
- zajedničku shopping listu,
- automatsko dodavanje artikala na shopping listu kada zaliha padne ispod minimuma,
- označavanje artikla kao potrošenog,
- ažuriranje stanja nakon kupnje,
- zajednički realtime pregled za oba korisnika,
- activity/history zapis promjena,
- kasnije push notifikacije / PWA.

Primjer logike:

```text
Mlijeko
Trenutno: 1
Minimum: 2
Željeno stanje: 4
Auto-add to shopping: ON

=> Stockly računa 4 - 1 = 3
=> Shopping lista: Mlijeko ×3
=> nakon "Kupljeno ×3" inventory ide na 4
```

---

# 2. Trenutno stanje projekta

## 2.1. Lokalni projekt

```text
C:\Projects\stockly
```

Projekt je kreiran kao:

- Next.js 16
- App Router
- TypeScript
- Tailwind CSS
- React Compiler
- ESLint
- `src/` directory
- Supabase JS + SSR

Trenutno lokalna aplikacija radi s:

```bat
cd C:\Projects\stockly
npm run dev
```

Lokalni URL:

```text
http://localhost:3000
```

---

## 2.2. GitHub

Repository:

```text
mrmslvx0608/stockly
```

Remote:

```text
https://github.com/mrmslvx0608/stockly.git
```

Repo je **private**.

Branch:

```text
main
```

Git je povezan s GitHubom preko Git Credential Managera.

Zadnja provjera je bila:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

Važni commitovi do sada:

```text
Initial Stockly setup
Add Supabase integration
a25b133 - Implement authentication and protected dashboard
6dfeb26 - Implement shared household inventory
```

---

## 2.3. Supabase

Organization:

```text
Stockly
```

Project:

```text
stockly
```

Plan:

```text
Free
```

Region:

```text
Europe / West EU (Ireland)
```

Postgres Type:

```text
Postgres (Default)
```

Security pri kreiranju projekta:

- Enable Data API: **ON**
- Automatically expose new tables: **OFF**
- Enable automatic RLS: **ON**

Supabase Auth je pripremljen.

Postoje **točno dva korisnika** kreirana ručno u Supabase Authentication > Users.

Email računi postojećih korisnika (samo placeholders):

```text
<USER_1_EMAIL>
<USER_2_EMAIL>
```

> Lozinke nisu zapisane u ovom dokumentu.

Authentication postavke:

- Email provider: **Enabled**
- Allow new users to sign up: **OFF**
- Allow manual linking: **OFF**
- Allow anonymous sign-ins: **OFF**
- Confirm email: **ON**

Dakle javni signup je zabranjen i aplikacija je zamišljena samo za unaprijed kreirane korisnike.

---

## 2.4. Vercel

Vercel workspace/team:

```text
Stockly
```

Plan:

```text
Hobby
```

Project:

```text
stockly
```

GitHub app permission je ograničen samo na repo:

```text
mrmslvx0608/stockly
```

Production domain:

```text
https://stockly-roan-tau.vercel.app
```

Deployment status:

```text
Ready
```

Vercel je povezan na `main` branch.

Svaki budući push na `main` automatski radi novi production deployment.

Trenutni production deployment je commit `6dfeb26` — **Implement shared household inventory**. Korisnik je potvrdio da ga je Vercel uspješno deployao u **Production** i da je postao current production deployment; production smoke test s oba postojeća korisnika prošao je **4. listopada 2026.** Detalji su u sekciji **2.7**.

## 2.5. FAZA 1 — Authentication: COMPLETE

FAZA 1 — Authentication + minimalni protected app shell je završena.
Korisnik je potvrdio ručnu provjeru lokalno i u produkciji; status je zabilježen **4. listopada 2026.**

Implementation commit za FAZU 1:

```text
a25b133 - Implement authentication and protected dashboard
```

Implementirano i ručno provjereno lokalno (`http://localhost:3000`) i u produkciji (`https://stockly-roan-tau.vercel.app`):

- `/login` koristi Supabase email/password authentication; uspješna prijava vodi na `/dashboard`.
- Nema public signup UI-ja, registracije, create-account, passwordless, social login ili public onboarding funkcionalnosti. Public signup ostaje **OFF**; Supabase hosted postavke nisu mijenjane.
- `/dashboard` je zaštićen i prikazuje "Welcome to Stockly", email prijavljenog korisnika i logout button.
- Neautorizirani pristup `/dashboard` preusmjerava na `/login`.
- Prijavljeni korisnik koji otvori `/login` preusmjerava se na `/dashboard`.
- Root route `/` preusmjerava prijavljenog korisnika na `/dashboard`, a neprijavljenog na `/login`.
- Logout odjavljuje korisnika i preusmjerava na `/login`.
- Supabase SSR session refresh koristi Next.js 16 proxy pattern; osvježeni cookies prenose se Server Componentsima i browseru.
- Oba postojeća, ručno kreirana korisnika mogu se prijaviti.
- Refresh stranice čuva korisničku sesiju.
- `npm run lint` prolazi.
- `npm run build` prolazi, uključujući TypeScript provjeru.
- Production deployment na postojećem Vercel projektu radi.

Auth implementacija koristi ove datoteke:

```text
src/app/auth/actions.ts          — sign-in i logout Server Actions
src/app/login/page.tsx           — login stranica i authenticated redirect
src/app/login/login-form.tsx     — email/password forma i inline errors
src/app/dashboard/page.tsx       — protected dashboard, email i logout
src/app/page.tsx                 — root auth redirect
src/proxy.ts                    — Next.js 16 proxy entry point
src/utils/supabase/proxy.ts      — SSR session refresh i cookie/cache headers
src/app/layout.tsx              — Stockly metadata i dark app shell
src/app/globals.css             — jednostavni dark stilovi
```

Postojeći `src/utils/supabase/client.ts` i `src/utils/supabase/server.ts` ostali su nepromijenjeni.
`.env.local` ostaje privatna i gitignored; environment vrijednosti i infrastruktura nisu mijenjani ni izloženi.
U FAZI 1 nisu dodane tablice, migracije, household model ili druge Stockly funkcionalnosti.

## 2.6. FAZA 2 — Database schema + shared household model: COMPLETE

FAZA 2 — Database schema + shared household model je završena.
Korisnik je potvrdio ručno izvršavanje migracije, bootstrap i runtime RLS provjeru na hosted Supabase projektu; status je zabilježen **4. listopada 2026.**

Migracija:

```text
supabase/migrations/20261004000000_create_shared_household_foundation.sql
```

- Migracija je pregledana i uspješno ručno izvršena u hosted Supabase SQL Editoru.
- Kreirana je `public.households`: UUID primary key s `gen_random_uuid()` defaultom, obavezni `name` i `created_at` s `now()` defaultom.
- Kreirana je `public.household_members`: obavezni `household_id` i `user_id` foreign keys prema `public.households(id)` i `auth.users(id)`, oba s `ON DELETE CASCADE`; composite primary key `(household_id, user_id)`; `role` dopušta samo `owner` i `member`, uz default `member`; `created_at` ima `now()` default. Dodan je index na `user_id`.
- Row Level Security je uključen na obje tablice.
- `private.is_household_member(uuid)` je recursion-safe `SECURITY DEFINER` helper u privatnoj schemi, s vlasnikom `postgres`, praznim `search_path` i schema-qualified referencama. Membership lookup zaobilazi RLS, a identitet pozivatelja provjerava preko `auth.uid()`, čime se izbjegava rekurzija membership policyja.
- `authenticated` klijenti imaju read-only pristup kroz RLS: mogu čitati samo households kojima pripadaju i membership retke tih households. SELECT policies su `households_select_for_members` i `household_members_select_for_members`.
- Za `households` i `household_members` client `INSERT`, `UPDATE` i `DELETE` policies ne postoje; client write grants nisu dodijeljeni. Promjene households i memberships ostaju admin-controlled.
- Kreiran je jedan zajednički Stockly household.
- Oba postojeća Auth korisnika dodana su u taj isti household: jedan kao `owner`, drugi kao `member`.
- Runtime RLS testiranje završeno je za oba authenticated korisnika. Svaki korisnik vidi točno **1 household** i **2 household membership retka**.
- `docs/database-setup.md` dokumentira ručni one-time bootstrap i SQL primjere s placeholderima.
- Lokalne provjere `npm run lint`, `npm run build` i 25 statičkih provjera migracije/dokumentacije prošle su.

Stvarni user UUIDs, email adrese, lozinke, secrets i environment vrijednosti nisu zapisani u ovoj potvrdi.
Auth korisnici i authentication postavke nisu mijenjani; `auth.users` nije izložen aplikaciji.
Inventory, shopping, activity, realtime, PWA, notifications i novi UI nisu implementirani u FAZI 2.

## 2.7. FAZA 3 — Inventory: COMPLETE IN PRODUCTION

FAZA 3 — prvi upotrebljivi zajednički household inventory je završena i potvrđena u produkciji (**COMPLETE IN PRODUCTION**).
Korisnik je potvrdio ručno izvršavanje migracije te application, validation, trigger i runtime RLS provjere; status je zabilježen **4. listopada 2026.**

Migracija:

```text
supabase/migrations/20261004010000_create_inventory_items.sql
```

- Migracija je pregledana i uspješno ručno izvršena u postojećem hosted Supabase SQL Editoru. Ne izvršavati je ponovno.
- `public.inventory_items` postoji s kolonama `id`, `household_id`, `name`, `quantity`, `unit`, `category`, `low_stock_threshold`, `created_at` i `updated_at`. UUID `id` ima `gen_random_uuid()` default; obavezni `household_id` referencira `public.households(id)` s `ON DELETE CASCADE`. Quantity i threshold koriste `numeric(12,3)`; threshold je opcionalan. Category i unit su jednostavna text polja s podrškom za custom vrijednosti. Dodan je index na `household_id`.
- RLS je uključen. Četiri `authenticated` policies su `inventory_items_select_for_members`, `inventory_items_insert_for_members`, `inventory_items_update_for_members` i `inventory_items_delete_for_members`. Sve koriste postojeći `private.is_household_member(household_id)` helper; UPDATE provjerava i postojeći i novi redak kroz `USING` i `WITH CHECK`.
- Owner i member imaju identičan inventory pristup. Default client privileges su revoked; `authenticated` ima SELECT i DELETE, column INSERT na `household_id` i editable poljima, te column UPDATE samo na `name`, `quantity`, `unit`, `category` i `low_stock_threshold`.
- Protected-column privilege provjere potvrđuju da `authenticated` ne može ažurirati `id`, `household_id`, `created_at` ili `updated_at`. Anonymous korisnici nemaju SELECT pristup inventoryju.
- `src/lib/household.ts` je server-only resolver: provjerava Auth korisnika preko `getUser()`, čita njegove membership retke kroz postojeći RLS uz filter na njegov `user_id` i zahtijeva točno jedan household. `household_id` dolazi iz tog server-side rezultata, nikad iz browser inputa.
- Sve inventory Server Actions koriste resolver. Edit, quantity update i delete filtriraju i item `id` i resolved `household_id`; quantity update mijenja samo quantity. Input se validira server-side, tekst se trimma, a uspješne promjene revalidiraju `/inventory`.
- `inventory_items_set_updated_at` trigger i `private.set_inventory_item_updated_at()` ručno su provjereni: `updated_at` se mijenja nakon izmjene artikla.
- Protected `/inventory` ima add/edit formu, inventory listu, quantity update, potvrdu brisanja, pending/error/empty states i low-stock oznaku. Dashboard ima Inventory link. Nema novih API routes.
- Oba postojeća korisnika ručno su provjerena: vide isti zajednički household inventory i oba mogu create, read, edit, change quantity i delete zajedničke artikle. Promjene jednog korisnika vidljive su drugom nakon refresh-a.
- Low-stock logika je potvrđena: `quantity <= low_stock_threshold`, samo kada threshold nije `null`. Decimalne količine do tri decimalna mjesta su potvrđene.
- Server-side validation je ručno provjeren bypassanjem browser validationa: negativne količine i vrijednosti s više od tri decimalna mjesta su odbijene, a spremljeni podaci ostali su nepromijenjeni.
- Runtime RLS isolation je ručno provjeren s rollback-only foreign-household fixtures: authenticated Stockly korisnik vidio je točno jedan household, nije mogao vidjeti foreign inventory item, ažurirati ga ili obrisati. Privremeni foreign household/item fixtures su rolled back.
- Lokalne implementation provjere `npm run lint` i `npm run build` prošle su, kao i 58 lokalnih mocked security/validation i statičkih migration provjera. Ručne hosted/runtime potvrde iznad dao je korisnik; agent nije izvršavao hosted SQL.

Implementation datoteke:

```text
src/lib/household.ts
src/app/inventory/page.tsx
src/app/inventory/actions.ts
src/app/inventory/types.ts
src/app/inventory/inventory-item-form.tsx
src/app/inventory/inventory-list.tsx
src/app/dashboard/page.tsx       — dodan Inventory link
```

FAZA 1 Authentication i FAZA 2 Shared Household ostaju funkcionalne i nepromijenjene; dashboard je dobio samo inventory navigaciju. Stvarni user UUIDs, email adrese, secrets, lozinke i environment vrijednosti nisu zapisani u ovoj potvrdi. Nema shopping synchronizationa, activity historyja, realtimea, PWA-a, notificationsa, barcode scanninga ili imagesa u ovoj fazi.

### Production deployment i smoke test — PASS

Korisnik je potvrdio production verification **4. listopada 2026.**:

- Commit `6dfeb26` (**Implement shared household inventory**) Vercel je uspješno deployao u **Production** i postao je current production deployment na postojećem Stockly projektu.
- User 1 uspješno je otvorio `/inventory` u produkciji i kreirao zajednički inventory item.
- User 2 vidio je isti item u produkciji i uspješno promijenio njegovu quantity.
- User 1 nakon refresh-a vidio je ažuriranu quantity.
- Low-stock state ispravno se ažurirao u produkciji.
- Time je potvrđeno da shared household inventory radi između oba postojeća korisnika u produkciji.
- Privremeni production test item obrisan je nakon provjere.
- Authentication i dashboard navigacija nastavili su raditi.

Production rezultati su korisnikova ručna potvrda; ovaj dokumentacijski update nije izvršavao deployment ili hosted database operacije.

**NEXT: FAZA 4 — Shopping list**, prema roadmapu u sekciji **33**. Low-stock automation ostaje FAZA 5.

---

# 3. Arhitektura projekta

```text
LOCAL DEVELOPMENT
C:\Projects\stockly
        |
        | git push
        v
GITHUB
mrmslvx0608/stockly
private repo
        |
        | automatic deploy
        v
VERCEL
https://stockly-roan-tau.vercel.app
24/7 hosting
        |
        v
SUPABASE
├── PostgreSQL
├── Authentication
├── Realtime
├── Storage (kasnije)
└── RLS
```

---

# 4. Instalirani alati i verzije

Na računalu su provjerene ove verzije:

```text
Node.js: v24.19.0
npm: 11.17.0
Git: 2.56.0.windows.1
Next.js: 16.3.8
create-next-app: 16.3.8
```

---

# 5. Potpuni kronološki setup — od nule

Ovo je točan workflow kojim je projekt postavljen.

---

## 5.1. GitHub repository

Na GitHubu je kreiran novi repository.

Postavke:

```text
Repository name: Stockly / stockly
Description: Shared home inventory and shopping planner
Visibility: Private
README: Off
.gitignore: No .gitignore
License: No license
```

Repo je inicijalno bio prazan.

---

# 6. Git instalacija na Windows

Na početku je:

```bat
git --version
```

vraćao:

```text
'git' is not recognized...
```

Zato je instaliran **Git for Windows 2.56.0**.

Tijekom instalacije odabrane / zadržane su standardne preporučene postavke.

Bitne postavke koje su potvrđene tijekom instalacije:

### Components

Standardni Git for Windows components.

### Start Menu Folder

```text
Git
```

### Initial branch

Ideja je koristiti:

```text
main
```

### PATH

Odabrano:

```text
Git from the command line and also from 3rd-party software
```

### SSH executable

Odabrano:

```text
Use bundled OpenSSH
```

### HTTPS transport backend

Odabrano:

```text
Use the native Windows Secure Channel library
```

### Line endings

Odabrano:

```text
Checkout Windows-style, commit Unix-style line endings
```

### Terminal emulator

Odabrano:

```text
Use MinTTY
```

### git pull behavior

Odabrano:

```text
Merge
```

### Credential helper

Odabrano:

```text
Git Credential Manager
```

### Extra options

Uključeno:

```text
Enable file system caching
Enable symbolic links
```

Nakon instalacije provjereno:

```bat
git --version
```

Rezultat:

```text
git version 2.56.0.windows.1
```

---

# 7. Kreiranje lokalnog Next.js projekta

Prvo je kreiran Projects folder:

```bat
mkdir C:\Projects
cd C:\Projects
```

Projekt je pokrenut:

```bat
npx create-next-app@latest stockly
```

Prvo je npm tražio potvrdu za instalaciju:

```text
Need to install:
create-next-app@16.3.8
Ok to proceed? (y)
```

Odabrano:

```text
y
```

---

## 7.1. create-next-app izbori

Na pitanju:

```text
Would you like to use the recommended Next.js defaults?
```

odabrano:

```text
No, customize settings
```

Zatim:

```text
TypeScript?                     Yes
Linter?                         ESLint
React Compiler?                 Yes
Tailwind CSS?                   Yes
Code inside src/ directory?     Yes
App Router?                     Yes
Customize import alias @/*?     No
Include AGENTS.md?              Yes
```

Projekt je kreiran u:

```text
C:\Projects\stockly
```

Dobiveno:

```text
Success! Created stockly at C:\Projects\stockly
```

---

# 8. npm upozorenja

Tijekom instalacije pojavilo se:

```text
5 high severity vulnerabilities
```

i prijedlog:

```bat
npm audit fix --force
```

**NAMJERNO NIJE POKRENUTO.**

Razlog: `--force` može uvesti breaking promjene i razbiti dependency tree.

Za nastavak projekta ne pokretati:

```bat
npm audit fix --force
```

bez prethodne analize.

---

# 9. Prvo lokalno pokretanje

Pokrenuto:

```bat
cd C:\Projects\stockly
npm run dev
```

Dobiveno:

```text
Next.js 16.3.8 (Turbopack)
Local: http://localhost:3000
Ready
```

U browseru je potvrđena default Next.js početna stranica.

Server je zaustavljen:

```text
Ctrl + C
```

Ako CMD pita:

```text
Terminate batch job (Y/N)?
```

odgovor:

```text
Y
```

---

# 10. Git inicijalizacija lokalnog projekta

`git status` je inicijalno javio:

```text
fatal: not a git repository
```

Zato je repo ručno inicijaliziran:

```bat
git init
git branch -M main
```

Remote je dodan:

```bat
git remote add origin https://github.com/mrmslvx0608/stockly.git
```

Provjera:

```bat
git remote -v
```

Rezultat:

```text
origin  https://github.com/mrmslvx0608/stockly.git (fetch)
origin  https://github.com/mrmslvx0608/stockly.git (push)
```

---

# 11. Git identity

Prvi commit je javio:

```text
Author identity unknown
```

Zato je postavljeno:

```bat
git config --global user.name "mrmslvx0608"
git config --global user.email "<YOUR_EMAIL>"
```

Provjera:

```bat
git config --global user.name
git config --global user.email
```

---

# 12. Prvi Git commit i push

Dodane datoteke:

```bat
git add .
```

Commit:

```bat
git commit -m "Initial Stockly setup"
```

Push:

```bat
git push -u origin main
```

GitHub je otvorio Git Credential Manager login.

Odabrano:

```text
Sign in with your browser
```

Na GitHubu autorizirano:

```text
Authorize Git Credential Manager / git-ecosystem
```

Push je završio:

```text
main -> main
branch 'main' set up to track 'origin/main'
```

---

# 13. Supabase — kreiranje računa i organizacije

Otvoren:

```text
https://supabase.com
```

Prijava:

```text
Continue with GitHub
```

GitHub autorizacija Supabasea je potvrđena.

Kreirana je Organization.

Prvotno je bio typo `Stickly`, zatim je ispravljeno u:

```text
Stockly
```

Organization settings:

```text
Type: Personal
Plan: Free - $0/month
```

---

# 14. Supabase — kreiranje projekta

Kreiran projekt:

```text
Project name: stockly
Database password: jaka lozinka (nije zapisano u ovom dokumentu)
Region: Europe
```

Security:

```text
Enable Data API: ON
Automatically expose new tables: OFF
Enable automatic RLS: ON
```

Advanced:

```text
Postgres Type: Postgres (Default)
```

Projekt je uspješno kreiran.

---

# 15. Supabase Connect za Next.js

U Supabase projektu kliknut:

```text
Connect
```

Odabrano:

```text
Framework: Next.js
Variant: App Router
```

Supabase je preporučio instalaciju:

```bat
npm install @supabase/supabase-js @supabase/ssr
```

To je izvršeno u:

```text
C:\Projects\stockly
```

Rezultat:

```text
added 10 packages
```

---

# 16. `.env.local`

U root projektu kreirana datoteka:

```text
C:\Projects\stockly\.env.local
```

Važno: Windows je prvo napravio:

```text
.env.local.txt
```

pa je uključeno:

```text
View > Show > File name extensions
```

i datoteka je preimenovana u:

```text
.env.local
```

Sadržaj:

```env
NEXT_PUBLIC_SUPABASE_URL=<SUPABASE_PROJECT_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY>
```

U dokumentu nisu zapisane stvarne vrijednosti.

---

# 17. `.gitignore`

Provjeren je postojeći `.gitignore`.

Sadrži:

```gitignore
# env files (can opt-in for committing if needed)
.env*
```

Zbog toga:

```text
.env.local
```

NE ide na GitHub.

To je provjereno s:

```bat
git status
```

`.env.local` se nije pojavio među staged/untracked datotekama.

---

# 18. Supabase helper datoteke

Kreiran folder:

```text
C:\Projects\stockly\src\utils\supabase
```

Kreirane datoteke:

```text
client.ts
server.ts
```

---

## 18.1. `src/utils/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

---

## 18.2. `src/utils/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Poziv iz Server Componenta može biti read-only.
            // Session refresh ćemo kasnije riješiti kroz proxy.
          }
        },
      },
    }
  );
}
```

---

# 19. Provjera Supabase setupa lokalno

Pokrenuto:

```bat
npm run dev
```

Dobiveno:

```text
Next.js 16.3.8
Local: http://localhost:3000
Environments: .env.local
Ready
```

To je potvrdilo da Next.js vidi `.env.local`.

---

# 20. Supabase Authentication korisnici

Otvoreno:

```text
Authentication > Users
```

Ručno su kreirana dva korisnika.

Za svakog:

```text
Email: korisnikov email
Password: jaka lozinka
Auto confirm user?: ON
```

Korisnici (email placeholders):

```text
<USER_1_EMAIL>
<USER_2_EMAIL>
```

---

# 21. Supabase — zabrana javne registracije

Otvoreno:

```text
Authentication > Sign In / Providers
```

Postavljeno:

```text
Allow new users to sign up: OFF
Allow manual linking: OFF
Allow anonymous sign-ins: OFF
Confirm email: ON
```

Email provider ostaje:

```text
Enabled
```

Dakle aplikacija nema javni signup.

---

# 22. Spremanje Supabase integracije u Git

Nakon instalacije Supabase dependencyja:

```bat
git status
```

pokazao je:

```text
modified: package-lock.json
modified: package.json
new file: src/utils/supabase/client.ts
new file: src/utils/supabase/server.ts
```

`.env.local` se nije pojavio.

Zatim:

```bat
git add .
git status
git commit -m "Add Supabase integration"
git push
```

Finalna provjera:

```bat
git status
```

Rezultat:

```text
nothing to commit, working tree clean
```

---

# 23. Vercel — kreiranje računa

Otvoren:

```text
https://vercel.com
```

Pokušaj login-a preko GitHuba javio je da social account još nije povezan s Vercel računom.

Zato je napravljen signup.

Plan:

```text
I'm working on personal projects
Hobby
```

Workspace/team naziv:

```text
Stockly
```

---

# 24. Vercel GitHub App

Vercel je tražio instalaciju GitHub aplikacije.

Na GitHubu odabrano:

```text
Only select repositories
```

i dopušten samo:

```text
mrmslvx0608/stockly
```

Ne `All repositories`.

Zatim kliknut:

```text
Install
```

---

# 25. Vercel import projekta

Na Vercelu se pojavio GitHub repo:

```text
stockly
```

Kliknut:

```text
Import
```

Project config:

```text
Vercel Team: Stockly
Plan: Hobby
Project Name: stockly
Root Directory: ./
Application Preset: Next.js
```

Build and Output Settings nisu ručno mijenjani.

---

# 26. Vercel Environment Variables

Prije deploymenta dodane su dvije varijable:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Vrijednosti su iste kao u lokalnom `.env.local`.

Environment scope:

```text
Production and Preview
```

Vercel Development env nije dodavan jer lokalni development koristi `.env.local`.

---

# 27. Optional Supabase Vercel integration

Vercel je ponudio:

```text
Optional Integrations > Supabase
```

To **nije dodano**.

Razlog: Supabase je već ručno i kontrolirano spojen kroz:

```text
.env.local
Vercel Environment Variables
@supabase/supabase-js
@supabase/ssr
client.ts
server.ts
```

Ne uvoditi duplu konfiguraciju bez razloga.

---

# 28. Vercel deployment

Nakon kreiranja projekta kliknut je:

```text
Deploy
```

Deployment je završio porukom:

```text
Congratulations!
You just deployed a new project to Stockly.
```

Production URL:

```text
https://stockly-roan-tau.vercel.app
```

URL je otvoren i potvrđeno je da radi default Next.js stranica.

To znači da aplikacija već sada radi **24/7**, neovisno o lokalnom računalu.

---

# 29. Provjera Vercel environment varijabli

U:

```text
Vercel > stockly > Environment Variables
```

potvrđeno je da postoje:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Scope:

```text
Production and Preview
```

---

# 30. Supabase URL Configuration

Otvoreno:

```text
Authentication > URL Configuration
```

## Site URL

Postavljeno:

```text
https://stockly-roan-tau.vercel.app
```

## Redirect URLs

Dodano:

```text
http://localhost:3000/**
https://stockly-roan-tau.vercel.app/**
```

Spremljeno.

To omogućuje Auth flow i lokalno i u produkciji.

---

# 31. Što je ZAVRŠENO

Setup infrastrukture, FAZA 1 — Authentication, FAZA 2 — Database schema + shared household model i FAZA 3 — Inventory su završeni. Detalji authentication provjere nalaze se u sekciji **2.5**, household setupa u **2.6**, a inventory implementacije i ručnih hosted/application/RLS provjera u **2.7**.

## Gotovo

```text
✅ Node.js
✅ npm
✅ Git
✅ GitHub private repo
✅ Next.js 16
✅ TypeScript
✅ Tailwind
✅ React Compiler
✅ App Router
✅ src directory
✅ AGENTS.md
✅ Supabase project
✅ Supabase JS
✅ Supabase SSR
✅ .env.local
✅ .gitignore protection
✅ Supabase client helper
✅ Supabase server helper
✅ 2 Auth users
✅ public signup disabled
✅ automatic RLS for new tables
✅ GitHub push workflow
✅ Vercel Hobby project
✅ GitHub -> Vercel auto deployment
✅ Production environment variables
✅ Production URL
✅ Supabase production Site URL
✅ localhost auth redirect
✅ production auth redirect
✅ FAZA 1 — Authentication + protected app shell
✅ email/password login bez public signup UI-ja
✅ protected dashboard i auth redirects
✅ logout
✅ Supabase SSR session refresh proxy
✅ oba postojeća korisnika mogu se prijaviti
✅ refresh čuva sesiju
✅ npm run lint / npm run build
✅ authentication provjeren lokalno i u produkciji
✅ FAZA 2 — Database schema + shared household model
✅ migracija pregledana i ručno izvršena u hosted Supabase SQL Editoru
✅ public.households i public.household_members
✅ RLS na obje tablice i private.is_household_member(uuid) helper
✅ authenticated read-only pristup za households/memberships; bez client write policies za te tablice
✅ jedan zajednički household; postojeća dva korisnika kao owner i member
✅ runtime RLS za oba korisnika: svaki vidi 1 household i 2 membership retka
✅ docs/database-setup.md — ručni bootstrap postupak
✅ FAZA 3 — Inventory: COMPLETE IN PRODUCTION
✅ inventory migracija pregledana i ručno izvršena; public.inventory_items i updated_at trigger
✅ authenticated inventory CRUD kroz četiri membership RLS policies; anonymous SELECT zabranjen
✅ server-side household resolver; edit/quantity/delete scope po item id i household_id
✅ protected columns, foreign-household isolation i rollback fixtures ručno provjereni
✅ oba korisnika upravljaju istim inventoryjem; promjene vidljive nakon refresh-a
✅ low-stock oznaka, tri decimalna mjesta i server-side validation ručno provjereni
✅ 6dfeb26 — Implement shared household inventory: Vercel Production deployment, current production deployment
✅ production smoke test s oba korisnika: shared item create/read/quantity update, refresh i low-stock state
✅ production test item obrisan; authentication i dashboard navigacija rade
```

---

# 32. Što NIJE još napravljeno

Authentication, minimalni protected app shell, zajednički household database foundation i prvi zajednički inventory su implementirani i ručno provjereni. Preostale Stockly funkcionalnosti još nisu implementirane.

Nije napravljeno:

```text
❌ shopping tables
❌ activity table
❌ shopping i activity RLS policies
❌ realtime sync
❌ low-stock automatika
❌ PWA
❌ push notifications
❌ final design
```

Sljedeća je FAZA 4 — Shopping list; ostale funkcionalnosti slijede fazu po fazu. Inventory low-stock oznaka postoji; low-stock automatika ostaje za FAZU 5.

---

# 33. Plan implementacije za Codex

Ne raditi sve u jednom ogromnom promptu.

Preporučeni redoslijed:

```text
FAZA 1 — COMPLETE
Authentication + protected app shell

FAZA 2 — COMPLETE
Database schema + shared household model

FAZA 3 — COMPLETE IN PRODUCTION
Inventory

FAZA 4 — NEXT
Shopping list

FAZA 5
Low-stock automation

FAZA 6
Activity log

FAZA 7
Realtime sync

FAZA 8
PWA

FAZA 9
Push notifications

FAZA 10
UI polish
```

Nakon svake faze:

```text
Codex napravi promjene
↓
pregled git diff
↓
npm lint / build
↓
lokalni test
↓
commit
↓
push
↓
Vercel auto deploy
↓
production test
```

---

# 34. Prvi Codex zadatak — povijesni prompt za završenu FAZU 1

Ovo je izvorni prompt za FAZU 1, sačuvan kao povijesna referenca. FAZE 1, 2 i 3 su **COMPLETE**; ne implementirati ih ponovno. Sljedeća je FAZA 4 — Shopping list.

```text
We are building a private web app called Stockly.

Tech stack:
- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase
- @supabase/ssr

Supabase is already configured with:
- src/utils/supabase/client.ts
- src/utils/supabase/server.ts
- .env.local with:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

There are already exactly two users created manually in Supabase Authentication.

Public sign-up is disabled in Supabase.

Implement authentication only.

Requirements:

1. Create a /login page.
2. Login must use email and password with Supabase Auth.
3. There must be NO sign-up, register or create-account functionality.
4. After successful login, redirect the user to /dashboard.
5. If login credentials are invalid, show a clear error message on the login page.
6. Create a protected /dashboard page.
7. If an unauthenticated user visits /dashboard, redirect them to /login.
8. If an authenticated user visits /login, redirect them to /dashboard.
9. Add a logout button on the dashboard.
10. Logout should sign the user out and redirect them to /login.
11. Use the existing Supabase client/server helper files.
12. Keep the implementation simple and minimal.
13. Use Next.js App Router best practices.
14. Do not implement inventory, shopping list, database tables or any other Stockly features yet.
15. Do not add public signup.
16. Do not expose any secret keys.
17. Run lint/type checks after implementation and fix any errors.

For the initial UI:
- Dark modern design
- App name: Stockly
- Login card centered on the screen
- Email field
- Password field
- "Sign in" button
- Simple Stockly branding
- Dashboard can be minimal for now with:
  "Welcome to Stockly"
  current logged-in user's email
  logout button

Before making changes, inspect the existing project structure and reuse what is already there.
```

---

# 35. Funkcionalni plan Stocklyja

Predložena glavna navigacija:

```text
Stockly
├── Dashboard
├── Inventory
├── Shopping
└── Activity
```

---

# 36. Inventory model — plan

Ovo je širi budući plan, ne trenutni schema. Implementirana FAZA 3 koristi kolone iz sekcije **2.7** (`quantity` i opcionalni `low_stock_threshold`, text category/unit). Location, target quantity i auto-add-to-shopping nisu implementirani.

Svaki proizvod treba imati barem:

```text
name
category
location
current_quantity
unit
minimum_quantity
target_quantity
auto_add_to_shopping
```

Preporučene lokacije:

```text
Frižider
Zamrzivač
Kuhinjski ormari
Kupaonica
Ostalo
```

Primjer:

```text
Mlijeko

Lokacija: Frižider
Kategorija: Hrana
Trenutno: 1 kom
Minimum: 2 kom
Cilj: 4 kom
Auto shopping: ON
```

---

# 37. Shopping logika — plan

Shopping lista treba podržati:

- ručno dodavanje,
- automatsko dodavanje iz inventoryja,
- količinu,
- označavanje kao kupljeno,
- automatsko povećanje inventory količine.

Primjer:

```text
inventory:
Mlijeko = 1
minimum = 2
target = 4

shopping:
Mlijeko ×3
```

Nakon kupnje:

```text
inventory:
1 + 3 = 4
```

Shopping item se zatvara/označava kao completed.

---

# 38. Activity log — plan

Primjeri:

```text
23:14
Stella dodala Nutellu na shopping

22:50
Mislav kupio WC papir ×8

22:31
Mislav potrošio 1 × Mlijeko
```

Activity treba kasnije koristiti oba korisnika / household.

---

# 39. Realtime — plan

Poželjno je da oba korisnika vide promjene praktički odmah.

Kasnija faza:

```text
Supabase Realtime
```

Primjeri:

- partner doda item na shopping listu,
- drugi korisnik vidi promjenu bez refresh-a,
- inventory se ažurira oboma,
- activity se osvježava oboma.

---

# 40. Push notifikacije — NE raditi odmah

Push notifications namjerno ostaviti za kasniju fazu.

Razlog:

- browser permissions,
- service worker,
- PWA,
- push subscriptions,
- VAPID/web-push,
- mobilne razlike.

Prvo stabilizirati:

```text
Auth
Inventory
Shopping
Automation
Activity
Realtime
```

Tek onda:

```text
PWA
Push notifications
```

---

# 41. Predloženi daily development workflow

Na početku rada:

```bat
cd C:\Projects\stockly
git status
git pull
npm install
npm run dev
```

Nakon Codex promjena:

```bat
git status
git diff
```

Test:

```bat
npm run lint
npm run build
```

Ako je sve dobro:

```bat
git add .
git commit -m "Opis promjene"
git push
```

Vercel će tada automatski deployati `main`.

---

# 42. Pravila za drugog AI agenta

Ako drugi agent dobije ovaj dokument, neka **NE ponavlja setup**.

Prvo treba pretpostaviti da je infrastruktura spremna.

Prije izmjena neka provjeri:

```bat
cd C:\Projects\stockly
git status
git remote -v
git branch
```

Treba očekivati:

```text
branch: main
remote: origin -> mrmslvx0608/stockly
```

Zatim:

```bat
npm run dev
```

i provjeriti:

```text
http://localhost:3000
```

Production test:

```text
https://stockly-roan-tau.vercel.app
```

---

# 43. Što agent NE smije napraviti

Ne raditi bez razloga:

```text
❌ novi GitHub repo
❌ novi Supabase project
❌ novi Vercel project
❌ ponovno instalirati Git
❌ ponovno pokretati create-next-app
❌ commitati .env.local
❌ stavljati secret/service_role key u client kod
❌ uključiti javni signup
❌ uključiti Automatically expose new tables
❌ npm audit fix --force
❌ dodavati Vercel Supabase integration bez potrebe
❌ mijenjati production URL bez ažuriranja Supabase URL Configuration
```

---

# 44. Sigurnosna pravila

## Nikad ne commitati

```text
.env
.env.local
service_role key
secret key
database password
OAuth client secrets
VAPID private key
```

## Client-side smije koristiti

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

## Server-only tajne

Ako se kasnije dodaju:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
VAPID_PRIVATE_KEY
```

one ne smiju imati prefix:

```text
NEXT_PUBLIC_
```

---

# 45. Kako napraviti ISTI setup za neki drugi projekt

Ovaj dio je generički reusable vodič.

Pretpostavimo:

```text
APP_NAME=MyApp
REPO_NAME=myapp
LOCAL_PATH=C:\Projects\myapp
```

---

## Korak A — GitHub

Kreirati:

```text
Private repository
No README
No .gitignore
No license
```

---

## Korak B — lokalni Next.js projekt

```bat
cd C:\Projects
npx create-next-app@latest myapp
```

Preporučeno:

```text
TypeScript: Yes
ESLint: Yes
React Compiler: Yes
Tailwind: Yes
src/: Yes
App Router: Yes
Default @/* alias: Yes
AGENTS.md: Yes
```

---

## Korak C — Git

```bat
cd C:\Projects\myapp
git init
git branch -M main
git remote add origin https://github.com/USERNAME/myapp.git
git add .
git commit -m "Initial setup"
git push -u origin main
```

---

## Korak D — Supabase

Kreirati:

```text
Organization
Project
Free plan
Europe region
Postgres default
Enable Data API
Disable automatically expose new tables
Enable automatic RLS
```

Instalirati:

```bat
npm install @supabase/supabase-js @supabase/ssr
```

`.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Provjeriti `.gitignore`:

```gitignore
.env*
```

---

## Korak E — Supabase helpers

`src/utils/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

`src/utils/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

---

## Korak F — Auth

Ako je privatna aplikacija:

```text
Create users manually
Auto confirm: ON
Disable public signups
Email provider: Enabled
Anonymous sign-ins: OFF
```

---

## Korak G — Vercel

Signup preko GitHub.

Plan:

```text
Hobby
```

GitHub app:

```text
Only select repositories
```

Import repo.

Project config:

```text
Root Directory: ./
Framework: Next.js
```

Environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Scope:

```text
Production and Preview
```

Deploy.

---

## Korak H — Supabase URL Configuration

Site URL:

```text
https://YOUR-PRODUCTION-DOMAIN.vercel.app
```

Redirect URLs:

```text
http://localhost:3000/**
https://YOUR-PRODUCTION-DOMAIN.vercel.app/**
```

---

# 46. Troubleshooting koji se već dogodio

## Problem: `git` nije prepoznat

Poruka:

```text
'git' is not recognized...
```

Rješenje:

```text
Install Git for Windows
Choose PATH option:
Git from command line and also from 3rd-party software
```

---

## Problem: `git status` kaže not a repository

Poruka:

```text
fatal: not a git repository
```

Rješenje:

```bat
git init
git branch -M main
```

---

## Problem: Author identity unknown

Rješenje:

```bat
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
```

---

## Problem: `.env.local.txt`

Windows skriva ekstenzije.

Rješenje:

```text
File Explorer
View
Show
File name extensions
```

Preimenovati:

```text
.env.local.txt
```

u:

```text
.env.local
```

---

## Problem: Vercel login javlja account not found

Razlog: GitHub account još nije povezan s Vercel userom.

Rješenje:

```text
Sign Up
Continue with GitHub
```

ne samo Log In.

---

## Problem: Vercel ne vidi GitHub repo

Rješenje:

```text
Install Vercel GitHub App
Only select repositories
stockly
Install
```

---

# 47. Trenutni projektni identifikatori

## Lokalno

```text
C:\Projects\stockly
```

## GitHub

```text
mrmslvx0608/stockly
```

## Git remote

```text
https://github.com/mrmslvx0608/stockly.git
```

## Branch

```text
main
```

## Supabase organization

```text
Stockly
```

## Supabase project

```text
stockly
```

## Vercel workspace

```text
Stockly
```

## Vercel project

```text
stockly
```

## Production URL

```text
https://stockly-roan-tau.vercel.app
```

---

# 48. Handoff — što je prvi sljedeći konkretan korak

**NE raditi novi setup i NE ponavljati završene FAZE 1, 2 i 3.**

FAZA 1 je **COMPLETE**, commit `a25b133 - Implement authentication and protected dashboard`.
Authentication je ručno provjeren lokalno i u produkciji, a `npm run lint` i `npm run build` prolaze.
FAZA 2 je **COMPLETE**: migracija je pregledana i ručno izvršena u hosted Supabase SQL Editoru; jedan shared household s postojećim owner/member korisnicima je kreiran. Runtime RLS potvrđuje da oba korisnika vide točno 1 household i 2 membership retka. Detalji su u sekciji **2.6**, a bootstrap u `docs/database-setup.md`.
FAZA 3 je **COMPLETE IN PRODUCTION**: inventory migracija je pregledana i ručno izvršena; oba korisnika upravljaju istim inventoryjem. Updated-at trigger, low-stock logika, decimalne količine, server-side validation, protected-column privileges i foreign-household runtime RLS isolation ručno su potvrđeni. Test fixtures su rolled back. Commit `6dfeb26` (**Implement shared household inventory**) uspješno je deployan kroz Vercel u Production i postao je current production deployment. Production smoke test potvrdio je shared item create/read/quantity update između oba korisnika, vidljivost nakon refresh-a i ispravan low-stock state; privremeni test item je obrisan, a authentication i dashboard navigacija rade. Detalji su u sekciji **2.7**; database/application/RLS provjere su i u `docs/database-setup.md`.

Sljedeći korak je nastavak rada u postojećem projektu:

```text
Open Codex
Open existing local project:
C:\Projects\stockly
```

Sljedeća faza:

```text
FAZA 4 — NEXT
Shopping list
```

Prije implementacije FAZE 4 pročitati `AGENTS.md` i ovaj dokument, provjeriti Git stanje te nastaviti koristiti postojeću Supabase, GitHub i Vercel infrastrukturu, postojeća dva Auth korisnika i njihov zajednički household.
Sačuvati postojeću authentication implementaciju, zabranu public signupa, database foundation iz FAZE 2 i provjereni inventory iz FAZE 3. Ne izvršavati ponovno dovršene migracije ili bootstrap. Prompt iz sekcije **34** ostaje samo povijesna referenca.
Sljedeći zadatak je Shopping list prema roadmapu u sekciji **33**. Low-stock automation je FAZA 5; ostale faze ostaju za kasnije.

---

# 49. Završni status

**Infrastructure setup: COMPLETE**

```text
✅ Local dev ready
✅ Git ready
✅ GitHub ready
✅ Supabase ready
✅ Auth accounts ready
✅ Production hosting ready
✅ Automatic deployment ready
✅ Environment variables ready
✅ Auth redirect URLs ready
```

**Phase 1: Authentication — COMPLETE**

```text
✅ login/logout/protected dashboard
✅ authenticated /login redirect i root auth redirect
✅ Supabase SSR session refresh proxy
✅ oba postojeća korisnika se mogu prijaviti
✅ refresh čuva sesiju; unauthorized dashboard access -> /login
✅ npm run lint / npm run build prolaze
✅ ručna lokalna i production provjera potvrđena od korisnika
✅ Vercel production deployment radi
Commit: a25b133 - Implement authentication and protected dashboard
```

**Phase 2: Database schema + shared household model — COMPLETE**

```text
✅ supabase/migrations/20261004000000_create_shared_household_foundation.sql pregledana i ručno izvršena u hosted Supabase SQL Editoru
✅ public.households i public.household_members kreirane; RLS uključen na obje
✅ private.is_household_member(uuid) — recursion-safe SECURITY DEFINER helper
✅ authenticated read-only pristup za households/memberships kroz RLS; bez write policies za te tablice
✅ jedan zajednički Stockly household; oba postojeća Auth korisnika dodana kao owner i member
✅ runtime RLS testiranje završeno za oba korisnika: svaki vidi točno 1 household i 2 membership retka
✅ docs/database-setup.md dokumentira ručni bootstrap postupak
```

**Phase 3: Inventory — COMPLETE IN PRODUCTION**

```text
✅ supabase/migrations/20261004010000_create_inventory_items.sql pregledana i ručno izvršena u hosted Supabase SQL Editoru
✅ public.inventory_items s devet kolona; RLS i četiri authenticated CRUD policies
✅ postojeći private.is_household_member(household_id) helper; owner/member jednak pristup
✅ household_id iz server-only Auth/membership resolvera; browser ownership input se ne koristi
✅ edit/quantity/delete scope po item id i resolved household_id
✅ authenticated ne može update id/household_id/created_at/updated_at; anonymous nema SELECT
✅ updated_at trigger ručno provjeren; oba korisnika imaju shared inventory CRUD
✅ promjene vidljive drugom korisniku nakon refresh-a
✅ quantity <= threshold za non-null threshold; tri decimalna mjesta ručno provjerena
✅ bypass browser validation: negativne i preprecizne količine odbijene bez promjene podataka
✅ foreign-household runtime RLS SELECT/UPDATE/DELETE isolation potvrđen; fixtures rolled back
✅ npm run lint / npm run build i 58 lokalnih security/validation/static provjera prošli tijekom implementacije
✅ FAZE 1 i 2 ostaju funkcionalne i nepromijenjene
✅ 6dfeb26 — Implement shared household inventory: Vercel Production deployment, current production deployment
✅ oba korisnika prošla production smoke test: shared create/read/quantity update, refresh i low-stock state
✅ privremeni production test item obrisan; authentication i dashboard navigacija rade
```

**NEXT: Phase 4 — Shopping list**

Ostale funkcionalnosti još nisu implementirane.

---

# 50. Kratki TL;DR za agenta

```text
Project: Stockly
Local: C:\Projects\stockly
GitHub: mrmslvx0608/stockly
Branch: main
Production: https://stockly-roan-tau.vercel.app
Stack: Next.js 16 + TypeScript + Tailwind + Supabase SSR
Auth: 2 manually created email/password users
Public signup: OFF
RLS for new tables: ON
Vercel auto-deploy: ON
Supabase client/server helpers: already created
.env.local: exists locally and is gitignored
Phase 1: Authentication + protected app shell — COMPLETE
Implementation commit: a25b133 - Implement authentication and protected dashboard
Auth checks: manually verified locally and in production by the user
Both existing users: login works
Session refresh proxy: implemented; page refresh preserves the session
Unauthorized dashboard access: redirects to /login
Login/root auth redirects and logout: verified
npm run lint: PASS
npm run build: PASS
Vercel production deployment: working
Current production deployment: 6dfeb26 - Implement shared household inventory (Vercel Production)
Phase 2: Database schema + shared household model — COMPLETE
Migration: supabase/migrations/20261004000000_create_shared_household_foundation.sql
Migration reviewed and manually executed successfully in hosted Supabase SQL Editor
Tables: public.households and public.household_members; RLS enabled on both
Helper: private.is_household_member(uuid), recursion-safe SECURITY DEFINER
Household/membership access: authenticated SELECT only through RLS; no write policies for those tables
Shared household: one Stockly household with the two existing Auth users (one owner, one member)
Runtime RLS: completed for both authenticated users; each sees exactly 1 household and 2 membership rows
Manual bootstrap documentation: docs/database-setup.md

Phase 3: Inventory — COMPLETE IN PRODUCTION
Implementation commit: 6dfeb26 - Implement shared household inventory
Deployment: successfully deployed by Vercel to Production; became the current production deployment
Production smoke test: User 1 opened /inventory and created a shared item; User 2 saw it and changed quantity
Production smoke test: User 1 saw updated quantity after refresh; low-stock state updated correctly
Production result: shared household inventory works between both existing users
Production cleanup: temporary test item deleted after verification
Production regression check: authentication and dashboard navigation continued working
Migration: supabase/migrations/20261004010000_create_inventory_items.sql
Migration reviewed and manually executed successfully in hosted Supabase SQL Editor
Table: public.inventory_items; RLS enabled; four authenticated CRUD policies using existing membership helper
Ownership: server-only resolver from verified Auth user; exactly one membership required; browser household_id not trusted
Edit/quantity/delete: both item id and resolved household_id filters
Privileges: protected-column UPDATE denied; anonymous SELECT denied
Manual checks: both existing users share inventory CRUD; changes visible after refresh
Manual checks: updated_at trigger, low stock for non-null threshold, three decimal places
Manual validation: browser checks bypassed; negative/overprecision quantities rejected; stored data unchanged
Runtime RLS isolation: Stockly user sees one household; foreign inventory SELECT/UPDATE/DELETE denied
Temporary foreign household/item fixtures: rolled back
Phases 1 and 2: still working and unchanged

DO NOT redo setup.
DO NOT reimplement Phases 1, 2 or 3, rerun the completed migrations/bootstrap, or enable public signup.

NEXT TASK:
Phase 4 — Shopping list (roadmap section 33).
Then continue phase-by-phase with low-stock automation, activity, realtime, PWA, notifications.
```
