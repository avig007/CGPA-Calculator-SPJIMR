# CGPA Tracker — SPJIMR PGDM(BM) 2025-27

Track your CGPA across both years of the PGDM(BM) programme, see whether you meet the promotion and diploma rules, and keep your grades saved to your own account.

**[Open the tracker](https://avig007.github.io/CGPA-Calculator-SPJIMR/)**

Built from the batch's *General Guidelines PGDM(BM) 2025-2027*: the credit structure (§1.2.5), the grading tables (§2.7.2, Tables 7 and 9), and the rules on probation (2.6), honours (2.8), promotion (2.10) and the diploma (2.11).

## What it does

| | |
|---|---|
| **Live tracker** | A bar pinned to the top of every tab shows the verdict, combined CGPA, Year 1, Year 2, the current term's GPA, and how many credits are graded. It updates as you pick grades. |
| **Pass / fail verdict** | Combines Rules 2.10 and 2.11 into *Pass*, *Passing so far*, *Failing so far* or *Fail*. Breaches later grades can't undo (two Fs, an F in the Comprehensive Exam, Term 1 below 2.4) are a final *Fail*; CGPA rules become final once every credit they cover is graded. |
| **CGPA three ways** | Year 1 cumulative, Year 2 cumulative and both years combined, term by term. |
| **Official courses** | Year 1 = 54 credits, Year 2 = 53 (Term IV 31, Term VI 14 electives, NCL 8). MOOC credits are excluded from CGPA. |
| **Your electives** | Term VI rows can be renamed, re-credited, added or removed. |
| **Direct input** | Type your Year 1 CGPA (or any term's GPA) straight from a grade sheet. |
| **NCL grading** | Type your marks % for ADMAP, Abhyudaya or DoCC and the grade is set from the Table 9 bands. F and D limits include NCL grades. |
| **Honours standing** | Dean's Honor List core GPA, Area Top 2 focus-area GPA (14 credits) and NCL honours GPA (Rule 2.8). |
| **Probation flag** | Warns if any term GPA is below 2.4 (Rule 2.6). |
| **Target planner** | The average you need on the credits left to finish at a target CGPA. |
| **Accounts** | Sign in with email and password (with password reset) and your grades follow you to any device. Each account can only see its own grades. Without signing in, grades stay in that browser. |

## Grade points (Table 7)

| A+ | A | B+ | B | C+ | C | D | F |
|---|---|---|---|---|---|---|---|
| 4.0 | 3.5 | 3.0 | 2.5 | 2.0 | 1.5 | 1.0 | 0 |

## Year 2 courses (pre-filled from Wisenet and the R2 elective allotment)

| Term | Courses | Credits |
|---|---|---|
| Term IV, Information Management focus area | Agentic AI; Technology Infrastructure for the Digital Age; Transformation Through Cloud and Edge Computing | 2 each |
| Term IV, Strategy core | Business Consulting; Business and Society; Management Control Systems; Management of Change; Strategic Innovation Models; Strategic Leadership Under Uncertainty | 2 each |
| Term IV, BM core | Capitalism and Its Critics: A History (2); Systems and Design Thinking (4); Science of Spirituality II (1); Ethical Aspects of Business (2); International Business (2); Legal Aspects of Business (2) | 13 |
| Term VI electives | Generative AI for Business (Term V, Nov–Dec); Sales Operations, Behavioral Decision Theory, Creative Thinking for Innovation (January); Fortunes and Fiascos, Investing in Equities, International Marketing (March) | 2 each |
| NCL, Year II | Corporate Summer Internship (2); DoCC including SDJ (4); Applied Research Insights (2) | 8 |

Using a different set of courses? Edit `src/data.js`, or edit the Term VI rows in the app.

## Turning on accounts (Firebase, free plan)

The site works without this; grades then stay in each person's browser.

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Security → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
3. **Authentication → Settings → Authorized domains → Add domain:** `avig007.github.io`.
4. **Databases & Storage → Firestore → Create database:** Standard edition, location `asia-south1 (Mumbai)`, production mode.
5. **Firestore → Rules:** replace everything with [`firestore.rules`](firestore.rules) and publish. Each user can read and write only `users/{their uid}`.
6. **Settings → Project settings → Your apps → Web (`</>`):** register an app and copy `apiKey` and `appId` into [`src/firebase-config.js`](src/firebase-config.js) (the project ID and auth domain are already filled in). Push, and the site redeploys.

These web config values are not secrets; every Firebase site sends them to the browser. The security rules are what protect the data.

## Run it locally

```bash
npm install
npm run dev                      # local server
npm run build                    # production build in dist/
MOCK_CLOUD=1 npx vite build      # test build with a stand-in login backend (dist-test/)
```

Pushing to `main` publishes the site to GitHub Pages (`.github/workflows/deploy.yml`).

## Disclaimer

An unofficial tool. Your grade sheet and the Programme Office have the final word.

## Licence

MIT. See [LICENSE](LICENSE).
