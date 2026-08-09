# WedSnap — Wedding Memories QR Platform

## Original Problem Statement
A SaaS platform so a bride and groom never lose a single wedding memory. Each wedding gets a unique QR code; guests scan it (no app/account) and instantly upload photos/videos and leave a message. The couple receives one private gallery with every memory. Roles: Platform Admin, Restaurant (venue business), Bride & Groom (couple), Guest. Luxury wedding theme (white, gold, soft beige).

## Stack / Architecture
- Frontend: React 19 + React Router + Tailwind + shadcn/ui + Framer Motion + Phosphor Icons
- Backend: FastAPI (all routes under /api)
- DB: MongoDB (users, weddings, uploads, messages, audit_logs, login_attempts)
- Storage: Emergent object storage (media stored in bucket, references + is_deleted in Mongo)
- Auth: JWT email/password, httpOnly cookies (access 12h / refresh 7d) + Bearer fallback, bcrypt
- QR: generated server-side (python qrcode) as PNG data URL pointing to /wedding/{slug}
- Payments: MOCKED subscription plans (Free Trial/Basic/Pro/Enterprise) with wedding limits + revenue calc

## User Personas
- Platform Admin: manages restaurants, plans, suspensions; views analytics/storage/revenue.
- Restaurant/Venue: registers, creates weddings, generates/downloads QR, views galleries.
- Couple: private gallery login (auto-created when couple_email set), views/favorites/deletes/downloads memories.
- Guest: no account; scans QR, uploads photos/videos, leaves a message.

## Implemented (2026-08-09)
- Auth: register (restaurant), login, logout, me; RBAC (admin/restaurant/couple); admin seeded from env.
- Weddings: create (plan-limited), list (filter by status), detail, status toggle, QR generate/download.
- Guest flow (public): landing with couple names/date/venue, multi-file upload (photos+videos), message, thank-you screen. Type + size validation.
- Gallery (restaurant/couple/admin): grid (masonry), timeline, guestbook views; filter all/photos/videos/favorites; search by guest; favorite toggle; delete; blob-based secure media serving; download-all zip.
- Admin dashboard: analytics (restaurants, weddings, active, uploads, photos/videos, storage GB, monthly revenue), restaurant table with plan change + suspend/reactivate.
- Couple Invitations: venue emails couple a secure magic-link (Emergent-managed Resend); /invite/{token} one-tap login into private gallery (30-day token). Clear error on undeliverable/rate-limited email.
- Live Slideshow: /slideshow/{slug} fullscreen auto-advancing gallery with Ken Burns, play/pause/next/prev, polls every 12s and shows a "New memory" toast for new guest photos. Buttons on wedding detail + couple gallery.
- Upload Protection: login brute-force lockout (5 fails -> 15 min, 429) and guest-upload rate limit (40/60s per IP), both using X-Forwarded-For for real client IP behind K8s ingress.
- Luxury UI: Cormorant Garamond + Manrope fonts, gold/beige palette, rounded cards, glass headers, animations.
- Testing: backend pytest + frontend Playwright; all three new features verified (invite send 202, magic login, lockout via ingress, slideshow UI 100%).

## Backlog (not yet built)
- P1: Real payments (Stripe) for subscriptions; couple invitation email with login link.
- P1: Brute-force lockout on login; rate limiting on guest uploads.
- P2: Future features — AI slideshow, facial recognition, guest grouping, photo voting, live TV gallery, DJ requests, wedding games, digital invitations, timeline, multi-language, push notifications, native apps.
- P2: shadcn DatePicker instead of native date input; DialogDescription a11y polish; split server.py into routers.

## Test Credentials
- Admin: zx31808@seeu.edu.mk / Admin@2026
- Restaurant: venue@wedsnap.com / Venue@2026
- Demo wedding slug: cec8f84007 (Aria & Leo)
