# CodeClinic

CodeClinic is a course help desk for programming courses, with Student and TA
roles.

- **Students** create tickets with code files or a repository reference, follow
  and reply to their tickets in My Tickets, close resolved tickets, search the
  Bug FAQ of resolved tickets, read notifications, and ask the ticket help bot
  for concept explanations and hints rather than full solutions.
- **TAs** work the ticket queue: filter, claim and unclaim, reply, and resolve
  tickets with a fix note. They use AI help to draft fix notes and get queue
  insights, and read notifications.
- **TA Coordinators** are TAs who can also support other accounts.

Built with React, TypeScript, Express, Firestore, and the SoC LLM.

## Try it

- Live app: <https://libconnect-mp4--libconnect-mp4.asia-southeast1.hosted.app/>
- Product website: <https://cs3227-2610-mp4-libconnect.github.io/CS3227-2610-MP4/>
- Test accounts: register a Student account in the app. To test the TA role,
  see [Testing the TA role](docs/UserGuide.md#testing-the-ta-role) in the User
  Guide.

## Documentation

- [User Guide](docs/UserGuide.md): how to use every Student and TA feature.
- [Developer Guide](docs/DeveloperGuide.md): design, shared components,
  security, environments and deployment, the multi-agent workflow, context
  engineering, repository files, and acknowledgements.
- [Reflections](docs/Reflections.md): our reflections on Multi-Agent SE, Context
  Engineering, and Resource-aware Use.
- [Application README](src/codeclinic/README.md): local setup, AI settings,
  creating a TA Coordinator, troubleshooting, and tests.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/codeclinic/src/` | React client |
| `src/codeclinic/server/` | Express server: auth, accounts, tickets, notifications, and the AI gateway |
| `src/codeclinic/test/` | Unit, route, security, emulator, and Playwright tests |
| `src/workflow/` | Workflow validator script |
| `workflow/` | Agentic workflow: specs, plan, agent profiles, and per-task evidence |
| `logs/` | Chat summaries (`chat/`) and per-task execution logs (`tasks/`) |
| `docs/` | User Guide, Developer Guide, reflections, and the product website |

See [Repository and workflow files](docs/DeveloperGuide.md#repository-and-workflow-files)
in the Developer Guide for the full list.

## Run locally

Prerequisites: Node.js 24.12 or newer and the Firebase CLI. From
`src/codeclinic`, install dependencies with `npm ci`, then use three terminals:

```sh
# 1. Firestore emulator
firebase emulators:start --only firestore --project demo-codeclinic

# 2. Express server on port 3000
export CODECLINIC_FIRESTORE_MODE=local-emulator
export CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run build && node --env-file-if-exists=.env server/index.js

# 3. React dev server on port 3001 (optional, for hot reload)
PORT=3001 npm start
```

Open `http://localhost:3001/`, or `http://localhost:3000/` without step 3.
Never commit `.env`.

## Verify

| Command | Purpose |
| --- | --- |
| `npm test` | Unit, route, and security tests |
| `npm run test:e2e` | Build, then run the Playwright browser tests |

## Deployment

CI (`.github/workflows/ci.yml`) runs tests, the build, a production dependency
audit, and a secret scan. After CI passes on `main`, the deploy workflow
(`.github/workflows/deploy-prod.yml`) deploys Firestore rules and indexes once a
team member approves the `production` environment. Firebase App Hosting rolls
out the app. See
[Environments and deployment](docs/DeveloperGuide.md#environments-and-deployment).
