# Car-Km-Tracker 🚗📊

**Car-Km-Tracker** is an open-source Telegram bot + Cloudflare Worker application for tracking car mileage against a contractual mileage limit (leasing, long-term rental, company car, etc.).

The project is generic: each user can deploy their own instance, connect their own Telegram bot, and keep their own mileage data in their own Cloudflare D1 database.

> **Repository:** https://github.com/viktec/Car-Km-Tracker
>
> If you find the project useful, you can give the repository a ⭐ on GitHub.

---

# 1. What it does

The bot tracks:

- current odometer value
- kilometres used against the contract
- kilometres remaining
- percentage of the contract allowance used
- average daily usage
- remaining daily budget
- projected kilometres at contract end
- trip categories such as office, gym, shopping and travel
- daily, weekly, monthly and yearly trip totals
- an undo action for the last odometer entry

## Important: the odometer is an absolute value

If the car dashboard says:

~~~
5081 km
~~~

then the contract usage is **5081 km**.

The application does **not** subtract the first odometer value entered into the bot.

---

# 2. Architecture

~~~
Telegram
   │
   │ HTTPS webhook
   ▼
Cloudflare Worker
   │
   ▼
Cloudflare D1
   │
   ├── contracts
   ├── odometer_readings
   └── trips

GitHub
   │
   └── source code + automatic deployment
~~~

Components:

- **Telegram** — user interface.
- **Cloudflare Workers** — runs the bot backend.
- **Cloudflare D1** — online SQLite-compatible database.
- **GitHub** — public source-code repository.
- **Cloudflare Git integration** — can automatically deploy the Worker when code is pushed to the production branch.

D1 is available on Cloudflare Workers Free and Paid plans. Current limits can change, so check Cloudflare's official pricing documentation before running a high-volume installation.

Official documentation:

- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare GitHub integration: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/

---

# 3. What you need

You need:

1. A Cloudflare account.
2. A GitHub account.
3. A Telegram account.
4. A Telegram bot created with BotFather.
5. A computer.
6. A browser.
7. A terminal / Command Prompt for a few simple commands.

You do **not** need:

- a VPS
- a server running 24/7
- Docker
- a local database
- to keep your computer switched on

After deployment, the application runs online on Cloudflare.

---

# 4. Step 1 — Create Cloudflare account

Go to:

https://dash.cloudflare.com/

Create an account or log in.

For a small personal bot, start with the Workers Free plan.

You do not need to buy a domain just to use the default Cloudflare workers.dev address.

---

# 5. Step 2 — Create the D1 database

For beginners, use the Cloudflare dashboard.

1. Open **Workers & Pages**.
2. Open **D1 SQL Database**.
3. Click **Create Database**.
4. Name it:

~~~
car-km-tracker
~~~

5. Create the database.

Cloudflare gives the database a unique ID.

The database ID is an identifier, not a password. It can appear in wrangler.toml.

Official D1 guide:

https://developers.cloudflare.com/d1/get-started/

---

# 6. Step 3 — Create the Telegram bot

Open Telegram and search for:

~~~
@BotFather
~~~

BotFather is Telegram's official bot-management account.

Send:

~~~
/newbot
~~~

BotFather asks for:

## Bot name

Example:

~~~
Car Km Tracker
~~~

## Bot username

Example:

~~~
car_km_tracker_bot
~~~

The username must end in bot.

BotFather then gives you a **bot token**.

It looks similar to:

~~~
123456789:AAExampleToken...
~~~

## IMPORTANT

The bot token is a password.

Never put it in:

- GitHub
- README
- src/index.js
- wrangler.toml
- screenshots
- public issues
- chat messages

Store it only as a Cloudflare encrypted secret.

Telegram says that anyone with the bot token can control the bot, so keep it private.

Official Telegram documentation:

https://core.telegram.org/bots/features

---

# 7. Step 4 — Get the project from GitHub

Official repository:

https://github.com/viktec/Car-Km-Tracker

You can simply use this repository directly.

If you want your own independent copy, click **Fork** on GitHub and create the fork under your own account.

## Easiest method

For a beginner, connect the existing repository directly to Cloudflare.

You do not need to download the project to your computer just to deploy it.

Cloudflare can connect directly to:

~~~
viktec/Car-Km-Tracker
~~~

---

# 8. Step 5 — Understand the important files

The repository contains:

~~~
Car-Km-Tracker/
│
├── src/
│   └── index.js
├── migrations/
│   └── 0001_initial.sql
├── tests/
│   └── index.test.js
├── wrangler.toml
├── package.json
├── README.md
├── .env.example
└── .gitignore
~~~

## src/index.js

The Worker application.

It:

- receives Telegram messages
- verifies the webhook secret
- interprets commands
- reads/writes D1
- calculates statistics
- sends replies to Telegram
- handles the Undo button

## migrations/0001_initial.sql

Creates:

- contracts
- odometer_readings
- trips

## wrangler.toml

Tells Cloudflare:

- Worker name
- main JavaScript file
- D1 database name
- D1 database ID
- D1 binding

The binding is:

~~~
binding = "DB"
~~~

Inside JavaScript it becomes:

~~~
env.DB
~~~

Official documentation:

https://developers.cloudflare.com/d1/worker-api/d1-database/

---

# 9. Step 6 — Connect GitHub to Cloudflare

In Cloudflare:

1. Open **Workers & Pages**.
2. Create a Worker / application.
3. Choose the GitHub integration.
4. Connect GitHub.
5. Select:

~~~
viktec/Car-Km-Tracker
~~~

6. Select the main branch as the production branch.

Use these deployment settings:

~~~
Git repository: viktec/Car-Km-Tracker
Production branch: main
Root directory: /
Build command: none
Deploy command: npx wrangler deploy
~~~

Cloudflare's GitHub integration can automatically deploy new commits.

Official documentation:

https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/

---

# 10. Step 7 — Connect the Worker to D1

The repository already contains the D1 binding in wrangler.toml.

It should look like:

~~~
[[d1_databases]]
binding = "DB"
database_name = "car-km-tracker"
database_id = "YOUR-D1-DATABASE-ID"
migrations_dir = "migrations"
~~~

When deploying your own copy, use your own D1 database name and ID.

Find the ID in Cloudflare D1 or with:

~~~
npx wrangler d1 list
~~~

Official documentation:

https://developers.cloudflare.com/workers/wrangler/configuration/

---

# 11. Step 8 — Create the D1 tables

The repository contains:

~~~
migrations/0001_initial.sql
~~~

It creates these tables:

~~~sql
CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Car',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  allowed_km INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odometer_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  reading_km INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  km INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);
~~~

Cloudflare has local and remote D1 databases.

For the real Telegram bot, the Worker must use the **remote production database**.

Official guide:

https://developers.cloudflare.com/d1/get-started/

---

# 12. Step 9 — Verify the database manually

In Cloudflare:

1. Open D1.
2. Select car-km-tracker.
3. Open the SQL Console.

Run:

~~~sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;
~~~

You should see:

~~~
contracts
odometer_readings
sqlite_sequence
trips
~~~

## What is sqlite_sequence?

It is a normal SQLite internal table used by AUTOINCREMENT.

Do not delete it.

---

# 13. Step 10 — Test an INSERT manually

This is useful to understand how the database works.

Run:

~~~sql
INSERT INTO contracts
  (user_id, name, start_date, end_date, allowed_km)
VALUES
  ('TEST_USER', 'Test Car', '2026-06-18', '2027-06-18', 15000);
~~~

Then:

~~~sql
SELECT *
FROM contracts;
~~~

You should see the new row.

Delete the test afterwards:

~~~sql
DELETE FROM contracts
WHERE user_id = 'TEST_USER';
~~~

Do not use TEST_USER as your real Telegram user ID.

Normally the real bot creates the contract when you send:

~~~
/contratto 2026-06-18 2027-06-18 15000
~~~

---

# 14. Step 11 — Test an odometer INSERT

Find the contract ID:

~~~sql
SELECT *
FROM contracts;
~~~

Suppose the ID is 1.

Insert:

~~~sql
INSERT INTO odometer_readings
  (contract_id, reading_km)
VALUES
  (1, 5081);
~~~

Check:

~~~sql
SELECT *
FROM odometer_readings;
~~~

You should see:

~~~
contract_id = 1
reading_km  = 5081
~~~

Remember: 5081 is an **absolute odometer value**.

---

# 15. Step 12 — Add the two Cloudflare secrets

The Worker needs two encrypted secrets.

## Secret 1

Name:

~~~
TELEGRAM_BOT_TOKEN
~~~

Value:

The token received from BotFather.

## Secret 2

Name:

~~~
TELEGRAM_WEBHOOK_SECRET
~~~

Choose a secret such as:

~~~
CarKmTracker_2026_Webhook_9xK7m2
~~~

## Allowed webhook-secret characters

Telegram accepts 1–256 characters and only these characters:

~~~
A-Z
a-z
0-9
_
-
~~~

Valid:

~~~
CarKmTracker_2026_Webhook_9xK7m2
~~~

Invalid:

~~~
Car Km Tracker 2026!
~~~

because it contains spaces and !.

Telegram sends this value in:

~~~
X-Telegram-Bot-Api-Secret-Token
~~~

The Worker checks that header against TELEGRAM_WEBHOOK_SECRET.

Official Bot API documentation:

https://core.telegram.org/bots/api

---

# 16. Step 13 — Add the secrets in Cloudflare

Open:

**Cloudflare → Workers & Pages → your Worker → Settings → Variables and Secrets**

Add:

~~~
TELEGRAM_BOT_TOKEN
~~~

as an **encrypted secret**.

Then add:

~~~
TELEGRAM_WEBHOOK_SECRET
~~~

as another **encrypted secret**.

Never put these values into GitHub.

---

# 17. Step 14 — Deploy the Worker

If GitHub integration is configured, a push to main starts a new deployment automatically.

You can also deploy manually with Wrangler.

## What is a terminal?

A terminal is simply a window where you type commands.

### Windows

Press the Windows key, type:

~~~
Command Prompt
~~~

and open it.

PowerShell also works.

### macOS

Open **Terminal**.

### Linux

Open your terminal application.

---

# 18. Step 15 — Install Node.js

Download Node.js:

https://nodejs.org/

Install it.

Open a new terminal and type:

~~~
node --version
~~~

You should see a version number.

Then:

~~~
npm --version
~~~

Again, you should see a version number.

Cloudflare currently lists Node.js as a prerequisite for Wrangler.

Official guide:

https://developers.cloudflare.com/workers/get-started/guide/

---

# 19. Step 16 — Deploy with Wrangler

If you have the project locally:

~~~text
cd Car-Km-Tracker
~~~

Then:

~~~text
npx wrangler deploy
~~~

Cloudflare deploys the Worker and prints the workers.dev URL.

If GitHub integration is already working, you normally do not need to manually deploy every change.

---

# 20. Step 17 — Test the Worker URL

Open the Worker URL in your browser.

For example:

~~~
https://car-km-trackers.YOUR-SUBDOMAIN.workers.dev/
~~~

The application should return:

~~~
Car-Km-Tracker online
~~~

This proves that the Worker is reachable.

---

# 21. Step 18 — Configure the Telegram webhook

The webhook tells Telegram:

> When somebody sends a message to my bot, send the update to this HTTPS address.

Use your Worker URL.

Example:

~~~
https://car-km-trackers.YOUR-SUBDOMAIN.workers.dev/
~~~

---

# 22. Step 19 — Set the webhook from Command Prompt

You need:

- Telegram bot token
- Worker URL
- webhook secret

### Windows Command Prompt

~~~bat
curl -G "https://api.telegram.org/bot<TUO_BOT_TOKEN>/setWebhook" ^
  --data-urlencode "url=https://car-km-trackers.YOUR-SUBDOMAIN.workers.dev/" ^
  --data-urlencode "secret_token=CarKmTracker_2026_Webhook_9xK7m2"
~~~

Replace:

~~~
<TUO_BOT_TOKEN>
~~~

with the real BotFather token.

Replace the Worker URL with your real URL.

Replace the example webhook secret with the exact secret stored in Cloudflare.

**Never send your real token or secret to someone else.**

A successful result is:

~~~json
{"ok":true,"result":true,"description":"Webhook was set"}
~~~

---

# 23. Step 20 — Verify the webhook

Run:

~~~text
curl "https://api.telegram.org/bot<TUO_BOT_TOKEN>/getWebhookInfo"
~~~

A healthy result contains something similar to:

~~~json
{
  "ok": true,
  "result": {
    "url": "https://car-km-trackers.YOUR-SUBDOMAIN.workers.dev/",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
~~~

Check:

- url = your Worker URL
- pending_update_count = normally 0
- last_error_message = should not contain a delivery error

---

# 24. Step 21 — Test Telegram

Open your bot in Telegram.

Send:

~~~text
/start
~~~

Then create the contract:

~~~text
/contratto 2026-06-18 2027-06-18 15000
~~~

Then:

~~~text
/km 5081
~~~

Then:

~~~text
/statistiche
~~~

You should see approximately:

~~~text
Limite: 15.000 km
Usati: 5.081 km
Residui: 9.919 km
~~~

The exact average, daily budget and projection depend on the current date.

---

# 25. Step 22 — Test the Undo button

After:

~~~text
/km 5081
~~~

the bot shows:

~~~text
[ ↩️ Annulla ultimo invio ] [ 📊 Statistiche ]
~~~

Press **Annulla ultimo invio**.

The last odometer record is deleted.

There is also a text command:

~~~text
/annulla
~~~

This is useful after an accidental entry such as:

~~~text
/km 5801
~~~

instead of:

~~~text
/km 5081
~~~

---

# 26. Telegram commands

## Contract

~~~text
/contratto 2026-06-18 2027-06-18 15000
~~~

## Odometer

~~~text
/km 5081
~~~

## Undo

~~~text
/annulla
~~~

## Categories

~~~text
/ufficio 70
/palestra 6
/spesa 25
/viaggio 300
/trasferta 120
~~~

## Period statistics

~~~text
/oggi
/settimana
/mese
/anno
~~~

## Contract statistics

~~~text
/statistiche
/riepilogo
~~~

## Categories summary

~~~text
/categorie
~~~

## Help

~~~text
/help
~~~

---

# 27. Understanding the statistics

For:

~~~text
Contract = 15,000 km
Current odometer = 5,081 km
~~~

the application calculates:

**Used**

~~~text
5,081 km
~~~

**Remaining**

~~~text
15,000 - 5,081 = 9,919 km
~~~

**Percentage**

~~~text
5,081 / 15,000 × 100 = 33.87%
~~~

**Daily budget**

Remaining kilometres divided by remaining contract days.

This answers:

> How many kilometres per day can I still drive, on average, until the contract ends?

**Projection**

The application estimates the final mileage if the current average pace continues.

---

# 28. Odometer vs trips

These are two different things.

## Odometer

~~~text
/km 5081
~~~

means the car's **total real mileage** is 5,081 km.

This is the main value used for contractual mileage.

## Trips

~~~text
/ufficio 70
~~~

means a 70 km movement classified as office.

Trips are useful for understanding where kilometres are going.

They are **not added on top of the odometer** for contract usage, otherwise the same kilometres could be counted twice.

---

# 29. Verify real data in D1

Open:

**Cloudflare → D1 → car-km-tracker → SQL Console**

### Contracts

~~~sql
SELECT *
FROM contracts
ORDER BY id DESC;
~~~

### Odometer

~~~sql
SELECT *
FROM odometer_readings
ORDER BY id DESC;
~~~

### Trips

~~~sql
SELECT *
FROM trips
ORDER BY id DESC;
~~~

### Latest odometer

~~~sql
SELECT *
FROM odometer_readings
ORDER BY id DESC
LIMIT 1;
~~~

### Number of odometer records

~~~sql
SELECT COUNT(*) AS total
FROM odometer_readings;
~~~

### Number of trips

~~~sql
SELECT COUNT(*) AS total
FROM trips;
~~~

---

# 30. Test a trip INSERT manually

Find the contract ID:

~~~sql
SELECT id, user_id, name
FROM contracts;
~~~

Suppose the ID is 1.

Insert a test trip:

~~~sql
INSERT INTO trips
  (contract_id, date, category, km, note)
VALUES
  (1, '2026-09-23', 'ufficio', 70, 'Test');
~~~

Check it:

~~~sql
SELECT *
FROM trips
ORDER BY id DESC;
~~~

Remove only that test row:

~~~sql
DELETE FROM trips
WHERE note = 'Test';
~~~

---

# 31. What happens when the code is updated?

Normal workflow:

~~~text
Change code
    ↓
Commit to GitHub
    ↓
Push to main
    ↓
Cloudflare detects the commit
    ↓
npx wrangler deploy
    ↓
New Worker version goes live
~~~

You normally do **not** recreate:

- D1
- Telegram bot
- Telegram webhook
- Worker
- secrets

Code deployment and infrastructure setup are separate.

---

# 32. Security rules

Never commit:

~~~text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
passwords
API keys
private credentials
personal mileage exports
unencrypted database backups
~~~

The public repository contains generic source code.

Personal mileage data stays in the D1 database.

The bot token and webhook secret stay in Cloudflare encrypted secrets.

---

# 33. Troubleshooting

## Bot does not answer

Run:

~~~text
curl "https://api.telegram.org/bot<TUO_BOT_TOKEN>/getWebhookInfo"
~~~

Check:

- webhook URL
- pending_update_count
- last_error_message

Then check Cloudflare Worker deployments/logs.

## Error: secret token contains illegal characters

Use only:

~~~text
A-Z a-z 0-9 _ -
~~~

Do not use spaces, dots or punctuation.

Valid:

~~~text
CarKmTracker_2026_Webhook_9xK7m2
~~~

## Error: 401 Unauthorized

The value in Cloudflare:

~~~text
TELEGRAM_WEBHOOK_SECRET
~~~

does not exactly match the secret sent in setWebhook.

## Bot says no contract configured

Send:

~~~text
/contratto 2026-06-18 2027-06-18 15000
~~~

## Statistics show 0 km

Run in D1:

~~~sql
SELECT *
FROM odometer_readings
ORDER BY id DESC;
~~~

If there is no row, the Telegram message did not create an odometer record.

If there is:

~~~text
reading_km = 5081
~~~

then statistics should use 5,081 km.

## Cloudflare deployment fails

Check:

1. GitHub repository is correct.
2. Production branch is main.
3. Root directory is /.
4. Deploy command is npx wrangler deploy.
5. wrangler.toml has the correct D1 ID.
6. D1 database exists.
7. Worker binding is named DB.
8. Cloudflare secrets are present.

---

# 34. Installation checklist

- [ ] Cloudflare account created
- [ ] D1 database created
- [ ] D1 tables created
- [ ] GitHub repository connected
- [ ] Worker deployed
- [ ] TELEGRAM_BOT_TOKEN stored as encrypted Cloudflare secret
- [ ] TELEGRAM_WEBHOOK_SECRET stored as encrypted Cloudflare secret
- [ ] webhook configured
- [ ] getWebhookInfo verified
- [ ] /start tested
- [ ] contract created
- [ ] /km tested
- [ ] /statistiche tested
- [ ] Undo button tested
- [ ] D1 data checked manually

---

# 35. Current project status

**Functional MVP.**

Current production features:

- Telegram webhook
- Cloudflare Worker backend
- Cloudflare D1 database
- contract creation
- absolute odometer tracking
- percentage used
- remaining kilometres
- daily budget
- average usage
- projected final mileage
- trip categories
- daily / weekly / monthly / yearly trip summaries
- category statistics
- inline statistics button
- inline undo-last-odometer button
- /annulla command
- webhook secret validation
- GitHub → Cloudflare automatic deployment

Possible future features:

- multiple vehicles
- multiple contracts per user
- monthly/annual contractual limits
- richer statistics
- rolling averages
- dashboard
- charts
- CSV export
- Excel export
- automatic alerts
- contract renewal/history
- configurable warning thresholds

---

# 36. Developer commands

Deploy:

~~~text
npx wrangler deploy
~~~

List D1 databases:

~~~text
npx wrangler d1 list
~~~

Query the remote database:

~~~text
npx wrangler d1 execute car-km-tracker --remote --command="SELECT * FROM contracts"
~~~

Apply the initial schema remotely:

~~~text
npx wrangler d1 execute car-km-tracker --remote --file=./migrations/0001_initial.sql
~~~

**Be careful with production database commands.** Do not run SQL against the remote database unless you understand what it will change.

---

# 37. License

Released under the **MIT License**.

Copyright © 2026 Vittorio Russo.
