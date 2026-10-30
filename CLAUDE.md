# Working on Lockstep

## Pull requests

- Never merge a pull request. Todd approves and merges every PR.
- Open the PR, get CI green, then send Todd the link and stop.
- Don't turn on a "require approval" branch rule for `main`: PRs are opened under Todd's account, and GitHub won't let the author approve their own.

## Before you push

Run `npm test`, `npm run typecheck` and `npm run test:e2e`, plus `node sim/run4.js check 30` if you changed the rules. The README covers the code layout, saves and adding content; `docs/design.md` covers how the game works.
