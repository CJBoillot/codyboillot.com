# Code review checklist

A downloadable companion to Code Craft II. Steal it, edit it, make it yours.

## Before you open the diff

- Read the ticket or the PR description first. Review against intent, not against taste.
- If the change is over ~400 lines, ask whether it can be split. Review quality falls off a cliff past that.

## Correctness

- [ ] Does the happy path actually work, or does it only look like it does?
- [ ] What happens on empty, null, zero, one, and very many?
- [ ] Are errors handled, or swallowed? A bare `catch {}` is a bug in waiting.
- [ ] Is anything async unawaited?
- [ ] Are there off-by-one risks in loops, slices and ranges?

## Design

- [ ] Does the change fit the shape of the code around it, or fight it?
- [ ] Is new state introduced that duplicates existing state? Two sources of one fact will disagree eventually.
- [ ] Is the abstraction earning its keep, or is it indirection for its own sake?
- [ ] Could this be deleted more easily than it could be extended? Prefer that.

## Tests

- [ ] Does a test fail if the change is reverted? If not, it is not testing the change.
- [ ] Are the tests readable as a specification?
- [ ] Is anything time-, order- or network-dependent, and therefore flaky?

## Security and data

- [ ] Is user input escaped at the point of rendering, not at the point of storage?
- [ ] Are secrets absent from the diff, the logs and the error messages?
- [ ] Does a migration have a rollback, and has it been run against realistic data volume?

## Communication

- Comment on the code, not the coder.
- Separate blocking concerns from preferences. Say which is which.
- If you are asking for a change, say why. "This will break when X" beats "I would do this differently".
- Approve when it is better than what is on main. Perfect is a different pull request.
