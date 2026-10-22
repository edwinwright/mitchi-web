# Glossary: Spanish

The agreed Spanish form of every term in `glossary.md`. Companion file, one per locale.

This file holds **term forms and the reasoning behind contested ones**. It does not hold definitions: those live once, in `messages/es.json`, and duplicating them here would give the site two sources of truth for the same sentence.

Variety: European Spanish, informal.

**Status: reviewed by a B1 reader, not by a native speaker.** Every Spanish string on the site was drafted by a language model and read through by the author (Spanish at B1) in WO-0003 and again in WO-0013. No native Spanish speaker has read the deployed `/es` pages. The gate for removing this notice is a native speaker reading those pages, not the JSON, and signing them off.

## Terms

| English                        | Spanish                  | Note                                                                                                                                                    |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mitchi (game, and the hand)    | Mitchi                   | Untranslated. The game's name never inflects; the hand pluralises, `dos Mitchis`. See below                                                             |
| Game                           | el juego / la partida    | The system versus the session played. See below                                                                                                         |
| Hand                           | la mano                  |                                                                                                                                                         |
| Die / dice                     | el dado / los dados      |                                                                                                                                                         |
| Roll (the noun, and the throw) | la tirada, tirar         | `tirar los dados` is the idiomatic game verb. `lanzar` is the athletic one                                                                              |
| Roll (the result)              | sacar                    | `saca seis-cuatro`. See below                                                                                                                           |
| Roll limit                     | el límite de tiradas     |                                                                                                                                                         |
| In one, in two, in three       | en una, en dos, en tres  | Compact form, used in the example strip and the vocabulary definition (`seis-tres en dos`). Prose elsewhere spells it out (`en dos tiradas`), see below |
| Stop                           | plantarse                | The verb Spanish games use for ending a turn, from blackjack and mus. `detenerse` and `parar` read as translation                                       |
| Keep (a die)                   | conservar                | `conservar el 5`. Button: `Conservar`. Alternatives rejected in the section on the practice game                                                        |
| Round                          | la ronda                 |                                                                                                                                                         |
| Turn                           | el turno                 | Standard term for a player's rolls in a round, up to the roll limit                                                                                     |
| Starting player                | el jugador inicial       | The standard term in Spanish board game rules                                                                                                           |
| Worst hand                     | la peor mano             | The base term. The Spanish pair mirrors the English pair exactly                                                                                        |
| Worst hand so far              | la peor mano hasta ahora | A direct translation of the English, which is why the English was renamed first                                                                         |
| Doubles                        | dobles                   |                                                                                                                                                         |
| The pot                        | el bote                  | See below                                                                                                                                               |
| Take the pot                   | llevarse el bote         |                                                                                                                                                         |
| Roll-off                       | tirar para empezar       | A phrase, not a term, as in English. Never a noun: not `tirada inicial`, not `desempate inicial`                                                        |
| Tie-break                      | el desempate             | Verb: `desempatar`                                                                                                                                      |
| Tied                           | empatado/a               | From `empatar`, "to tie". Pairs with `desempate`/`desempatar`                                                                                           |
| Draw                           | compartir la victoria    | `empate` is already Tied, so a draw is written as a shared win: `comparten la victoria`                                                                 |
| Fewest points                  | menos puntos             | A UI label on the Points panel. `los menos puntos` in running text                                                                                      |
| Points                         | los puntos               |                                                                                                                                                         |
| Point limit                    | el límite de puntos      |                                                                                                                                                         |

## Addressing the player

**Rule**

- Numbered steps addressed to the whole table use the infinitive: `Acordar un límite de puntos`, `Decidir quién empieza`, `Doblar el bote`.
- Prose addressed to the reader, as one player, uses `tú`: `No tienes que usar todas las tiradas`.
- A step keeps the same form from start to finish. If the bold lead-in is an infinitive, every sentence that follows it in that step is an infinitive too. Do not switch to `tú` partway through a step.

**Reasoning**

- The setup and tie-break steps ("Agree a point limit", "Decide who starts", the tie-break steps) are things the whole table does together, not one player. `Tú` reads oddly for a group action, and this file already rules out `vosotros` and `ustedes`.
- The infinitive is the standard form for written instructions in Spanish: rulebooks, recipes, signs (`Barajar las cartas`, `No fumar`). The Diccionario panhispánico de dudas accepts it for general written instructions that are not aimed at one particular person, which is what these steps are.
- It matches the English. "Agree a point limit" is an instruction to everyone, not to "you" as one player.
- Infinitives for step lists and `tú` for prose is a normal split in Spanish rulebooks, not an inconsistency. Mixing forms inside one step is the inconsistency: it reads as if two people wrote it.
- It is written down so a later edit does not mix the forms back up.

## Hand and group names

**Pattern:** `seis-cinco` for non-doubles, `doble seis` for doubles.

The hyphen marks a coined name and keeps a 21-row table scannable. It is a coinage: Spanish does not hyphenate numeral pairs by convention, so a later reader may take it for an error. `doble seis` takes no hyphen because it is a real Spanish collocation, from dominoes. The asymmetry is deliberate.

**Groups:** Mitchi, Dobles, Seis alto, Cinco alto, Cuatro alto, Tres alto. Follows `as alto` in Spanish poker: masculine, agreeing with the numeral rather than with `mano`.

## `Mitchi` and `Mitchis`

The name of the game never inflects. `Mitchi` in every position, and never bent to agree with anything around it.

The hand is different. Where the copy counts hands that were rolled, the plural is ordinary Spanish: `dos Mitchis`, in `reference.scoring.two`. English does the same, "Two Mitchis rolled", so this is not a Spanish departure from the source but the same distinction the source already makes.

The test: if the sentence is about the game, it is `Mitchi`. If it is counting hands, it pluralises.

Singular uses of the hand stay bare and without an article: `solo Mitchi puede vencer a un doble`, `cada Mitchi que se saque`.

## Why `el bote`

The load-bearing scoring metaphor, so it was chosen once and is used everywhere.

`el bote` is the standard peninsular word for a pot or kitty, and every sentence the rules need is idiomatic: `los puntos del bote`, `el bote se dobla`, `se lleva el bote`. `bote acumulado` is the ordinary phrase for a pot that rolls over, which is exactly what a tie-break does.

It carries the same false ring of victory as the English "takes the pot", where the player taking it is the one losing the round. That inversion is in the source and is preserved deliberately, not translated away.

`el pozo` does the same job with a Latin American lean. It was rejected on the Europe-first decision rather than on merit: revisit it only if a Latin American locale is ever added, and if so, as a separate locale rather than by changing this one.

## Why "roll" takes two verbs

English uses one verb for both halves of a roll: you roll the dice, and you roll six-four. Spanish splits them. `tirar` is the act of throwing, `sacar` is what comes up.

`tira los dados` and `saca seis-cuatro` are both idiomatic. `tira seis-cuatro` is not, and reads as a translation.

So `tirar` wherever the sentence is about the act:

- Everyone rolls one die → `cada jugador tira un dado`
- They may re-roll both dice → `puede volver a tirar ambos dados`

And `sacar` wherever it is about the outcome:

- The starting player rolls six-three in two rolls → `el jugador inicial saca seis-tres en dos tiradas`
- Each Mitchi rolled adds 2 more points → `cada Mitchi que se saque añade 2 puntos más`

The noun `la tirada` covers both senses and is unaffected. `glossary.md` has a single entry for **Roll** because English needs only one: the split is a fact about Spanish, not a change to the term.

## `el juego` and `la partida`

`el juego` is Mitchi as a system: its rules, its hands, its ranking. `la partida` is one session, played to the point limit and then over.

English says "game" for both, so each occurrence has to be read for which one it means:

- The best hand in the game → `la mejor mano del juego`, the system
- The game ends as soon as any player reaches the point limit → `la partida termina en cuanto un jugador alcanza el límite de puntos`, the session
- Hand ranking and scoring, for use mid-game → `durante la partida`, the session

The test: if the English could say "in Mitchi", it is `el juego`. If it could say "this game" and mean tonight's, it is `la partida`. The hand strings translated first already use `del juego`, which is correct and is what leaves `la partida` free for the other sense.

## Register

Informal second person singular, present tense, for procedure and definitions alike: `tira los dados`, `plántate cuando estés contento con tu mano`, `solo necesitas superar la peor mano hasta ahora`. `tú` is any player. Name a role only where the role matters: `el jugador inicial fija el límite de tiradas`. This mirrors the English, and `voice.md` is the source of the rule.

About is first person, the author speaking: `aprendí Mitchi de mi primo`.

The `vosotros` and `ustedes` question does not arise: the only second-person forms in the copy are singular. Where the English says "everyone" or "each player", Spanish keeps the impersonal (`cada jugador tira un dado`) rather than switching to a plural you.

## The practice game

The commentary log in `/es/jugar` is a column of rows. A row is cells: a player label, an action phrase, and sometimes a hand name. The action phrase has two whole strings, one for the viewer (`commentary.you.*`, second person singular, `tú`) and one for every other player (`commentary.player.*`, third person, read after the player's label). Controls and links use the infinitive, as the site's other buttons and links do (`Leer las reglas`).

| Action                   | Viewer (`tú`)              | Another player                        |
| ------------------------ | -------------------------- | ------------------------------------- |
| Stop                     | `Te plantas`               | `Se planta`                           |
| Has no rolls left        | `No te quedan tiradas`     | `No le quedan tiradas`                |
| Rolls (the result)       | `Sacas`                    | `Saca`                                |
| Rolls to start           | `Tiras para empezar`       | `Tira para empezar`                   |
| Starts the round         | `Empiezas la ronda`        | `Empieza la ronda`                    |
| Takes the pot            | `Te llevas el bote: {pot}` | `Se lleva el bote: {pot}`             |
| Wins                     | `Ganas`                    | `Gana`                                |
| Rolls both dice again    | (not shown)                | `Vuelve a tirar los dos dados`        |
| Rolls again, keeping one | (not shown)                | `Vuelve a tirar, conservando un dado` |

`Sacas` and `Saca` stand before a hand name in the next cell (`Saca` + `seis-cuatro`), so they use the outcome verb. `Tiras para empezar` is the act of rolling a die to start, so it uses `tirar`. See "Why 'roll' takes two verbs".

**Keep.** `conservar` is the nearest Spanish verb to the English "keep": the die stays as it is while the other is thrown. `apartar` ("set aside") was rejected because it describes moving the die, not the choice; `guardar` was rejected because on a button it reads as "save". **Reviewer: `conservar` versus `apartar`.**

**Draw.** `Comparten la victoria` stands alone as a sentence. `empate` is already Tied.

**Slugs.** `/es/jugar` conflicts with nothing in `translation-rationale.es.md` (section 6 lists `reglas`, `referencia`, `acerca-de`). `jugar` is the verb of the page, in the style of `reglas` and `referencia`: one word, no diacritics.

### The status line

The line under the dice card's heading says what is happening now. Another player's line is a label cell, then the phrase, read after it, so the phrase is third person. The viewer's lines are second person (`tú`). `{face}` is a digit.

| English                                         | Spanish                                                                               | Forms and note                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Each player rolls one die. The highest starts … | `Cada jugador tira un dado. Empieza la primera ronda quien saque el número más alto.` | `tirar` for the act, `sacar` for the result, as in `rules.setup.whoStarts`                             |
| You roll first                                  | `Tiras tú primero`                                                                    | `tú` stated, because it follows the explanation addressed to everyone                                  |
| You roll a {face} / Rolls a {face}              | `Sacas un {face}` / `Saca un {face}`                                                  | The result, so `sacar`. `un` agrees with the masculine `número`, understood                            |
| Tied on {face}                                  | `Empate a {face}. Los jugadores empatados vuelven a tirar.`                           | `empate a` + number is the idiom (`empate a cero`). `empatados`, plural of the glossary's `empatado/a` |
| Rolls next                                      | `Tira a continuación`                                                                 | The act, so `tirar`. Distinct from `Tira ahora`, Rolling now                                           |
| Keeps the {face} / … instead                    | `Conserva el {face}` / `Conserva el {face} en su lugar`                               | `conservar el 5`, as for the Keep button                                                               |
| Their hand (beats, ties, worse)                 | `Su mano la supera` / `Su mano empata con ella` / `Su mano es peor`                   | Mirrors `Tu mano …`. `su` carries no gender. `la`, `ella`: the hand to beat, `la mano`                 |
