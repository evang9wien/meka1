firebase use
firebase login
firebase deploy --only functions:getAudioUrl

Berechtigung setzen:
gcloud auth login
gcloud functions describe getAudioUrl --region=us-central1 --project=evang9-combo-4cb8e

gcloud projects add-iam-policy-binding evang9-combo-4cb8e \
  --member="serviceAccount:110813316877-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"