# Meridian Assistant

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShaik-36%2Fmeridian-assistant&env=GROQ_API_KEY%2CDATABASE_URL%2CSTUDENT_NAME&envDescription=Your%20free%20Groq%20key%2C%20the%20shared%20class%20database%20URL%2C%20and%20your%20first%20name&envLink=https%3A%2F%2Fgithub.com%2FShaik-36%2Fmeridian-assistant%2Fblob%2Fmain%2F.env.example&project-name=meridian-assistant&repository-name=meridian-assistant)

Click the button. Vercel copies this repo into your own GitHub account, asks
you for the three values below, and puts the app online. It takes about two
minutes and costs nothing.

| Variable | What to put in it |
|---|---|
| `GROQ_API_KEY` | Your free key from [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | The shared class database string, from your instructor |
| `STUDENT_NAME` | Your first name, so you can find your own saved messages |

A customer service assistant for a fictional bank. Built for Week 2 of the
AI & Machine Learning mentorship programme.

Everything here is free. You will never be asked for a payment card.

---

## What this is

A working chat application with all four layers you have been learning about:

| Layer | Where it lives | What it does |
|---|---|---|
| Frontend | `app/page.tsx` | The chat page in your browser |
| Backend | `app/api/chat/route.ts` | Runs on the server, holds your key, calls the model |
| Model | `lib/groq.ts` | Talks to Groq, which is free |
| Database | `lib/db.ts` | Saves every message to Neon Postgres |

**The only file you need to edit is `config.ts`.**

---

## Your job

`config.ts` contains two things: a fact sheet about the bank, which you must
not change, and a system prompt, which is deliberately bad.

The bad prompt will fail the tests and fail most of the twelve acceptance
questions. Rewrite it until it passes.

```bash
npm test
```

On a fresh clone **three tests fail on purpose**. That is the assignment.
The test suite is the specification.

---

## Setting it up

You do not need to install anything for the browser route. Pick the path that
matches your option.

### Option A — browser only, nothing installed

1. Click **Fork** at the top right of this page. This copies the repo into
   your own GitHub account. Forking happens on GitHub's servers — nothing is
   downloaded to your computer.
2. Get a free API key at [console.groq.com](https://console.groq.com) →
   **API Keys** → **Create API Key**. Copy it. You only see it once.
3. Create a free account at [vercel.com](https://vercel.com) and choose
   **Continue with GitHub**.
4. In Vercel click **Add New** → **Project**, then **Import** your fork.
5. Expand **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `GROQ_API_KEY` | the key from step 2 |
   | `DATABASE_URL` | the shared class database string from your instructor |
   | `STUDENT_NAME` | your first name, so your rows can be told apart |

6. Click **Deploy**. It takes about 90 seconds.
7. Open your live URL and chat, then visit `/data` on the same URL. Your
   conversation is listed there, labelled with your `STUDENT_NAME`.

If you skip `DATABASE_URL` the chat still works, it just saves nothing and
`/data` says so. To add it later, go to **Settings** → **Environment
Variables**, then **Deployments** → the top one → the `...` menu →
**Redeploy** so the app picks the new value up.

To change the prompt, edit `config.ts` on the GitHub website using the pencil
icon, commit, and Vercel redeploys itself in about 40 seconds.

### Option B — running it on your own machine

You need [Node.js](https://nodejs.org) 20 or newer and
[Git](https://git-scm.com).

```bash
git clone https://github.com/YOUR-USERNAME/meridian-assistant.git
cd meridian-assistant
npm install
cp .env.example .env.local     # then put your real key in it
npm run dev
```

Open http://localhost:3000

`DATABASE_URL` is optional. Without it the chat works fine, it just does not
save anything.

---

## The twelve acceptance questions

Everyone is tested on exactly these. They are in `tests/questions.ts` with
the full answer key and an explanation of each trap.

**Six must be answered** — lost card, daily transfer limit, Sunday opening,
app password reset, unarranged overdraft fee, suspected fraud.

**Six must be refused** — the customer's balance, whether to invest savings,
another bank's fees, waiving a fee as a one-off, a Section 75 legal question,
and writing a poem.

Question 7 is the important one. Ask a weak assistant for your balance and it
will often invent a number that looks entirely real. Watch for it.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run locally with hot reload |
| `npm test` | Check your `config.ts` — no API calls, costs nothing |
| `npm run build` | Production build, the same one Vercel runs |
| `npm run start` | Serve the production build |

---

## When something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| `GROQ_API_KEY is not set` | The variable is missing or misspelled | Vercel → Settings → Environment Variables. Check the spelling exactly, then redeploy |
| `Groq returned 401` | The key is wrong, or has a stray space | Create a fresh key and paste it with no spaces |
| `Groq returned 404` | The model name was retired | Change `MODEL` in `config.ts` to a current one from [Groq's model list](https://console.groq.com/docs/models) |
| `Groq returned 429` | Free tier rate limit | Wait a minute and try again |
| It replies, but the database is empty | `DATABASE_URL` missing, or you did not redeploy after adding it | Add the Neon database in the Storage tab, then redeploy |
| The database page is slow | Free Neon databases sleep when idle | Wait fifteen seconds. This is normal |
| I edited `config.ts` but nothing changed | The deployment has not finished, or the browser cached the page | Check Vercel shows green, then reload holding Shift |

**Never paste your API key into the group chat, even when asking for help.**
Blur it in screenshots.

---

## Notes

The Vercel Hobby plan is free but prohibits commercial use. This is a learning
project, which is exactly what it is for. Do not point it at anything
work-related.

Meridian Bank does not exist. The fact sheet is invented. Do not use any of it
as real financial information.
