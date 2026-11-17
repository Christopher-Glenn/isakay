<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- Keep E-Bus public tracking in client-side, RLS-filtered queries with Realtime updates; reserve privileged actions for authenticated server boundaries.
- GPS updates are accepted only by the public update-location server endpoint using a per-device SHA-256 token hash; no GPS token is exposed in the passenger app or administrator logs.
- Passenger tracking maps Route 10's continuous Iloilo movement, while the stored designated locations support route management; rider location stays only in that browser session.
- Keep the public passenger journey behind a name and trip-selection flow; reveal live bus tracking only after the rider selects a destination and a bus.
- Keep Route 10’s passenger destination picker based on named Iloilo service locations, with the rider confirming a map pin before live tracking.
- Approved administrators can replace a route path only through the protected database action, so public map updates remain controlled.
