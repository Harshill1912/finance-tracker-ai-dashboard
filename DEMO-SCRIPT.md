# FinancePro AI — Demo Recording Script

**App URL:** http://localhost:5173
**Backend:** local, on port 5000, against MongoDB in Docker (`finance-mongo`).

The frontend probes `localhost:5000` first and only falls back to Render if nothing answers.
With the local backend running it uses that, so the demo is fully local and fast.

To bring the stack up from cold:

```bash
docker start finance-mongo
```

```bash
npm --prefix backend start
```

The frontend dev server is already running. Confirm everything is healthy before recording:

```bash
curl http://localhost:5000/api/health
```

Expect `200` with `"database":"connected"`.

Target length: **6–8 minutes**. Record the browser window only, not the whole desktop.

---

## Before you hit record

- [ ] Log in at http://localhost:5173/login (the app redirects every protected route to login without a token)
- [ ] Close extra tabs, hide the bookmarks bar, set browser zoom to 100%
- [ ] Pick light **or** dark mode and stay there — except for the one deliberate toggle in step 1
- [ ] Have a spare expense/budget ready to create live (creating something on camera is far more convincing than showing static data)

---

## 1. Landing page — `/`  *(~30s)*

Show the hero, scroll through the feature section, then hit the **dark mode toggle** in the navbar and back.

> "FinancePro AI is a full-stack personal finance dashboard — budgeting, expense tracking, investments, group splitting, and an AI advisor on top of all of it."

## 2. Auth — `/login`  *(~20s)*

Show the login screen and point out **Google OAuth** alongside email/password. Sign in.

> "Email and password, or one-tap Google sign-in. JWT-backed sessions."

## 3. Dashboard — `/dashboard`  *(~60s)*

The money shot. Walk top to bottom:

- Stat cards with **vs-last-month** deltas
- Investment summary with total returns
- Budget progress bars
- Goals progress
- Recent transactions
- The **floating AI button** (bottom corner) — mention it, don't click yet

> "Everything rolls up here — spend, budgets, portfolio, and goals in one view, each card deep-linking into its own section."

## 4. Expenses — `/expenses`  *(~75s)*

- Show the expense list and filters
- **Add an expense live** — this is where the AI auto-categorization fires. Type something ambiguous like "Uber to airport" and let it pick the category itself
- Click into one expense for the detail view (`/expenses/:id`)

> "I never pick a category — the AI reads the description and classifies it."

## 5. Budgets — `/budgets`  *(~75s)*

- Donut chart breakdown
- **Create a budget live**, then edit it
- Trigger **AI Budget Recommendations** — the model proposes limits from actual spend history
- Show the over-budget warning state if you have one

> "It doesn't just track budgets, it proposes them based on what I actually spend."

## 6. Reports — `/report`  *(~90s)*

Richest AI surface in the app. Hit each panel:

- **Key Insights**
- **Smart Recommendations**
- **Spending Forecast** (3-month projection)
- **Unusual Expenses** — anomaly detection
- **Monthly Insights** + the filters panel
- The **wrapped** summary (monthly/yearly recap)

> "Forecasting and anomaly detection — it flags spending that breaks my own pattern."

## 7. Investments — `/investments`  *(~60s)*

- Portfolio holdings with live prices (stocks, mutual funds, gold)
- **AI Portfolio Insights**
- **Asset Allocation** chart
- **Risk Exposure** chart

## 8. Split Expenses — `/split`  *(~75s)*

The Splitwise-style module — good differentiator, give it room:

- Create or open a group
- Add a shared expense and show the split math
- **Balance summary** — who owes whom
- Show the invitation flow and a **payment link** (`/pay/:token`)
- Mention email/SMS notifications (Nodemailer + Twilio)

## 9. Goals — `/goals`  *(~40s)*

Goal progress tracking with **AI suggestions** for hitting targets faster.

## 10. AI Chatbot — `/ai`  *(~60s)*

Close on the strongest feature. Ask it something real and specific:

> "Where am I overspending this month, and what should I cut?"

Let the answer render fully on camera — it has context on the actual account data, and that's the point.

## 11. Settings & Profile — `/settings`, `/profile`  *(~20s)*

Quick pass. Profile, preferences, `/payment-details` for payout info.

---

## Closing line

> "React 19 and Tailwind on the front, Node and Express with MongoDB behind it, and Cohere driving the categorization, forecasting, and advice."

---

## Recording on Windows

| Tool | How | Notes |
|---|---|---|
| **Xbox Game Bar** | `Win + G`, or `Win + Alt + R` to start/stop | Built in. Records the active window with mic audio. Easiest option. |
| **Snipping Tool** | Open it, switch to the **record** tab | Built into Windows 11. No mic audio. |
| **OBS Studio** | Scene → Window Capture | Best quality and control. Worth it if you want a polished cut. |
| **ClipChamp** | — | Preinstalled on Win 11 for trimming afterwards. |

**Mic on** if you're narrating — Game Bar defaults it off. Check the audio slider before the take.

---

## Gotchas

- **Every protected route bounces to `/login` without a token.** Log in first or the recording will be a loop of login screens.
- **The local database starts empty.** Sign up a fresh account, then add a few expenses, a budget, and a goal before recording — an empty dashboard demos nothing. The AI panels (forecast, anomalies, recommendations) need spending history to say anything interesting.
- **Docker must be running.** If MongoDB is down the backend retries with backoff and every auth call returns `503`. `docker ps` should show `finance-mongo`.
- **Do a dry run first.** Especially the AI panels — they take a few seconds and you want to know the timing before the real take.
