# Reference Site Anatomy: kimivla v1.0.2

Reviewed: 2026-08-26

Scope: the user-supplied static reference at `参考資料/kimivla_v1.0.2/site/`. It is analysis material only. Its source, writing, art, logo, and assets are not copied into RELMUA.

## Reference Site Anatomy

The reference is a Japanese scenario handbook built as a static, multi-page documentation site. It uses a compact persistent header, a hierarchical navigation tree, site search, and a deliberately narrow reading column. At desktop widths, the information architecture stays visible in a left rail; at mobile widths, that rail becomes a drawer while the header retains the site name, current location, menu control, and search.

Its home is not a product dashboard. It establishes the work with one title treatment, one large image, a compact premise, and one contextual next step. The rest of the system is reached through the persistent navigation.

## Visual Strengths

- A single, unmistakable title image gives the first screen authorship and a strong point of view.
- The site keeps a strict black ground and a small accent palette, so long documents do not turn visually noisy.
- The desktop content rail has a clear visual contract: navigation on the left, one reading task in the center, utility controls at the top.
- The page title, image, and premise are stacked in a predictable editorial order. Nothing competes with the current reading task.

## Navigation Strengths

- Header controls are few and legible: menu, site/current-page context, and search.
- The navigation tree groups a large amount of material into meaningful sections instead of exposing every destination as a peer.
- The current page is explicit in both the header and the tree.
- Mobile preserves orientation without attempting to show the entire information architecture at once.

## CTA Strategy

The reference does not use generic call-to-action rows. Its primary action is contextual: a first-time reader is pointed directly to setup from the premise, while deeper actions live inside the relevant chapter. This is the useful rule for RELMUA: show one next action at the moment it becomes useful, rather than repeating all destinations on every page.

## Typography

The reference relies on a readable Japanese sans-serif for dense content and gives the page title a much larger, isolated scale. The contrast is effective because the body remains conventional and stable. RELMUA should retain its serif Japanese display type for identity, but use it only for meaningful names, states, and section changes. Operational screens should favor compact, highly legible type.

## Spacing

The strongest spatial decision is containment, not empty space: a compact header, a stable navigation rail, and a centered reading column create calm. Its page title and image receive the larger pause; utility navigation does not. RELMUA should use the same distinction between a brand moment and a task surface.

## Responsive Behavior

At mobile width, the reference removes the persistent rail rather than shrinking it. It keeps a small header and lets the content own the viewport. At desktop width, the rail returns and the reading column stays constrained. RELMUA should follow this rule at the compositional level: mobile gets one purpose and one action; desktop can add context without duplicating controls.

## Motion

The framework supplies restrained drawer, search, and state transitions. The custom layer also adds permanent grid movement and many generated particles. The former is useful interaction feedback; the latter competes with reading and creates unnecessary visual activity.

## Information Density

The reference proves that a large information set can remain calm when hierarchy is stable: a dense tree is grouped, the current page is visible, and the main column has one task. This is directly relevant to Scenario Library and Scheduler, where dense information must be scannable without turning into a card wall.

## What RELMUA Does Worse

- The Scheduler currently puts a broad explanatory hero before the signed-in user can see the next session, required responses, or session creation action.
- Dashboard sections expose account, creation form, next session, and role lists as equal blocks. The action order is hidden in the source order instead of being designed.
- Some public pages use the same large headline, divider, and action-row composition regardless of whether the page is a brand page, a search page, or an operational screen.
- Decorative glyphs, soft gradients, and repeated bordered regions can create atmosphere, but on task screens they can read as a generic dark-editorial template rather than a useful Chikage tool.

## Patterns To Adopt

- Keep the current destination and task visible in a compact header.
- Put the page's primary action next to the state it changes, not in an unrelated repeated navigation row.
- Group secondary destinations behind a single clear navigation system.
- Use constrained editorial columns for reading and a tighter, denser treatment for operational data.
- Let desktop add contextual space and secondary information; do not merely enlarge the mobile composition.
- Use motion for menu, selection, focus, and state changes only.

## Patterns Not To Copy

- The reference's source, prose, imagery, branding, colors, and iconography.
- A documentation-site shell for all RELMUA pages.
- Rounded containers around every navigation item or every heading.
- Constant animated grids, generated particles, and background activity behind task content.
- A global boxed `h1` rule, which would flatten RELMUA's page-specific hierarchy.
- Generic green-on-black terminal styling or the reference's purple/green accent pairing.

## Scheduler Application

The Scheduler should use a compact contextual introduction, then expose the signed-in flow in this order:

1. Next session.
2. Action required.
3. A permanently visible `+ 卓を作る` trigger that expands the creation form only when needed.
4. My Sessions, with KP and PL information retained as metadata rather than separate competing destinations.

The signed-out view should offer one Discord login action without exposing implementation-level configuration errors. Configuration failures may remain diagnosable in development, but public-facing text should describe the unavailable state without raw status codes.
