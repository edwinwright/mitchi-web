# Glossary: Polish

**Status: unreviewed machine translation.** Every Polish string on the site and every form in this file was produced by a language model in WO-0014 (September 2026) and has not been read by a native Polish speaker. Nobody on the project reads Polish. Treat the site's Polish as a draft that happens to be deployed. The gate for removing this notice is a native speaker reading the deployed `/pl` pages, not the JSON, and signing them off. Start with: the plural imperatives in Setup and Tie-breaks, `najgorszy jak dotąd układ`, the group names `Najwyżej szóstka` and so on, and whether `Mitchi` agrees as neuter.

The agreed Polish form of every term in `glossary.md`. Companion file, one per locale.

This file holds **term forms and the reasoning behind contested ones**. It does not hold definitions: those live once, in `messages/pl.json`, and duplicating them here would give the site two sources of truth for the same sentence.

Variety: standard Polish, informal.

Polish nouns change ending by grammatical role (seven cases, three genders, two numbers), so a term has more than one form. The **Forms in the copy** column lists every form that actually occurs on the site, not just the headword, so a later edit can check a form against this list rather than guess it. Every sentence on the site is a whole string (see `i18n-conventions.md`, "Fixed values are flat strings"), so each form is written in place; no form is ever selected at runtime.

## Terms

| English                                    | Polish                                                               | Forms in the copy                                               | Note                                                                                                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mitchi (game, and the hand)                | Mitchi                                                               | Mitchi (all cases)                                              | Indeclinable, as foreign words ending in `-i` are in Polish. Agreement neuter: `pierwsze Mitchi`, `każde Mitchi`, `dwa Mitchi`. No plural ending. See below. **Reviewer: neuter or masculine agreement** |
| Game                                       | gra                                                                  | gra, gry, grę, w grze                                           | One word for both senses, the system and the session. See below                                                                                                                                          |
| Hand                                       | układ                                                                | układ, układu, układem, układy                                  | The dice and poker combination word. Masculine inanimate, so accusative equals nominative: the term string survives as both subject and object                                                           |
| Die / dice                                 | kość / kości                                                         | kość, kości, kością, kośćmi, dwie kości, obie kości, jedną kość | Rulebook standard. "Roll both dice" takes the instrumental: `rzuca dwiema kośćmi`                                                                                                                        |
| Roll (the throw)                           | rzucać / rzucić                                                      | rzuca, rzuć, rzućcie                                            | Imperfective for rules stating what happens, perfective for a one-off instruction. See below                                                                                                             |
| Roll (the result)                          | wyrzucić                                                             | wyrzuca, wyrzucił, wyrzucone                                    | What came up: `wyrzuca sześć-cztery`. See below                                                                                                                                                          |
| Re-roll                                    | przerzucić                                                           | przerzucić obie kości, przerzucić jedną kość                    | A third verb, where English adds a prefix and Spanish a phrase. See below                                                                                                                                |
| Roll (the noun)                            | rzut                                                                 | rzut, rzutu, rzuty, rzutów, w rzucie                            |                                                                                                                                                                                                          |
| Roll limit                                 | limit rzutów                                                         | limit rzutów, limitu rzutów, do limitu rzutów                   | Masculine inanimate: nominative equals accusative                                                                                                                                                        |
| In one, in two, in three                   | w jednym, w dwóch, w trzech                                          |                                                                 | Locative, "in one (roll)": `sześć-trzy w dwóch`. Each strip note is a whole string, so the form is written per sentence, never selected by a count                                                       |
| Stop                                       | zatrzymać się                                                        | zatrzymuje się, zatrzymaj się                                   | Plain verb, no game idiom needed                                                                                                                                                                         |
| Round                                      | runda                                                                | runda, rundy, rundę, w rundzie                                  |                                                                                                                                                                                                          |
| Turn                                       | tura                                                                 | tura, tury, turę, w turze                                       | Standard board game word                                                                                                                                                                                 |
| Starting player                            | gracz rozpoczynający                                                 | gracz rozpoczynający, gracza rozpoczynającego                   | Standard rulebook phrase. Person nouns are masculine animate, so accusative equals genitive, unlike `układ`: `przez gracza rozpoczynającego`                                                             |
| Worst hand                                 | najgorszy układ                                                      | najgorszy układ, najgorszego układu                             | The base term                                                                                                                                                                                            |
| Worst hand so far                          | najgorszy jak dotąd układ                                            | najgorszy jak dotąd układ, najgorszego jak dotąd układu         | Compact enough for the example strip. **Reviewer: versus `najgorszy dotychczasowy układ`**                                                                                                               |
| Doubles                                    | dublety                                                              | dublety, dublet                                                 | The backgammon and dice word for a pair                                                                                                                                                                  |
| Six-high, five-high, four-high, three-high | najwyżej szóstka, najwyżej piątka, najwyżej czwórka, najwyżej trójka | as group names, capitalised                                     | "A six at most", which is the definition. See below. **Reviewer: the least certain naming choice in the set**                                                                                            |
| The pot                                    | pula                                                                 | pula, puli, pulę, w puli                                        | The standard Polish poker word. See below                                                                                                                                                                |
| Take the pot                               | zgarnąć pulę                                                         | zgarnia pulę                                                    | The idiomatic poker phrase                                                                                                                                                                               |
| Tie-break                                  | dogrywka                                                             | dogrywka, dogrywki, dogrywkę, w dogrywce                        | Standard sports and games word for a play-off                                                                                                                                                            |
| Tied                                       | remis / remisować                                                    | remisują, mają remis, mają ten sam układ                        | "Tied on the worst hand" phrases as "have the same worst hand": `mają ten sam najgorszy układ`                                                                                                           |
| Draw                                       | dzielić się zwycięstwem                                              | dzielą się zwycięstwem                                          | `remis` is already Tied, so a draw is written as a shared win                                                                                                                                            |
| Points                                     | punkty                                                               | punkt, punkty, punktów                                          | Three plural forms. See below                                                                                                                                                                            |
| Point limit                                | limit punktów                                                        | limit punktów, limitu punktów                                   |                                                                                                                                                                                                          |

## Addressing the player

**Rule**

- Prose addressed to the reader, as one player, uses `ty`, second person singular: `Nie musisz wykorzystać wszystkich rzutów`.
- Numbered steps done by the whole table use the plural imperative, the `wy` form: `Ustalcie limit punktów`, `Zdecydujcie, kto zaczyna`, `Podwójcie pulę`.
- Named roles take the third person: `Gracz rozpoczynający ustala limit rzutów`.
- `ty`, `twój` and so on in lower case. Capitalising `Ty` is a courtesy convention in letters and marketing; a rulebook is neither.
- A step keeps the same form from start to finish. If the bold lead-in is a plural imperative, every sentence that follows it in that step is too. Do not switch to `ty` partway through a step.

**Reasoning**

- Polish has a formal register (Pan/Pani, with third-person verbs) for strangers, officials and customers. It is not used in game rulebooks: "Sir rolls the dice" would read like a legal notice. Modern Polish rulebooks and consumer websites use the informal `ty`, which is what the English "you" and the Spanish `tú` are doing. The outcome matches Spanish, but for a different reason: Spanish had a real choice between `tú` and `usted`; Polish has a formal register that is simply wrong for this genre.
- The group steps differ from Spanish. Spanish used the infinitive because its plural "you" splits regionally (`vosotros` versus `ustedes`). Polish has one plural "you", and its plural imperative is exactly what Polish rulebooks use for setup steps. So where Spanish says `Acordar un límite de puntos`, Polish says `Ustalcie limit punktów`.
- Where the English says "everyone" or "each player", Polish keeps the impersonal or third person (`każdy gracz rzuca jedną kością`) rather than switching to a plural you.

**For a native reviewer:** the plural imperatives in Setup and Tie-breaks, and whether any `ty` sentence would read more naturally as impersonal.

## Hand and group names

**Non-doubles: `sześć-pięć`**, cardinal numerals with a hyphen, mirroring the English and Spanish structure. The Mitchi hand row (`hands.2-1`, "two-one") is `dwa-jeden`. A numeral compound stays fixed in every position, like a score.

**Doubles: `dwie szóstki`** ("two sixes"), down to `dwie jedynki`. Polish has nominalised numerals for die faces (`szóstka`, `piątka`, `czwórka`, `trójka`, `dwójka`, `jedynka`: "a six", "a five") and "two sixes" is what a Polish player says at the table. It is the language's own established form, which the glossary rule prefers over a calque (`podwójna szóstka`). The asymmetry with `sześć-pięć` is the same deliberate asymmetry Spanish has between `seis-cinco` and `doble seis`. Unlike `sześć-pięć`, `dwie szóstki` declines (`dwóch szóstek`, `dwiema szóstkami`); every sentence containing a hand name is a whole string, so the form is written in place.

**Groups:** Mitchi, Dublety, Najwyżej szóstka, Najwyżej piątka, Najwyżej czwórka, Najwyżej trójka. "Six-high" has no Polish poker equivalent. `Najwyżej szóstka` means "a six at most", which is the exact definition: the higher die is a six. `Z szóstką` ("with a six") was rejected because six-five also has a five, so "with a five" would be ambiguous. **Reviewer: this is the least certain naming choice in the set.**

## `Mitchi` never inflects

The name of the game never inflects, in Polish as in every locale. Polish gives this for free: foreign words ending in `-i` are indeclinable by ordinary rule, so `Mitchi` in every position needs no special pleading.

The hand is the same word and, unlike Spanish (`dos Mitchis`), takes no plural ending either: `dwa Mitchi`. Where the copy counts hands, the numeral carries the plural and the noun stays put.

Agreement is neuter, as for other indeclinable foreign nouns: `pierwsze Mitchi`, `każde Mitchi`, `dwa Mitchi`. **Reviewer: a native speaker may prefer masculine agreement (`pierwszy Mitchi`, `każdy Mitchi`) by analogy with `układ`. Either is defensible; one must be used throughout.**

## Why `pula`

The load-bearing scoring metaphor, so it was chosen once and is used everywhere.

`pula` is the standard Polish poker word for the pot, and every sentence the rules need is idiomatic: `punkty w puli`, `pula się podwaja`, `zgarnia pulę`. `zgarnąć pulę` ("scoop the pot") is the idiomatic phrase for taking it, and it keeps the false ring of victory the English has: the player scooping the pot is the one losing the round. That inversion is in the source and is preserved deliberately.

## Why "roll" takes three verbs

English uses one verb for the throw, the result and the re-throw. Spanish splits it in two (`tirar`, `sacar`, and `volver a tirar` for the third). Polish has a word for each.

- **`rzucać` / `rzucić`**, the act of throwing. Imperfective where the rules state what happens (`gracz rozpoczynający rzuca dwiema kośćmi`), perfective for a one-off instruction (`rzuć jedną kością`, `rzućcie po jednym razie`).
- **`wyrzucić`**, what came up: `wyrzuca sześć-cztery`, `każde wyrzucone Mitchi`. `rzuca sześć-cztery` reads as a translation.
- **`przerzucić`**, to re-roll: `przerzucić obie kości`, `przerzucić jedną kość`. English adds a prefix ("re-roll") and Spanish a phrase (`volver a tirar`); Polish has its own verb, and using `rzucić ponownie` throughout would read as translation.

The test is the same as for Spanish: if the sentence is about the act, `rzucać`; if it is about the outcome, `wyrzucić`; if it is about doing it again, `przerzucić`. The noun `rzut` covers all three senses and is unaffected. `glossary.md` has a single entry for **Roll** because English needs only one: the split is a fact about Polish, not a change to the term.

## Points and the three plurals

Polish numerals govern three forms of the noun:

| Count                             | Form      | Example                                       |
| --------------------------------- | --------- | --------------------------------------------- |
| 1                                 | `punkt`   | `1 punkt`                                     |
| 2, 3, 4 (and 22, 23, 24, 32…)     | `punkty`  | `2 punkty`, `24 punkty`                       |
| 5 to 21, then 25 to 31, and so on | `punktów` | `5 punktów`, `25 punktów`, `limit 25 punktów` |

The English strings use static numbers ("1 point", "2 points", "adds 2 more"), so no ICU `plural` is needed: each occurrence is hand-picked and written whole. This table is here so nobody "fixes" `2 punkty` to `2 punktów`, or `25 punktów` to `25 punkty`. Bare `punkty` (no numeral) is the ordinary plural: `punkty są złe`, `najmniej punktów wygrywa` (the genitive after "fewest").

## `gra` for both senses of game

English says "game" for both Mitchi as a system and one session played to the point limit. Spanish needs two words (`el juego`, `la partida`). Polish has the same pair available (`gra`, `partia`), but `gra` covers both senses without ambiguity in this copy: `najlepszy układ w grze` (the system), `koniec gry`, `gra kończy się` (the session). One word is used. Recorded so a later translator does not introduce `partia` for variety.

## Register

Informal second person singular, present tense, for prose addressed to the reader: `rzucasz`, `zatrzymaj się, gdy układ ci odpowiada`, `musisz tylko pobić najgorszy jak dotąd układ`. `ty` is any player. Name a role only where the role matters: `gracz rozpoczynający ustala limit rzutów`. Steps for the whole table take the plural imperative, see Addressing the player. This mirrors the English, and `voice.md` is the source of the rule.

About is first person, the author speaking: `nauczyłem się Mitchi od kuzyna`.

Contractions do not exist in Polish, so the English contractions on Home and About have nothing to mirror; the informality is carried by `ty` and word choice instead.
