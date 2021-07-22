# Unfuddle Ticket to GitHub issue copier
Copies Unfuddle ticket data into new GitHub issues and ensures that the Unfuddle ticket numbers match the new GitHub issues created.

## Why
One of the software projects that I started and maintained for several years now had been using Unfuddle (https://unfuddle.com/) for ticket management and Git repository.
Recently, there's been a need to move this project into GitHub so that it's placed together with the other projects that I'm working on and not having to use two separate services.
Simply moving the repository into a fresh GitHub project won't work because new GitHub issues start with issue #1 and the project's codebase has references to the Unfuddle ticket numbers. These references are important as the project has grown over the years and the codebase is quite complex. Also, GitHub won't let me specify a starting "issue number" if I wanted to keep Unfuddle for archive purposes.

Therefore, I need to copy these Unfuddle tickets into GitHub. However, due to sheer amount of tickets that have been created in Unfuddle over the years (estimated around 3000+), it is going to take months, if not years to manually copy them by hand. Thus, this tool was created so that this process can be automated and can be ran 24/7 until it's done.

## Requirements
- NodeJS v9.11.1 (npm v5.6.0)
- Unfuddle account with "read" access to the project
- GitHub account with CRUD access to the project (must have a GitHub token)

## How to use
- Clone this repository: `git clone https://github.com/christopher-tiangco/unfuddle-to-github.git .`
- Set Unfuddle/GitHub credentials and project info to `.env`
- Using a text editor, open `index.js` and 
  - specify the `unfuddleTicketNumberStart` and `unfuddleTicketNumberEnd` which represents the "starting Unfuddle ticket" and the "last Unfuddle ticket" to copy over
  - (Optional) Specify the label(s) to assign to the new GitHub issues that will be created by modifying the `newGitHubIssueLabels` array
- Run the script: `node index`

## Additional Notes
- The following are the ONLY data copied from Unfuddle
  - Ticket name
  - Ticket description
  - Associated comments
  - Resolution description
- **Resolution descriptions** are added as the LAST comment of the GitHub issue
- A hardcoded "5 second" delay is set when posting the comments into the GitHub issue due to rate limiting (see https://docs.github.com/en/rest/reference/issues#create-an-issue-comment)
- Every console messages printed out by the script are stored into a log file `unfuddle_to_github_<date/time ISO format>.log`
- The GitHub issue create gets automatically Closed after creation if the source Unfuddle ticket's status is either `Resolved` or `Closed`. Otherwise, it will be left in `Open` status
- If an error occurs while fetching the associated comments from an Unfuddle ticket OR when adding comments into a GitHub issue, the process will NOT stop.

## Limitations
- Not ALL the data about the Unfuddle ticket are copied over. Examples of data NOT copied over are: Ticket author name, Comment author name, associated commits, etc. See **Additional Notes** above for listing of what are copied over
- If the "starting Unfuddle ticket number" `unfuddleTicketNumberStart` already exists in the GitHub project, running the script will throw an error. Use a "starting Unfuddle ticket number" that doesn't exist in the GitHub project.
- If an error occurs (e.g. unable to fetch from Unfuddle), the whole process stops. This is to prevent a mismatch between the Unfuddle Ticket Numbers and GitHub issue numbers.
