# Randompage Agent Guide

## Before Editing

- Read the relevant implementation and nearby tests before changing unfamiliar behavior.
- Preserve unrelated worktree changes; never revert or rewrite them.
- State one concrete hypothesis about the change and one focused check that could disconfirm it before editing.

## Implementation

- Make the smallest change that satisfies the request.
- Keep responsibilities in the existing module boundaries. Do not introduce a framework, backend, or dependency without a concrete requirement.
- Do not hand-edit generated files. Change TypeScript sources, then run the relevant build or validation command.
- Add or update a focused test for behavior changes. For bug fixes, include a case that fails before the fix.
- Do not claim repository behavior or tool conventions without checking the source, documentation, or a reproducible command.

## Validation

- Run the narrowest relevant test or type check immediately after editing.
- For source changes, use `npm run typecheck` and `npm run build` as appropriate.
- For article data or validation changes, use `npm run test:articles` and `npm run validate:articles`.
- Run `npm run validate` when broader formatting, dependency, and validation checks are warranted.

## Repository References

- [CI workflow](.github/workflows/validate-and-deploy-pages.yml)
