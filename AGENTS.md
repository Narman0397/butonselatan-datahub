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

## Architecture
- Data access uses the browser client with RLS (no server functions); roles live in `user_roles`, OPD link in `profiles.organization_id`. Why: RLS + workflow trigger enforce RBAC server-side.
- Dataset status transitions to published/rejected are enforced by the `dataset_workflow_guard` trigger. Why: producers cannot self-publish.
- Dataset files live in the private `dataset-files` bucket, downloaded via signed URLs. Why: workspace blocks public buckets.
