# Voice

How the site is written, in every language. Binding on English and on every translation.

## Register

**Second person, present tense.** Short sentences, one idea each. "You" is any player: "Roll both dice", "Stop when you are happy with your hand". Name a role only where the role matters: "the starting player sets the roll limit".

No idioms. "Tied", never "level". No jokes, no asides, no "simply" and no "just". A reader mid-game wants an answer, not a personality.

| Do                                         | Do not                                                |
| ------------------------------------------ | ----------------------------------------------------- |
| "Roll both dice."                          | "Go ahead and roll both dice."                        |
| "You may re-roll either die."              | "You're free to re-roll either die if you fancy it."  |
| "The starting player sets the roll limit." | "You set the roll limit." (when only one player does) |
| "The worst hand takes the pot."            | "Bad luck: the worst hand takes the pot."             |
| "Players tied on the worst hand"           | "Players level on the worst hand"                     |
| Use the terms in `docs/domain/glossary.md` | Introduce a synonym because a sentence reads better   |

In translation, procedure takes the informal second person singular, or whatever form the language uses for game instructions addressed to the player. For Spanish, this holds for prose addressed to one player; numbered steps addressed to the whole table take the infinitive instead, see `docs/domain/glossary.es.md`.

## Numbers

- Die faces are digits: "a 2 and a 1".
- Hand names are words: "six-three", "double-six".
- Counts of rolls, dice and players are words: "two rolls", "three players".
- Points are digits: "1 point", "adds 2".

"In one", "in two", "in three" is how a hand's roll count is said at the table: "six-three in two". It is vocabulary, not a shortcut.

## The exception: Home and About

Home and About may be warmer.

> Home and About use contractions ("don't", "it's"). Procedural copy does not: Rules, Reference, Home's 60-second quick start, and the game vocabulary.

> The key idea, that you never need the best hand, only to avoid the worst, is a rule of the game. It appears wherever a page needs it. Do not copy the same sentence from page to page: say it in words that fit the page.

Home also maps the game in 60 seconds (`home.quickStart`) and shows the six-group ranking (`RankList`).

**About is first person.** The author writes it. It is the only page that is.

## Conventions

- Sentence case headings.
- One `h1` per page, no heading level skipped.
- Terminology comes from the glossary. A new word means the glossary is updated first, not that a synonym is used.
- In-text term references link to `/rules#vocabulary`.
- About says nothing about the site being a practice project. The game stands on its own.
- The origin is fixed: the author learnt Mitchi from his cousin in southern Spain. The origin of the game and of its name is unknown. The site does not claim Mitchi is a traditional Spanish game. The rules are written from memory, with gaps checked with the cousin; they are not "settled".
- Drinking is not emphasised. The site is for all players and ages.
- The locale 404 is rulebook-neutral and uses `notFound.*`. The root 404 is a standalone English page with no chrome; it only points back to `/`. It does not use the message files.

## Why cutting matters

`/rules` is roughly 70% of the site's word count, and therefore 70% of the translation and QA cost in every locale. A sentence added there is added once per language. Cut hard.
