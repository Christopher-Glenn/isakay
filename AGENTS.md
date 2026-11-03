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
