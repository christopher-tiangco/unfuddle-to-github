# Unfuddle Ticket to GitHub issue copier
Copies Unfuddle ticket data into new GitHub issues and ensures that the Unfuddle ticket numbers match the new GitHub issues created.

## Why
One of the software projects that I started and maintained for several years now had been using Unfuddle (https://unfuddle.com/) for ticket management and Git repository.
Recently, there's been a need to move this project into GitHub so that it's placed together with the other projects that I'm working on and not having to use two separate services.
Simply moving the repository into GitHub and start using it for new issues won't work because GitHub starts with issue #1 and the project's codebase has references to the Unfuddle ticket numbers. These references are important as the project has grown over the years and the codebase is quite complex.

Therefore, I need to copy these Unfuddle tickets into GitHub. However, due to sheer amount of tickets that have been created in Unfuddle over the years (estimated around 3000+), it is going to take months, if not years to manually copy them by hand. Thus, this tool was created so that this process can be automated and can be ran 24/7 until it's done.

## Requirements
- NodeJS v9.11.1
- Unfuddle account with "read" access to the project
- GitHub account with CRUD access to the project
