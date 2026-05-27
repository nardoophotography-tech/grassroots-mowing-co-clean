# GrassRoots Mowing Co - Stage 2.2 Admin Protection Notes

This patch adds a temporary admin PIN lock.

## Default PIN

4176

You can change it in `.env.local`:

VITE_GRASSROOTS_ADMIN_PIN=4176

After changing it, restart the dev server.

## Public screen

The Book page stays public.

## Protected screens

Dashboard, bookings, field, run sheet, clients, quotes, invoices, reports, messages, pricing, equipment, inventory, safety, data, settings, and automation are admin-only.

## Important

This is local protection only. It is not enough for final public release.

Next stage should replace this with Firebase Authentication and Firestore security rules.
