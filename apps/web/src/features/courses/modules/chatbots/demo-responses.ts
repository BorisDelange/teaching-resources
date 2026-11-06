// ============================================================
// Réponses PLACEHOLDER des modèles, rejouées en "mode démo"
// quand l'API n'est pas joignable.
//
// ⚠️ Ces textes sont des reconstitutions PÉDAGOGIQUES représentatives,
// PAS de vraies sorties de modèles. Chacune incarne délibérément un
// piège (cf. TRAPS dans data.ts) pour donner du sens au vote à
// l'aveugle. À remplacer par de VRAIES captures via apps/api une fois
// l'URL Ollama de la fac disponible (voir PLAN_TD1_chatbots.md).
//
// Structure : DEMO_RESPONSES[modelId][promptKind] = { fr, en, verdict, trapId? }
//   verdict = jugement de référence (utilisé à l'étape "évaluation")
//   trapId  = piège incarné, s'il y en a un (pour la grille de correction)
// ============================================================

import type { Localized } from './data'
import type { PromptKind } from './data'

export type Verdict = 'correct' | 'partial' | 'wrong'

export interface DemoResponse {
  text: Localized
  verdict: Verdict
  trapId?: string
  /** Court commentaire de correction affiché à la révélation. */
  critique: Localized
}

type ByPrompt = Record<PromptKind, DemoResponse>

// ---------- A — qwen3:8b (petit générique) ----------
// Fil rouge : correct sur la molécule, OUBLIE le DFG (piège fq-dose), vague, sans sources.
const A_small_generic: ByPrompt = {
  naive: {
    text: {
      fr: 'Pour une pyélonéphrite, on prescrit généralement une fluoroquinolone comme la ciprofloxacine, par exemple 500 mg deux fois par jour pendant 7 jours. Consultez un médecin pour confirmer.',
      en: 'For pyelonephritis, a fluoroquinolone such as ciprofloxacin is usually prescribed, for example 500 mg twice a day for 7 days. See a doctor to confirm.',
    },
    verdict: 'partial',
    trapId: 'fq-dose',
    critique: {
      fr: 'Molécule plausible, mais réponse générique : aucune prise en compte du DFG à 38, aucune source. Le prompt naïf ne lui a pas donné le contexte rénal.',
      en: 'Plausible molecule, but a generic answer: no account of the GFR of 38, no source. The naive prompt gave it no renal context.',
    },
  },
  clinical: {
    text: {
      fr: 'Chez cette patiente présentant une pyélonéphrite aiguë sans gravité, l’antibiothérapie probabiliste de première intention repose sur une fluoroquinolone : ciprofloxacine 500 mg × 2/j, ou une céphalosporine de 3ᵉ génération (ceftriaxone). Durée habituelle : 7 jours.',
      en: 'In this patient with acute pyelonephritis without severity, first-line empirical therapy is a fluoroquinolone: ciprofloxacin 500 mg twice daily, or a third-generation cephalosporin (ceftriaxone). Usual duration: 7 days.',
    },
    verdict: 'partial',
    trapId: 'fq-dose',
    critique: {
      fr: 'Bonnes molécules, mais toujours pas d’adaptation à la fonction rénale : le DFG à 38 n’est pas mentionné alors qu’il conditionne la posologie de la ciprofloxacine.',
      en: 'Right molecules, but still no renal adjustment: the GFR of 38 is not mentioned even though it governs the ciprofloxacin dose.',
    },
  },
  structured: {
    text: {
      fr: `Raisonnement : PNA sans gravité → C3G parentérale ou fluoroquinolone en 1ʳᵉ intention ; pas de FQ récente donc la ciprofloxacine reste possible ; adaptation au DFG 38 à considérer.

| Molécule | Posologie (DFG 38) | Voie | Durée |
|---|---|---|---|
| Ciprofloxacine | 500 mg × 2/j | PO | 7 j |
| Ceftriaxone (alternative) | 1 g/j | IV/IM | 7 j |

Relais adapté à l'antibiogramme (ECBU). Sources : recommandations françaises sur les infections urinaires.

Incertitude : je n'ai pas vérifié l'ajustement précis de la ciprofloxacine à ce DFG ; à confirmer avant prescription.`,
      en: `Reasoning: APN without severity → parenteral 3GC or fluoroquinolone first-line; no recent FQ so ciprofloxacin remains an option; adjustment to GFR 38 to consider.

| Molecule | Dose (GFR 38) | Route | Duration |
|---|---|---|---|
| Ciprofloxacin | 500 mg twice daily | PO | 7 d |
| Ceftriaxone (alternative) | 1 g/day | IV/IM | 7 d |

Culture-guided switch (urine culture). Sources: French urinary tract infection guidelines.

Uncertainty: I have not verified the exact ciprofloxacin adjustment at this GFR; confirm before prescribing.`,
    },
    verdict: 'partial',
    trapId: 'fq-dose',
    critique: {
      fr: 'Le prompt structuré fait apparaître un vrai format (tableau, sources, incertitude) et le modèle progresse. Mais il laisse la ciprofloxacine à 500 mg × 2/j sans appliquer l’espacement requis à DFG 38 — il mentionne l’incertitude sans la lever. Bon réflexe (signaler le doute), dose encore imparfaite.',
      en: 'The structured prompt elicits a real format (table, sources, uncertainty) and the model improves. But it leaves ciprofloxacin at 500 mg twice daily without the spacing required at GFR 38 — it flags the uncertainty without resolving it. Good reflex (flagging doubt), dose still imperfect.',
    },
  },
}

// ---------- B — medgemma:4b (petit médical) ----------
// Fil rouge : ton assuré, HALLUCINE la nitrofurantoïne (piège nitrofurantoin) — le plus dangereux.
const B_small_medical: ByPrompt = {
  naive: {
    text: {
      fr: 'Le traitement de référence est la nitrofurantoïne, 100 mg matin et soir pendant 5 à 7 jours. C’est l’antibiotique de choix des infections urinaires.',
      en: 'The reference treatment is nitrofurantoin, 100 mg morning and evening for 5 to 7 days. It is the antibiotic of choice for urinary infections.',
    },
    verdict: 'wrong',
    trapId: 'nitrofurantoin',
    critique: {
      fr: 'Ton assuré, réponse fausse : la nitrofurantoïne n’a AUCUNE indication dans la pyélonéphrite et est contre-indiquée à DFG 38. Le modèle « médical » n’est pas plus fiable — c’est la thèse du TD.',
      en: 'Confident tone, wrong answer: nitrofurantoin has NO indication in pyelonephritis and is contraindicated at a GFR of 38. The “medical” model is no more reliable — that is the thesis of the TD.',
    },
  },
  clinical: {
    text: {
      fr: 'Pyélonéphrite aiguë : débuter la nitrofurantoïne en première intention. Alternative : amoxicilline. Réévaluer à 48–72 h selon la clinique.',
      en: 'Acute pyelonephritis: start nitrofurantoin first-line. Alternative: amoxicillin. Reassess at 48–72 h based on the clinical course.',
    },
    verdict: 'wrong',
    trapId: 'nitrofurantoin',
    critique: {
      fr: 'Persiste dans l’erreur nitrofurantoïne malgré un meilleur contexte, et propose l’amoxicilline en probabiliste (inadaptée en 1ʳᵉ intention ici). Spécialisé ≠ correct.',
      en: 'Persists with the nitrofurantoin error despite better context, and suggests amoxicillin empirically (inappropriate first-line here). Specialised ≠ correct.',
    },
  },
  structured: {
    text: {
      fr: `Compte tenu du DFG à 38 mL/min, la nitrofurantoïne est contre-indiquée : je l'écarte.

| Molécule | Posologie (DFG 38) | Voie | Durée |
|---|---|---|---|
| Ciprofloxacine | 500 mg × 2/j | PO | 7 j |

Alternative : ceftriaxone 1 g/j IV. Relais selon antibiogramme.
Source : HAS, fiche mémo pyélonéphrite aiguë de la femme.

Incertitude : vérifier l'adaptation de la ciprofloxacine à la fonction rénale.`,
      en: `Given the GFR of 38 mL/min, nitrofurantoin is contraindicated: I rule it out.

| Molecule | Dose (GFR 38) | Route | Duration |
|---|---|---|---|
| Ciprofloxacin | 500 mg twice daily | PO | 7 d |

Alternative: ceftriaxone 1 g/day IV. Switch per culture.
Source: HAS memo on acute pyelonephritis in women.

Uncertainty: verify ciprofloxacin adjustment to renal function.`,
    },
    verdict: 'partial',
    trapId: 'fq-dose',
    critique: {
      fr: 'Le contexte fourni (DFG dans le prompt) corrige enfin l’erreur : le modèle « médical » écarte la nitrofurantoïne. Preuve que le contexte du prompt compte plus que la « spécialisation ». Reste le même angle mort que les autres : la dose de ciprofloxacine n’est pas réellement adaptée au DFG 38.',
      en: 'The provided context (GFR in the prompt) finally corrects the error: the “medical” model rules out nitrofurantoin. Proof that prompt context matters more than “specialisation”. Same blind spot as the others remains: the ciprofloxacin dose is not truly adjusted to GFR 38.',
    },
  },
}

// ---------- C — llama3.3:70b (gros générique) ----------
// Fil rouge : globalement correct, mais SUR-ADAPTE la ceftriaxone (piège ceftriaxone-overadjust).
const C_large_generic: ByPrompt = {
  naive: {
    text: {
      fr: 'La pyélonéphrite aiguë communautaire se traite par ceftriaxone ou fluoroquinolone. Sans plus d’informations (poids, fonction rénale, allergies), je recommande de consulter, car la posologie dépend de ces paramètres.',
      en: 'Community-acquired acute pyelonephritis is treated with ceftriaxone or a fluoroquinolone. Without more information (weight, renal function, allergies), I recommend consulting, as the dose depends on these parameters.',
    },
    verdict: 'partial',
    critique: {
      fr: 'Bonne prudence : le gros modèle généraliste reconnaît qu’il manque des données. Il ne se trompe pas, mais ne tranche pas.',
      en: 'Good caution: the large general model recognises missing data. It does not err, but it does not commit either.',
    },
  },
  clinical: {
    text: {
      fr: 'Traitement probabiliste recommandé : ceftriaxone 1 g/j IV/IM, ou ciprofloxacine 500 mg × 2/j PO, pendant 7 jours, avec ECBU pour adapter secondairement. Devant une insuffisance rénale, pensez à adapter les posologies.',
      en: 'Recommended empirical therapy: ceftriaxone 1 g/day IV/IM, or ciprofloxacin 500 mg twice daily PO, for 7 days, with urine culture for later adjustment. In renal impairment, remember to adjust doses.',
    },
    verdict: 'correct',
    critique: {
      fr: 'Réponse solide et bien structurée : bonnes molécules, bonne durée, ECBU, et rappel de l’adaptation rénale. Le gros modèle généraliste s’en sort bien.',
      en: 'Solid, well-structured answer: right molecules, right duration, urine culture, and a reminder about renal adjustment. The large general model does well.',
    },
  },
  structured: {
    text: {
      fr: `Raisonnement : PNA sans gravité → C3G parentérale ou fluoroquinolone. DFG 38 → j'adapte les posologies à la fonction rénale.

| Molécule | Posologie (DFG 38) | Voie | Durée |
|---|---|---|---|
| Ceftriaxone | 0,5 g/j (réduite pour le rein) | IV/IM | 7 j |
| Ciprofloxacine | 500 mg × 2/j | PO | 7 j |

ECBU systématique puis désescalade. Source : HAS, fiche mémo pyélonéphrite aiguë de la femme.

Incertitude : posologies à recontrôler selon la fonction rénale et le poids.`,
      en: `Reasoning: APN without severity → parenteral 3GC or fluoroquinolone. GFR 38 → I adjust doses to renal function.

| Molecule | Dose (GFR 38) | Route | Duration |
|---|---|---|---|
| Ceftriaxone | 0.5 g/day (reduced for kidney) | IV/IM | 7 d |
| Ciprofloxacin | 500 mg twice daily | PO | 7 d |

Systematic urine culture then de-escalation. Source: HAS memo on acute pyelonephritis in women.

Uncertainty: doses to re-check per renal function and weight.`,
    },
    verdict: 'partial',
    trapId: 'ceftriaxone-overadjust',
    critique: {
      fr: 'Piège du « bon élève » : bien structuré, il applique une adaptation rénale… là où il ne faut pas. Il réduit la ceftriaxone à cause du DFG — inutile (élimination en partie biliaire) et risque de sous-dosage. Une erreur d’excès de prudence, plus difficile à repérer qu’une molécule franchement fausse.',
      en: 'The “good student” trap: well structured, it applies a renal adjustment… where it should not. It reduces ceftriaxone because of the GFR — unnecessary (partly biliary elimination) and risks underdosing. An over-caution error, harder to spot than an outright wrong molecule.',
    },
  },
}

// ---------- D — medgemma:27b (gros médical) ----------
// Fil rouge : la MEILLEURE réponse, mais pas parfaite (ne jamais suggérer la fiabilité totale).
const D_large_medical: ByPrompt = {
  naive: {
    text: {
      fr: 'Pyélonéphrite aiguë : ceftriaxone 1 g/j ou fluoroquinolone. Il me manque le poids et la fonction rénale pour préciser la posologie et vérifier les contre-indications.',
      en: 'Acute pyelonephritis: ceftriaxone 1 g/day or a fluoroquinolone. I am missing the weight and renal function to specify the dose and check contraindications.',
    },
    verdict: 'partial',
    critique: {
      fr: 'Réponse mesurée qui demande les données manquantes. Correcte sur le fond, incomplète faute de contexte.',
      en: 'Measured answer asking for the missing data. Correct in substance, incomplete for lack of context.',
    },
  },
  clinical: {
    text: {
      fr: 'Pyélonéphrite aiguë sans gravité : ceftriaxone 1 g/j IV/IM (pas d’adaptation rénale nécessaire) ou ciprofloxacine 500 mg × 2/j. Durée 7 jours, ECBU systématique. En cas d’insuffisance rénale, préférer la ceftriaxone ou adapter la fluoroquinolone.',
      en: 'Acute pyelonephritis without severity: ceftriaxone 1 g/day IV/IM (no renal adjustment needed) or ciprofloxacin 500 mg twice daily. Duration 7 days, systematic urine culture. In renal impairment, prefer ceftriaxone or adjust the fluoroquinolone.',
    },
    verdict: 'correct',
    critique: {
      fr: 'Très bonne réponse, y compris le point clé (pas d’adaptation de la ceftriaxone). Ici le gros modèle médical est le meilleur — mais ce n’est pas systématique (cf. modèle B).',
      en: 'Very good answer, including the key point (no ceftriaxone adjustment). Here the large medical model is best — but not systematically so (see model B).',
    },
  },
  structured: {
    text: {
      fr: `Raisonnement : PNA sans gravité → C3G parentérale ou fluoroquinolone. Pas de FQ récente. DFG 38 : la ceftriaxone ne s'adapte PAS (élimination en partie biliaire) ; la ciprofloxacine, si retenue, doit être espacée.

| Molécule | Posologie (DFG 38) | Voie | Durée |
|---|---|---|---|
| Ceftriaxone | 1 g/j (pas d'adaptation) | IV/IM | 7 j |
| Ciprofloxacine (alt.) | 500 mg / 12 à 24 h (espacée) | PO | 7 j |

À éviter : nitrofurantoïne (hors indication PNA, contre-indiquée à DFG 38). ECBU puis désescalade.
Réf. : HAS, fiche mémo pyélonéphrite ; adaptation rénale : OMEDIT / GPR.

Incertitude : confirmer la posologie à l'antibiogramme et selon l'évolution.`,
      en: `Reasoning: APN without severity → parenteral 3GC or fluoroquinolone. No recent FQ. GFR 38: ceftriaxone is NOT adjusted (partly biliary elimination); ciprofloxacin, if used, must be spaced out.

| Molecule | Dose (GFR 38) | Route | Duration |
|---|---|---|---|
| Ceftriaxone | 1 g/day (no adjustment) | IV/IM | 7 d |
| Ciprofloxacin (alt.) | 500 mg every 12–24 h (spaced) | PO | 7 d |

Avoid: nitrofurantoin (not indicated in APN, contraindicated at GFR 38). Urine culture then de-escalation.
Ref.: HAS pyelonephritis memo; renal adjustment: OMEDIT / GPR.

Uncertainty: confirm dose per susceptibility testing and clinical course.`,
    },
    verdict: 'correct',
    critique: {
      fr: 'Réponse de référence : bon raisonnement rénal (ceftriaxone non adaptée, ciprofloxacine espacée), pièges évités, deux sources citées. Le meilleur cas — mais souvenez-vous : rien ne garantissait cette qualité avant de vérifier, et un même modèle peut faillir sur une autre question.',
      en: 'Reference answer: correct renal reasoning (ceftriaxone not adjusted, ciprofloxacin spaced out), traps avoided, two sources cited. The best case — but remember: nothing guaranteed this quality before checking, and the same model may fail on another question.',
    },
  },
}

export const DEMO_RESPONSES: Record<string, ByPrompt> = {
  'small-generic': A_small_generic,
  'small-medical': B_small_medical,
  'large-generic': C_large_generic,
  'large-medical': D_large_medical,
}

// Réponse au prompt LIBRE (l'étudiant tape le sien) : en mode démo on ne peut pas
// vraiment répondre → on rejoue la variante "clinical" comme approximation, avec une note.
export const FREE_PROMPT_FALLBACK: PromptKind = 'clinical'
