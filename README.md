# Here are your Instructions
# WedSnap

## Production email setup

Couple invitations are sent automatically when a wedding is created with a couple email, and can be resent from that wedding's detail page. Configure these backend environment variables on Render before deploying:

- `RESEND_API_KEY`: a Resend API key with sending permission.
- `EMAIL_FROM`: a verified sender, for example `WedSnap <hello@yourdomain.com>`. Resend only permits the test sender (`onboarding@resend.dev`) to send to the Resend account owner.
- `FRONTEND_URL`: the public Vercel URL used in invitation and QR links.
- `CORS_ORIGINS` (optional): comma-separated extra frontend origins. Localhost origins are allowed automatically for development.

The legacy `EMERGENT_EMAIL_KEY` is supported only as a fallback. Prefer `RESEND_API_KEY` for production.
