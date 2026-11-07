# 🎓 CGPA Calculator — SPJIMR PGDM(BM) 2025-27 (Year 1 + Year 2)

A real-time CGPA calculator for **SPJIMR PGDM(BM) 2025-27** covering both years: term GPAs, Year 1 CGPA, Year 2 CGPA and the combined CGPA, plus the promotion (Rule 2.10) and diploma (Rule 2.11) checks.

### 👉 [**Open the Calculator**](https://avig007.github.io/CGPA-Calculator-SPJIMR/)

Built on [Savio Jiji's Year 1 calculator](https://github.com/Saviojiji/CGPA-CALCULATOR-YEAR-1-SPJIMR) (MIT).

---

## ✨ Features

| Feature | Description |
|---|---|
| 📚 **Official credit structure** | All courses from §1.2.5 of the General Guidelines: Year 1 = 54 credits, Year 2 = 59 credits (113 counted in CGPA; MOOC excluded) |
| 📈 **Three cumulative views** | Year 1 cumulative (T1 → NCL-1), Year 2 cumulative (T4 → NCL-2), and both years combined, term by term |
| ✏️ **Your own electives** | Term 4 Focus Area/Strategy rows and Term 6 INTEX/Common Elective/GFT rows can be renamed, re-credited, added or removed |
| ⚡ **Year 1 shortcut** | Type your final Year 1 CGPA instead of re-entering every grade |
| 🔄 **Direct GPA input** | Enter any term as GPA × credits straight from your grade sheet |
| ✅ **Promotion check (2.10)** | Term 1 ≥ 2.4, Comp Exam not F, Year 1 CGPA ≥ 2.4, F/D limits |
| 🎓 **Diploma check (2.11)** | Year 1 ≥ 2.4, Year 2 ≥ 2.4, combined ≥ 2.4, max 1 F and 3 Ds (1 D if an F) in Year 2 |
| ⚠️ **Probation flag (2.6)** | Warns if any term GPA is below 2.4 |
| 🏅 **NCL honours GPA (2.8 d)** | GPA over Science of Spirituality I, ADMAP/Start Up, Abhyudaya and DoCC |
| 🎯 **Target planner** | The average you need on the remaining credits to finish at a target CGPA |
| 💾 **Saved in your browser** | Grades stay between visits (localStorage, on that device only) |

## 📖 Grade scale (Table 7)

| A+ | A | B+ | B | C+ | C | D | F |
|---|---|---|---|---|---|---|---|
| 4.0 | 3.5 | 3.0 | 2.5 | 2.0 | 1.5 | 1.0 | 0 |

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
