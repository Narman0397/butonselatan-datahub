## Architecture
- Data access uses the browser client with RLS (no server functions); roles live in `user_roles`, OPD link in `profiles.organization_id`. Why: RLS + workflow trigger enforce RBAC server-side.
- Dataset status transitions to published/rejected are enforced by the `dataset_workflow_guard` trigger. Why: producers cannot self-publish.
- Dataset files live in the private `dataset-files` bucket, downloaded via signed URLs. Why: workspace blocks public buckets.
- Files of "Terbatas" datasets are only readable by staff via storage RLS; public gets access through `data_requests` reviewed by Wali Data. Why: license must be enforced server-side, not just in UI.
- Dataset audit history and in-app notifications are written by the `dataset_audit` / `data_request_notify` DB triggers (not client code). Why: entries can't be skipped or forged from the browser.
- Feature flags live in `system_features`; UI hides via `useFeature`, DB triggers (`feature_skip_insert`/`feature_block_write`) enforce server-side. Why: disabling must hold even if the UI is bypassed.
