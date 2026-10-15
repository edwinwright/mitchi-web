# Polish: translation decisions

Companion to `glossary.pl.md`. The glossary carries the forms that are binding
on copy and the reviewer flags; this file keeps what it does not, namely the
alternatives that were set aside and the things that turned out not to be
questions.

**Nobody on the project reads Polish.** Every decision below was proposed by a
language model and accepted by the author on the English reasoning. See section
7 for what has and has not been checked by someone who reads the language.

## 1. Register: informal, plural imperatives

`ty` for prose, plural imperative for whole-table steps, third person for named
roles, first person on About, lower-case `ty`.

**Rejected**

- **Pan/Pani, the formal register.** Right for customer emails and officials,
  wrong for the genre: Polish rulebooks do not say "Sir rolls the dice".
- **Infinitive for the group steps**, as Spanish does. Spanish went there
  because its plural "you" splits regionally. Polish has one plural "you" and
  the plural imperative is what its rulebooks actually use, so the Spanish
  workaround is not needed. `voice.md` already allows "whatever form the
  language uses for game instructions".
- **Capitalised `Ty`.** A letter-writing and marketing courtesy. The site has
  no personality to be courteous with.

## 2. Terms

The forms in use are in the glossary. Alternatives considered and set aside:

| Term              | Rejected                        | Why                                                                                                             |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Hand              | `ręka`                          | Card-game flavour, and with dice it reads as the physical hand                                                  |
| Die               | `kostka`                        | The everyday word and equally common; `kość` is the rulebook standard. Either would do, one is used             |
| Stop              | `pasować`                       | Means to pass on a turn, not to keep a hand                                                                     |
| Re-roll           | `rzucić ponownie`               | Correct but a phrase; `przerzucić` is the word dice rules use                                                   |
| Game (session)    | `partia`                        | Available, as `la partida` is in Spanish, but `gra` covers both senses in this copy without ambiguity. One word |
| Worst hand so far | `najgorszy dotychczasowy układ` | Not rejected, just not chosen: `najgorszy jak dotąd układ` is shorter for the strip. Flagged for the reviewer   |

**`Mitchi` agreement.** Neuter, as for indeclinable foreign nouns. Masculine by
analogy with `układ` is defensible. Flagged; whichever the reviewer prefers is
applied throughout, and the glossary rule is that one form is used everywhere.

## 3. Hand and group names

`sześć-pięć` and `dwie szóstki`: the same structural asymmetry as Spanish, and
the same rule from `translation-rationale.es.md` section 5. Mirror the English
where the language allows it, use the language's own form where it has one.

**Rejected**

- **`podwójna szóstka`** for doubles: a calque. `dwie szóstki` is what a player
  says.
- **`Z szóstką`** ("with a six") for the group name: six-five also has a five,
  so "with a five" is ambiguous about which group it names.
- **`Szóstka wysoka`** and similar calques of "six-high": no Polish poker
  equivalent exists to borrow from.

`Najwyżej szóstka` ("a six at most") is the definition stated as a name. It is
the least certain choice in the set and is flagged as such in the glossary.

## 4. Slugs

`/pl`, `/pl/zasady`, `/pl/sciagawka`, `/pl/o-grze`.

**Rejected**

- `reguly` for rules: exists, but `zasady gry` is what rulebooks say.
- `w-skrocie` and `skrot` for reference: neither says "one-screen cheat sheet"
  as directly as `ściągawka`. Its literal sense, an exam crib sheet, was
  accepted knowingly; it suits the informal register.
- `o-mitchi` for about: `o-grze` is the shape Polish sites use (`/o-nas`,
  `/o-mnie`).
- **Diacritics in the slug.** Polish URLs strip them by convention, hence
  `sciagawka`, not `ściągawka`. The nav label and page title keep them:
  `Ściągawka`.

## 5. Two findings that were about the code, not the language

Polish surfaced both. Neither is a language decision, so both live in
`i18n-conventions.md` and are only noted here so the trail is not lost.

- **Font subsets are not free.** Polish diacritics are Latin Extended-A, so
  `subsets: ["latin"]` silently renders them in the fallback font. See "Adding
  a locale", step 5, which was written as a result.
- **Fixed-value ICU arguments were fixed at source rather than worked around.**
  A case system cannot fill a slot that has to agree with its host sentence, so
  the templates were flattened to whole strings in English and Spanish before
  Polish was scaffolded. See "Fixed values are flat strings". German and
  Japanese inherit the fix.

## 6. `/speak` is not a question

`/speak` was retired earlier. The `/speak` and `/es/speak` redirects stay
because those URLs existed and may be linked. No `/pl/speak` redirect is added,
because that URL never existed. Nothing to decide.

## 7. Review status

**The standard.** A native speaker reading the deployed Polish pages, not the
JSON, and signing them off. The glossary's Status block says where to start. A
green build is not evidence.

**Where it actually stands.** A native speaker gave the copy an initial check
before `/pl` was published. The full pass against that standard, including the
flags raised in sections 2 and 3, has not yet happened. Corrections are welcome
in the meantime; see the README.
