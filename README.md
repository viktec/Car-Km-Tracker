# Car-Km-Tracker 🚗📊

**Car-Km-Tracker** is an open-source mileage budget tracker designed for cars subject to a contractual mileage limit, such as leasing, long-term rental, or other mobility contracts.

The goal is simple: **know how many kilometres you have used, how many remain, and how much you can reasonably drive without exceeding the contract limit.**

## What it does

Car-Km-Tracker is designed to track:

- total kilometres driven during the contract
- current odometer reading
- individual trips and movements
- daily, weekly, monthly and contract-period mileage
- average kilometres per day and per month
- remaining kilometres available
- remaining daily and monthly mileage budget
- usage trend and projection toward the contract end date
- office/work trips and their statistics
- custom trip categories such as gym, shopping, city trips, holidays and other recurring activities
- historical mileage data

The project is designed to make mileage management **practical rather than purely retrospective**: instead of discovering at the end of the contract that too many kilometres have been used, the user can see the current pace and adjust future driving accordingly.

## Example

A contract might allow:

- **15,000 km**
- over **12 months**
- from 18 June 2026 to 18 June 2027

The tracker can calculate:

- kilometres already used
- kilometres remaining
- average kilometres driven per day
- average kilometres driven per month
- remaining kilometres per day until contract expiry
- projected kilometres at contract expiry
- whether current usage is within the available mileage budget

The same logic can be used for different contract lengths and mileage limits.

## Telegram bot

The primary user interface is intended to be a Telegram bot.

Example commands:

```text
/km 5080
/ufficio 70
/palestra 6
/spesa 25
/viaggio 300
/trasferta 120
/oggi
/mese
/anno
/statistiche
/riepilogo
```

The bot will support both odometer-based updates and trip-based logging.

For example:

```text
/km 5080
```

records a new odometer reading.

A trip command such as:

```text
/ufficio 70
```

records a 70 km office trip and associates it with the corresponding category.

The final command set will be designed so that normal daily use requires only a few seconds.

## Contract model

The tracker is intentionally generic.

It is not tied to a specific leasing company, rental company, vehicle, or country.

A contract can define:

- start date
- end date
- total permitted kilometres
- vehicle name
- optional monthly or annual limits
- custom categories
- optional multiple vehicles/contracts in future versions

Possible use cases include:

- 10,000 km/year contracts
- 15,000 km/year contracts
- 30,000 km/year contracts
- 36-month contracts
- contracts with a total kilometre allowance
- monthly mileage limits
- annual mileage limits
- custom contract periods

## Categories

Trips can be classified into categories.

Examples:

- Office
- Gym
- Shopping
- City trips
- Business trips
- Travel
- Holidays
- Family
- Other

Categories are configurable and are intended to adapt to different users and mileage-tracking needs.ed to provide useful statistics, such as:

- number of office trips
- total office kilometres
- average kilometres per office trip
- total gym kilometres
- kilometres driven for a specific destination
- percentage of total mileage represented by a category

## Architecture

The planned production architecture is deliberately lightweight:

```text
Telegram
   │
   │ HTTPS webhook
   ▼
Cloudflare Worker
   │
   ▼
Cloudflare D1
   │
   └── mileage / contracts / trips / statistics
```

The application is designed to run online rather than on a local computer.

### Components

**Telegram**  
Provides the conversational interface used to enter mileage and request statistics.

**Cloudflare Workers**  
Runs the bot backend and receives Telegram webhook requests.

**Cloudflare D1**  
Stores contracts, odometer readings and trip data in an online SQL database.

**GitHub**  
Hosts the open-source application code.

A separate private repository can be used for private configuration and encrypted backups. The live database and secrets should not be committed to GitHub.

## Security principles

Security is part of the architecture rather than an afterthought.

The project follows these principles:

- no Telegram bot token in source code
- no passwords or API credentials in Git
- secrets stored through the deployment platform's secret mechanism
- HTTPS for communication with Telegram
- webhook secret verification
- public repository contains only generic application code
- personal data kept separate from the public repository
- sensitive backups, if used, should be encrypted before storage
- database access restricted to the application

The private repository is **not** intended to contain secrets in plaintext.

## Privacy

The public repository contains no personal mileage history.

Personal information such as:

- odometer readings
- trip history
- contract dates
- mileage allowance
- personal categories

belongs to the private application data layer.

The architecture is intended to make it possible for other users to run their own independent instances without sharing their personal data with the project maintainer.

## Open-source project

Car-Km-Tracker is intended to evolve into a generic tool that anyone can deploy for their own vehicle contract.

The project can eventually support:

- multiple users
- multiple vehicles
- multiple contracts
- configurable commands
- web dashboard
- charts
- CSV import/export
- Excel export
- recurring reports
- mileage alerts
- configurable warning thresholds
- contract renewal/history
- mobile-friendly dashboard

## Project status

**Current status: early development / initial scaffold.**

The repository currently contains the initial application structure and database model. The next development stages are:

1. complete the database schema
2. implement the contract and mileage calculation engine
3. implement Telegram commands
4. add validation and error handling
5. connect Telegram webhooks
6. deploy the Worker
7. connect Cloudflare D1
8. add automated tests
9. add statistics and projections
10. document deployment for other users

## Development

The project is intended to use JavaScript/TypeScript-compatible tooling and Cloudflare Workers.

Local development instructions will be expanded as the application implementation progresses.

## License

Released under the **MIT License**.

Copyright © 2026 Vittorio Russo.
