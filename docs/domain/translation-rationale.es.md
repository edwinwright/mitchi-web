# Spanish: translation decisions

Companion to `glossary.es.md`. The glossary carries the forms that are binding
on copy; this file keeps the reasoning behind them and the alternatives that
were set aside, so a later editor does not reopen a settled question or "fix"
something that is deliberate.

Settled before any Spanish was written. Migrated here from the work order that
produced it; the instructions it also carried have been applied and are not
repeated.

## 1. Register and variety

European Spanish, informal, in two registers rather than one.

- **Procedure and definitions: impersonal or third person.** `cada jugador
tira`, `se tira`, `el jugador inicial tira los dados`.
- **The reader's own position: second person singular, `tú`.** Only where the
  sentence is about what you are trying to do rather than what happens: `solo
necesitas superar la peor mano`.
- **Home and About: second person freely.** They already are in English.

This mirrors the English. Every procedural string in `en.json` is third person;
the second-person strings are all either on Home and Reference or about the
reader's own position. `voice.md` described this wrongly at the time and was
corrected to match.

Consequence worth keeping: with procedure impersonal, the `vosotros` versus
`ustedes` split barely arises, because the only second-person forms left are
singular. The European choice therefore lands in vocabulary rather than
grammar, which is a much cheaper place for it.

## 2. Two English renames taken before translation began

Both were made while `en.json` was the only real copy, which is the cheapest
moment a rename will ever cost.

**The table became the pot.** "The table" named the round's stake and collided
with the literal table people play at, which several strings use in the
physical sense. "The pot" is immediately understood, keeps the same ring of
false victory as "takes the table", and translates directly.

**Current worst hand became worst hand so far.** "Current" was doing the work
of saying that the hand to beat changes during the round, and doing it
clumsily. "Worst hand so far" is what a player would actually say at the table,
and is self-explaining enough that a reader does not have to reach the Terms
section for it. It also settled the Spanish, since `la peor mano hasta ahora`
became a direct translation rather than an interpretive choice.

Both appear in the glossary's "Terms deliberately not used".

## 3. The pot: `el bote`

**`el bote`**, and **`llevarse el bote`**.

The standard peninsular term for a pot or kitty, used throughout Spanish poker
glossaries. Every sentence the rules need is idiomatic: `los puntos del bote`,
`el bote se dobla`, `se lleva el bote`. `bote acumulado` is the normal phrase
for a pot that rolls over, which is exactly what the doubling table describes.

**Rejected:** `el pozo`, the same idea with a Latin American lean. Set aside on
the Europe-first decision, not on merit. Revisit only if a Latin American
locale is ever added.

## 4. Terms

| English           | Spanish                  | Note                                                                       |
| ----------------- | ------------------------ | -------------------------------------------------------------------------- |
| Mitchi            | Mitchi                   | Untranslated, uninflected, in every language                               |
| Hand              | la mano                  |                                                                            |
| Die / dice        | el dado / los dados      |                                                                            |
| Roll              | la tirada, tirar         | `tirar los dados` is the idiomatic game verb; `lanzar` is the athletic one |
| Roll limit        | el límite de tiradas     |                                                                            |
| Round             | la ronda                 |                                                                            |
| Starting player   | el jugador inicial       | The standard term in Spanish board game rules                              |
| Worst hand so far | la peor mano hasta ahora |                                                                            |
| Doubles           | dobles                   |                                                                            |
| The pot           | el bote                  | Section 3                                                                  |
| Take the pot      | llevarse el bote         |                                                                            |
| Tie-break         | el desempate             | Verb: `desempatar`                                                         |
| Points            | los puntos               |                                                                            |
| Point limit       | el límite de puntos      |                                                                            |

## 5. Hand and group names

**Pattern:** `seis-cinco` for non-doubles, `doble seis` for doubles.

The hyphen marks a coined name and keeps a 21-row table scannable. It is a
coinage in Spanish rather than an established convention, whereas `doble seis`
is the real collocation from dominoes and takes no hyphen. **The asymmetry is
deliberate and a later translator should not "fix" it.**

The rule it establishes, and which Polish follows: mirror the English structure
where the language allows it, and use the language's own established form where
it has one.

**Group names:** Mitchi, Dobles, Seis alto, Cinco alto, Cuatro alto, Tres alto.
Follows `as alto` in Spanish poker. Masculine, agreeing with the numeral rather
than with `mano`.

## 6. Slugs

| English      | Spanish          |
| ------------ | ---------------- |
| `/`          | `/es`            |
| `/rules`     | `/es/reglas`     |
| `/reference` | `/es/referencia` |
| `/about`     | `/es/acerca-de`  |

`/speak` was also given a slug at the time, left untranslated because Mitchi
Speak is a proper noun. The route was later retired; its redirect remains
because the URL existed and may be linked.

## 7. English hyphenation: confirmed, no change

The hyphens in the English hand names are correct and have precedent. Poker
writes `ace-king`, dominoes writes `double-six`, and both hyphenate when the
pair names a hand or a tile rather than describing one. `six-five` and
`double-six` are right as they stand.

## 8. Why the vocabulary was closed here

Two English renames were taken in this pass, both before any translation
existed. From the point a second locale holds real copy, a rename is five files
and five reviews rather than one. The vocabulary was closed at the end of it,
and that is the rule for any future locale: settle the English first.
