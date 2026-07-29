## Goal

Clear out the leftover testing accounts so every number on your owner dashboard reflects only genuine people.

## What gets removed

Three accounts created purely for testing:

- qa.prov.1785349470@inrecotest.co.za
- qa.test.admin@example.com
- qa.test.audit1@example.com

For each one I'll remove the sign-in account itself plus anything it left behind: its subscription record, any company profile, any documents it generated, any saved devices, any team invites, and any payment attempt records.

## What stays

- **badenhorst.casper@gmail.com** — your own owner account. It is marked as a demo (free) account so it never counts as a paying customer, but it stays so you keep full access.
- **duvenhage.marcell@gmail.com** — a real person who started checkout on 24 July and never finished. Their record stays as a genuine "pending" so you can follow up.

## After the clean-up

Your owner dashboard should read: **0 paying subscribers, 0 active free trials**, with one real pending enquiry.

I'll re-check the numbers straight after and show you the result.

## Technical notes

Data-only removal via the insert/delete tool (no structure changes). Order: child records first (payfast_transactions, generated_documents + their storage files, company_profiles, user_devices, team_members, error_logs/page_views tied to those user ids), then subscriptions, then the auth users themselves via the admin API. Owner and the real pending row are excluded by explicit email match.
