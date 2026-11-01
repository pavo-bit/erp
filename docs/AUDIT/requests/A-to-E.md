# Lane A request to Lane E — deterministic RLS test template

**Requested owner:** Lane E (CI/test infrastructure)  
**Requested by:** Lane A (DB spine)  
**Status:** OPEN — A's local RLS migration investigation is paused pending E's test-template fix and a fresh probe.

Read-only catalog comparison on the test-only `ssvm-database` container found
the same state in `ssvm_test` and `ssvm_test_template`: `fee_categories` had
`relrowsecurity=false`, `relforcerowsecurity=true`, and one policy. Across 206
public tables, both databases had 0 tables with RLS enabled and 174 forced. Both
recorded `20261101150000_generated_tenant_rls` as finished with checksum
`9705a7caea13543b572e3e45b0b0c9fa184e597d4855d6978c55b4b997afcfbb`. That
checksum matches the historical committed migration content, which contains the
`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` statements. The prior
W0 scratch database `ssvm_test_w0_probe_f4bc3a8e` is absent; no production or
developer database was queried.

The default backend-test workflow explicitly builds its schema without the RLS
migration, and the worker template helper creates `ssvm_test_template` only when
it does not already exist. This makes an existing template's RLS state implicit
and permits a template with tenant policies but disabled RLS to be reused.

Please provide a deterministic test-only RLS template path that:

- Builds a fresh template from the separately gated full migration chain,
  including the tenant RLS migration; do not add RLS to the default/main backend
  test schema before S2 coverage is complete.
- Validates every classified tenant table has `relrowsecurity=true`,
  `relforcerowsecurity=true`, and its `school_isolation` policy before marking or
  using the template.
- Refuses to use an existing template whose flags/policy coverage do not match;
  rebuild only the named isolated test template through a bounded, explicit
  cleanup path.
- Runs the exact no-tenant probe through the lane app role and records
  `current_user`, database name, NULL tenant setting, superuser/BYPASSRLS flags,
  visible fee-category count, per-table RLS flags, and policy count without
  logging credentials or URLs. Expected result: `ssvm_app`, both role flags false,
  NULL tenant, and zero visible fee categories.

Lane A will resume the test-only probe after E provides that deterministic,
RLS-enabled template path. The discrepancy is not evidence that current A
migration SQL omits ENABLE/FORCE: the recorded migration checksum matches a
committed version containing both statements. No speculative migration change is
proposed until the fresh-template probe identifies the remaining cause.
