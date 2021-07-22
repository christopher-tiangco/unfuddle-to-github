require('dotenv').config();

module.exports = {
    unfuddle: {
        subdomain: process.env.UNFUDDLE_SUBDOMAIN,
        projectId: process.env.UNFUDDLE_PROJECT_ID,
        username: process.env.UNFUDDLE_USERNAME,
        password: process.env.UNFUDDLE_PASSWORD,
        apiVersion: process.env.UNFUDDLE_API_VERSION,
    },
    github: {
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        apiBaseUrl: process.env.GITHUB_API_BASE_URL,
        acceptHeader: process.env.GITHUB_ACCEPT_HEADER,
    }
};