# Teach CARA the Restaurant & Fast Food Bargaining Council Agreement

The uploaded document is the Main Collective Agreement of the Bargaining Council for the Fast Food, Restaurant, Catering and Allied Trades. The Minister has extended it to non-parties, so it binds all employers in that industry, in the areas it lists. It runs until 31 August 2028. (Both uploads are the same file.)

## What users will notice
- Restaurant, takeaway, catering, café and bar employers get answers based on the agreement, not just general labour law. That covers wages per job grade, hours, overtime, Sundays and public holidays, leave, casual and part-time rules, certificates of service, council fees and disputes.
- CARA names the source, for example: "Under the Fast Food & Restaurant Bargaining Council agreement, clause 11…".
- CARA explains when the agreement applies (the industry and the areas in Annexure 1) and when it doesn't, and says that its rules are actual rules, not just a minimum.
- **Wages:** CARA gives the hourly rate from the agreement's table for that job and year. It mentions the small-employer reduction of up to 10%, but never lets a rate fall below the national minimum wage.
- **Industry choice:** Company details get an optional "Industry" choice (Restaurant / fast food / catering, Retail / supermarket, Other). Restaurant employers always get the agreement rules. Anyone else gets them when their question is about restaurants, waiters, chefs, takeaways and similar.
- The restaurant topic group in CARA gets a few starter questions, such as "What must I pay a waiter?" and "Sunday and public holiday pay for kitchen staff".

## Steps
1. Pull the full agreement into a clean summary, clause by clause: scope, definitions, job grades, the full wage table by year, hours, overtime, rest periods, leave types, termination, the council and disputes, and Annexure 1 areas. Recheck every wage figure against the page images.
2. Store that summary as CARA's restaurant knowledge, kept separate so later agreements (for example supermarkets) can be added the same way.
3. Give CARA the restaurant knowledge when the company's industry is restaurant or the question is about that industry. Answers stay fast and costs stay low for everyone else.
4. Add the optional Industry choice to company details and to the first-time welcome setup.
5. Add the restaurant starter questions to CARA's topic groups.
6. Check: add small tests (for example, a restaurant question brings in the agreement and a plumbing question doesn't). Ask CARA 5 real restaurant questions live and compare the answers with the document, including at least one exact wage figure.

## Technical details
- New shared knowledge module for the cara-chat function (bargaining council agreement summary plus a list of matching words). cara-chat adds it to the instructions when the profile's industry is restaurant or the latest message matches a keyword.
- New optional `industry` text field on company profiles, with a database update and access rules unchanged. Read it in cara-chat with the user's own profile.
- Redeploy cara-chat. No changes to payments, sign-in or document templates.
