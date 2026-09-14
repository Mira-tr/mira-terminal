# TRPG Public CSS layers

The Chikage TRPG pages intentionally load several stylesheets. They are
layered overrides, not interchangeable theme files: the shared entrypoint owns
the functional base, each route owns its current layout, and the final Chikage
layer owns the shared visual finish.

Keep the order below when editing a page. A route-specific correction belongs
in that route's current layer or its final route layer. Do not add another
one-off stylesheet to the end of a page without updating the layer-order test.

## Layer responsibilities

1. `css/style.css` imports the functional TRPG base, shared readability
   corrections, Public v4 finish, and compatibility bridges.
2. Route foundations provide the existing v2, calendar, picker, or Rules
   markup styles.
3. `trpg-ui-v3.css` and the Chikage House layers provide the current shell and
   shared dark visual language.
4. Route layers (`*-v5`, `*-v6`, `*-v7`, and `*-v8`) finish the active layout
   and interaction states for that surface.
5. `chikage-ultimate.css` remains last so the shared final tokens, overflow
   boundary, motion states, and accessibility finish win consistently.

## Active page order

| Page | Route-specific order after the shared entrypoint |
| --- | --- |
| TRPG overview | v2 home → UI v3 → House → UI refresh → Public finish → overview v7 → candidate input → vNext answer → answer v4 → dense answer → Scheduler v8 flow → Ultimate |
| Scheduler | v2 home → UI v3 → House → UI refresh → Scheduler v6 → candidate input → vNext answer → answer v4 → dense answer → Scheduler v7 → Scheduler v8 flow → Ultimate |
| Calendar | v2 home → calendar base → UI v3 → House → UI refresh → calendar v5 → calendar v6 → Ultimate |
| Scenario Library | UI v3 → House → UI refresh → Scenario v5 → Scenario v6 → Scenario v7 → Scenario v8 → Ultimate |
| Scenario Picker | picker base → UI v3 → House → UI refresh → Picker v6 → Ultimate |
| House Rules | Rules base → UI v3 → House → UI refresh → Rules v5 → mobile reading repair → reference clarity → Ultimate |

The Scenario Library deliberately does not load the Rules-only repair layers.
Rules keeps both reading repairs because its single-system and deep-link states
are different from the Library's compact result flow.

The page links remain separate for now because the active contracts and media
queries differ by route. This is the safe consolidation boundary: the layer
graph is explicit and tested without changing cascade order or deleting a
working presentation layer during a release pass.
