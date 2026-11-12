# One-time setup for `deploy-prod.yml`

Specification: [`environments-and-deployment.md`](../../specs/environments-and-deployment.md) v0.3, R8. A human with owner access to `libconnect-mp4` and admin access to the GitHub repository must do these steps. Agents document them but must not perform them.

`.github/workflows/deploy-prod.yml` signs in to Google Cloud through **Workload Identity Federation**. GitHub's short-lived OIDC token is exchanged for a token of one deploy service account. No service-account key is created or stored in GitHub.

## 1. Google Cloud: the identity pool, provider and service account

Run these in a terminal signed in with `gcloud auth login` as a project owner:

```bash
PROJECT_ID=libconnect-mp4
REPO=CS3227-2610-MP4-LibConnect/CS3227-2610-MP4
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

gcloud iam workload-identity-pools create github \
  --project "$PROJECT_ID" --location global --display-name "GitHub Actions"

# Only tokens from this repository are accepted.
gcloud iam workload-identity-pools providers create-oidc github-repo \
  --project "$PROJECT_ID" --location global --workload-identity-pool github \
  --display-name "CS3227-2610-MP4" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository == '$REPO'"

gcloud iam service-accounts create github-deploy \
  --project "$PROJECT_ID" --display-name "GitHub production deploy"
SA="github-deploy@$PROJECT_ID.iam.gserviceaccount.com"

# Least privilege for deploying Firestore indexes.
for role in roles/datastore.indexAdmin roles/serviceusage.serviceUsageConsumer roles/firebase.viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role "$role" --condition None
done

# Let workflows from this repository impersonate the service account.
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"

echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-repo"
echo "GCP_DEPLOY_SERVICE_ACCOUNT=$SA"
```

The two `echo` lines print the values for step 3. They are identifiers, not secrets.

## 2. GitHub: the `production` environment

In **Settings → Environments → New environment**, create `production`:

- **Required reviewers:** add the team members who may approve a production deployment.
- **Deployment branches and tags:** choose *Selected branches and tags* and add `main`.

## 3. GitHub: repository variables

In **Settings → Secrets and variables → Actions → Variables**, add:

| Variable | Value |
| --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | First line printed in step 1 |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | Second line printed in step 1 |
| `FIREBASE_PROJECT_ID` | `libconnect-mp4` |
| `PRODUCTION_URL` | `https://libconnect-mp4--libconnect-mp4.asia-southeast1.hosted.app` |

## 4. Test it

The workflow only runs once `deploy-prod.yml` is on `main`. GitHub runs `workflow_run` and `workflow_dispatch` triggers from the default branch.

1. Merge the pull request that adds `deploy-prod.yml`.
2. **Automatic path:** this needs `ci.yml` on `main` (PR #12). After CI succeeds on the merge commit, *Deploy production* starts and waits at **Review deployments**. Approve it.
3. **Manual path:** in **Actions → Deploy production → Run workflow**, choose `main`, then approve it.
4. Check the run:
   - **Deploy Firestore indexes** succeeds;
   - **List production indexes** shows the `notifications` index (`recipientUserId` ascending, `createdAt` descending);
   - **Smoke check production** shows `GET / -> 200`, `GET /register -> 200` and `GET /api/auth/session -> 401`.
5. Confirm that the Notifications page loads its list in the live app. A new index takes a few minutes to build.

If authentication fails, check the provider's attribute condition and the `workloadIdentityUser` binding. If the deploy fails with a permission error, the run log names the missing permission.

## Still open in R6

- **App deploys through this workflow:** App Hosting still rolls out the app automatically on every push to `main`. Moving the rollout into this workflow means adding a deploy step and turning off automatic rollouts on the backend. That is a separate change, with its own approval.
- **CI required before merge:** protecting `main` so a pull request needs a passing CI run (R8 step 6) is not done yet.
