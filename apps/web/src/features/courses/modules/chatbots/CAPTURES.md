# Captures de modèles — cas pyélonéphrite

Relevé du **14/08/2026** via OpenRouter. Cas soumis :

> J'ai une patiente qui a une pyélonéphrite aiguë sans signe de gravité. DFG 38.
> Quelle antibiothérapie lui donner ?

Deux conditions par modèle : **NU** (sans system prompt) et **SYS** (avec le
system prompt du TD, qui impose une réponse directe et concise).

Textes intégraux dans [`captures.json`](captures.json) — source du mode démo hors-ligne.

## La réponse de référence

Ceftriaxone 1 g/j (aucune adaptation rénale nécessaire) **ou** ciprofloxacine
500 mg × 2/j, **7 jours**. Jamais de nitrofurantoïne (aucune diffusion
parenchymateuse, et contre-indiquée sous 45 mL/min).

## Effet du system prompt

| Modèle | Sans | Avec | Temps |
| --- | ---: | ---: | --- |
| Gemma 3 4B | 4046 c | 336 c | 27,7 s → 5,5 s |
| Gemma 3 27B | 3512 c | 370 c | 11,7 s → 4,1 s |
| Qwen3 8B | 2311 c | 182 c | 30,5 s → 4,7 s |
| Llama 3.3 70B | 2553 c | 163 c | 46,0 s → 5,0 s |
| Mistral Small 24B | 2350 c | 327 c | 31,5 s → 4,1 s |
| Phi-4 | 2166 c | 404 c | 7,5 s → 1,8 s |

Réponses **10× plus courtes et 5× plus rapides**, sans disclaimer. Les erreurs
cliniques, elles, ne disparaissent pas — elles deviennent seulement lisibles.

## Erreurs relevées (avec system prompt)

| Modèle | Erreur | Gravité |
| --- | --- | --- |
| **Gemma 3 4B** | Invente **« c'estivacycline »** — molécule inexistante. Propose céfuroxime, non recommandé en 1re intention. | hallucination pure |
| **Llama 3.1 8B** | **Amoxicilline** en probabiliste (résistances *E. coli*), **14 jours**, et conclut *« SELON moi suffisamment large »* | grave |
| **Phi-4** | Qualifie le traitement d'**« antibioprophylactique »** (c'est curatif) ; ciprofloxacine **250 mg**, sous-dosée | grave |
| **Qwen 2.5 7B** | **Céfalexine** (C1G) — ne couvre pas la pyélonéphrite | grave |
| **Qwen3 8B** | *« Posologie : 14 jours. Durée : 14 jours »* — confond les champs ; **14 jours** au lieu de 7 | moyen |
| **Llama 3.3 70B** | 7 à 10 jours, sans mention de la fonction rénale | fin |
| **Gemma 3 27B** | Correct sur l'essentiel, mais évoque *« 7-14 jours au total »* | fin |
| **Mistral Small 24B** | Céfotaxime 2 g × 3/j : dose élevée, aucune adaptation au DFG 38 | fin |
| **GPT-OSS 20B** | Répond **en anglais** ; « standard dose acceptable » à DFG 38, discutable | moyen |

### Sans system prompt : la nitrofurantoïne

Deux modèles proposent la faute grave. **Llama 3.3 70B** — le plus gros testé :

> **Nitrofurantoïne** : Surtout indiquée pour les infections du bas appareil
> urinaire, elle peut être utilisée pour la pyélonéphrite aiguë sans signe de
> gravité. La posologie typique est de 100 mg, 2 fois par jour.

**Phi-4** l'inclut aussi, avec une posologie inventée (« cinq doses par jour »).

C'est le point pédagogique le plus fort du corpus : **la taille du modèle ne
protège pas de l'erreur**, et l'erreur est énoncée avec le même aplomb que le
reste.

## Anomalie technique

**Gemma 3 27B** a produit du texte corrompu lors d'un essai manuel (`deH singleB`,
`pyélAte`, `**C Clinical`) et un bloc `thought` parasite. Non reproduit dans ce
relevé automatisé — probablement un provider défaillant ponctuel sur OpenRouter.
À surveiller : prévoir un repli si cela se reproduit en séance.

## Sélection retenue pour le TD

Révisée le 13/10/2026 d'après le benchmark (étape « Benchmark ») : un modèle
par profil, pour que l'étudiant voie que la qualité se joue au niveau du
modèle, du prompt ET des sources. Llama 3.1 8B a été retiré : il doublait
Gemma 3 4B dans « mauvais quoi qu'il arrive ».

| Profil | Modèle | Pourquoi |
| --- | --- | --- |
| Mauvais quoi qu'il arrive | **Gemma 3 4B** | Hallucine une molécule inexistante, reste faux avec les documents |
| Progresse | **Mistral Small 24B** | Correct en brut, invente ses références au prompt travaillé, presque parfait avec les documents |
| Intermédiaire | **Llama 3.3 70B** | Le plus gros des modèles ouverts — et médiocre même documents en main |
| Bon d'emblée | **GPT-6 Luna** | Modèle fermé, taille non publiée ; juste dès la question brute, n'invente pas de référence |
