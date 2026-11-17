# Student and teacher profile pictures

The portal uses the existing Firestore `students` and `teachers` collections and the existing Google Drive parent folder. Browser requests go to the Vercel functions in `api/`; the Apps Script secret and Firebase service account stay on the server.

## Deploy the Apps Script

1. Open the Apps Script project behind the existing profile-picture deployment at `https://script.google.com/macros/s/AKfycbx4JpHrS_qJtg9QtObTN3laGsuOhFTOD_dnv1uw-TLy25EJO7K8aRSR3zVUnrIo5PS0/exec`.
2. Add or replace its profile-picture code with [`scripts/ProfilePicturePortal.gs`](../scripts/ProfilePicturePortal.gs). The script creates a `Profile Pictures` subfolder in the existing parent Drive folder.
3. In Project Settings → Script Properties, set `GOOGLE_DRIVE_API_SECRET` to a newly generated random value of at least 32 characters. Use the same value in Vercel. Do not place it in any `VITE_` variable.
4. Deploy a new version of the web app, executing as the Drive folder owner. The web app must be callable by the Vercel function. Confirm the resulting `/exec` URL; if Apps Script creates a new deployment URL, use that URL for `GOOGLE_DRIVE_SCRIPT_URL`.

## Configure Vercel

Set these server-only environment variables for each deployed environment:

| Variable | Value |
| --- | --- |
| `GOOGLE_DRIVE_SCRIPT_URL` | The deployed profile-picture Apps Script `/exec` URL |
| `GOOGLE_DRIVE_API_SECRET` | The same random secret in Apps Script Script Properties |
| `STUDENT_SESSION_SECRET` | A separate random secret of at least 32 characters |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON for a service account with access to the existing Firestore project |

Redeploy the Vercel app after changing variables. Deploy the updated `firestore.rules` to prevent browser writes to `profileImageUrl` and `profileImageFileId`; the server's service account writes these fields. Teachers and students must sign in again to receive their HttpOnly picture-management cookies. The standalone Vite dev server does not serve `/api`; use a Vercel local runtime or a deployed preview to test the integration.

## Verify the deployed workflow

1. Sign in as a student and upload a JPG, PNG, and WEBP image under 2 MB. Confirm the preview, the saved picture across the portal, the Firestore `profileImageUrl` and `profileImageFileId` fields, and the new file in Drive.
2. Replace a picture. Confirm the new fields point to the new Drive file and the previous file is in Drive trash.
3. Remove the picture. Confirm the fields are cleared and the current Drive file is in trash.
4. Try an image over 2 MB and an unsupported format; both should be rejected. Try changing another student's ID in a request; the API should return 403. A request without the student cookie should return 401.
5. Sign in as a teacher and repeat upload, replacement, and removal. Confirm the picture appears in the teacher header, sidebar, overview, profile, and admin teacher list. Teacher images have Drive descriptions tied to the teacher ID; the API requires the teacher cookie.

## Leave applications

The Vercel `api/leave-requests` function uses the same Firestore service account and signed student or teacher session cookie. Students submit requests from a course's Attendance page. Assigned teachers review them on that course's Attendance page. Leave decisions update the application status; teachers continue to mark attendance through the existing attendance controls. The `leaveRequests` collection has no browser write rule, so direct client access is denied. The standalone Vite server uses a local-only fallback for interface development; cross-device requests require the Vercel API and Firestore configuration above.

Run local tests with `node --import tsx --test tests/*.test.mjs`. These cover authentication rejection, image validation, successful upload, replacement, removal, database rollback, and Drive cleanup failure. They do not replace the live Drive/Firestore verification above.

## Existing authentication limitation

The portal still stores legacy passwords in Firestore and has client-side teacher/admin authentication for the wider application. The picture and leave endpoints use signed cookies and check current account records and course membership, but a broader authentication and Firestore rules migration is required to secure the whole portal. Do not treat these server checks as a replacement for that migration.
