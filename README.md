# 🎓 CGPA Calculator — SPJIMR PGDM(BM) 2025-27 (Year 1 + Year 2)

A real-time CGPA calculator for **SPJIMR PGDM(BM) 2025-27** covering both years: term GPAs, Year 1 CGPA, Year 2 CGPA and the combined CGPA, plus the promotion (Rule 2.10) and diploma (Rule 2.11) checks.

### 👉 [**Open the Calculator**](https://avig007.github.io/CGPA-Calculator-SPJIMR/)

Built on [Savio Jiji's Year 1 calculator](https://github.com/Saviojiji/CGPA-CALCULATOR-YEAR-1-SPJIMR) (MIT).

---

## ✨ Features

| Feature | Description |
|---|---|
| 📍 **Live tracker** | Pinned bar on every tab: verdict, combined CGPA, Year 1, Year 2, the current term's GPA and credits graded, updating as you pick grades |
| ⚖️ **PASS / FAIL verdict** | Combines Rules 2.10 and 2.11: **PASS**, **PASSING SO FAR**, **FAILING SO FAR** or **FAIL** (a final breach like 2 Fs, or a CGPA rule once all credits are graded) |
| 📚 **Official credit structure** | All courses from §1.2.5 of the General Guidelines: Year 1 = 54 credits, Year 2 = 59 credits (113 counted in CGPA; MOOC excluded) |
| 📈 **Three cumulative views** | Year 1 cumulative (T1 → NCL-1), Year 2 cumulative (T4 → NCL-2), and both years combined, term by term |
| ✏️ **Your own electives** | Term 4 Focus Area/Strategy rows and Term 6 INTEX/Common Elective/GFT rows can be renamed, re-credited, added or removed |
| ⚡ **Year 1 CGPA direct input** | Switch at the top of Summary and every Year 1 tab: type your Year 1 CGPA + credits instead of every grade |
| 🔄 **Direct GPA input** | Enter any term as GPA × credits straight from your grade sheet |
| ✅ **Promotion check (2.10)** | Term 1 ≥ 2.4, Comp Exam not F, Year 1 CGPA ≥ 2.4, F/D limits |
| 🎓 **Diploma check (2.11)** | Year 1 ≥ 2.4, Year 2 ≥ 2.4, combined ≥ 2.4, max 1 F and 3 Ds (1 D if an F) in Year 2 |
| ⚠️ **Probation flag (2.6)** | Warns if any term GPA is below 2.4 |
| 📝 **NCL as per guidelines** | Year 1 NCL (Comp Exam 1, ADMAP/Start Up 2, Abhyudaya 2) and Year 2 NCL (Summer Internship 2, DoCC 4, ARI 2) count in CGPA; F/D limits include NCL grades |
| 🔢 **Table 9 absolute grading** | Type your marks % for ADMAP, Abhyudaya or DoCC and the grade is set from the absolute bands |
| 🏅 **Honours GPAs (2.8)** | Dean's Honor List core GPA (core + NCL, no focus area or electives), Area Top 2 GPA (14 Focus Area credits), NCL honours GPA (SoS I, ADMAP/Start Up, Abhyudaya, DoCC) |
| 🎯 **Target planner** | The average you need on the remaining credits to finish at a target CGPA |
| 💾 **Saved in your browser** | Grades stay between visits (localStorage, on that device only) |

## ♿ Accessibility

- Text meets WCAG AA contrast (4.5:1) across the app
- Every input, grade picker and button has a screen-reader label; status is shown in words, not just colour
- Full keyboard use: skip link, visible focus rings, arrow keys between tabs, focus stays on the grade you just picked
- CGPA and verdict changes are announced to screen readers
- Respects "reduce motion"; touch targets are at least 36–40px

## 📖 Grade scale (Table 7)

| A+ | A | B+ | B | C+ | C | D | F |
|---|---|---|---|---|---|---|---|
| 4.0 | 3.5 | 3.0 | 2.5 | 2.0 | 1.5 | 1.0 | 0 |

## 🗂️ My Term IV courses (pre-filled from Wisenet)

| Group | Course | Credits |
|---|---|---|
| IM focus area | Agentic AI, Technology Infrastructure for the Digital Age, Transformation Through Cloud and Edge Computing | 2 each |
| Strategy core | Business Consulting, Business and Society, Management Control Systems, Management of Change, Strategic Innovation Models, Strategic Leadership Under Uncertainty | 2 each |
| BM core | Capitalism and Its Critics: A History (2), Systems and Design Thinking (4) | 6 |

Term V core (SoS II, International Business, Ethical Aspects, Legal Aspects) is on the Term 5 tab.

## 🗂️ My Term VI electives (pre-filled)

Focus area: Information Management & Analytics · INTEX/GFT: none · 14 elective credits

| When | Course | Credits |
|---|---|---|
| Term V · Nov–Dec | Generative AI for Business | 2 |
| Term VI · Jan | Sales Operations, Behavioral Decision Theory, Creative Thinking for Innovation | 2 each |
| Term VI · Mar | Fortunes and Fiascos, Investing in Equities, International Marketing | 2 each |

Using a different set? Edit the rows on the Term 6 tab, or change `term6` in `src/data.js`.

## 🧮 Year 2 credit structure

| Term | Courses | Credits |
|---|---|---|
| Term IV | Focus Area & Strategy courses (18), Management and Capitalism (2), Design Thinking (2) | 22 |
| Term V | Science of Spirituality II (1), International Business, Ethical Aspects, Legal Aspects, Systems Thinking (2 each) | 9 |
| Term VI | INTEX / Common Electives / GFT (Term V common electives count here) | 20 |
| NCL Year II | Corporate Summer Internship (2), DoCC incl. SDJ (4), ARI (2) | 8 |

## 🛠️ Run locally

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy.yml` (Settings → Pages → Source: **GitHub Actions**). `vercel.json` is included if you'd rather host on Vercel.

## ⚠️ Disclaimer

Unofficial tool. Your official grade sheet and the Programme Office are the final word.

## 📄 License

MIT. See [LICENSE](LICENSE).
