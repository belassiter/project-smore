# Project Rules for Project SMoRe

You must adhere to the following strictly, without requiring input from the user:

## Behavior
*   Take a test-driven development (TDD) approach: write tests before implementing features or fixing bugs.

## The "Definition of Done" Protocol
Before telling the user a task is complete, you MUST perform these 3 steps, and everything must pass:

1.  **LINT**: Run `npm run lint` (and `npm run lint -- --fix` if needed).
2.  **TEST**: Run `npm test`. All tests must pass.
3.  **BUILD**: Run `npm run build` (This compiles the code but does *not* create the Windows executable).

## Documentation
*   You must maintain `copilot_journal.md`, which exists in the project root directory, updating it after the verification steps pass.
*   Add new entries to the top of the file.
*   Include the local date and time for each entry
*   Quote the user's exact prompt text (do not paraphrase or truncate via ellipsis)
*   Summarize the changes made, including files changed, refacotring, and other relevant details.
*   Use standard file editing commands. 
