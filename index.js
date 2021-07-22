const config = require('./config');
const axios = require('axios');
const {get: _get} = require('lodash');
const fs = require('fs');

// Define the range of the Unfuddle ticket numbers to be processed.
const unfuddleTicketNumberStart = 1;
const unfuddleTicketNumberEnd = 1;

const unfuddle_auth = 'Basic ' + Buffer.from(`${config.unfuddle.username}:${config.unfuddle.password}`).toString('base64');
const fileStream = fs.createWriteStream("unfuddle_to_github_" + (new Date().toISOString()).replace(/:/g, '_') + ".log"); // Create a new log file
const newGitHubIssueLabels = ["From Unfuddle"];

const gitHubTitleprefixOnMissingUnfuddleTicket = 'Missing Unfuddle Ticket#';
const gitHubDescOnMissingUnfuddleTicket = 'N/A';
const gitHubStatusOnMissingUnfuddleTicket = 'closed';

/**
 * Writes to the current log file
**/
const log = msg => {
    console.log(msg);
    fileStream.write(msg + "\n");
};

/**
 * Get the issue number of the last GitHub issue created
**/
const getGitHubLastIssueNumber = async () => {
    
    let apiEndpoint = `${config.github.apiBaseUrl}/repos/${config.github.owner}/${config.github.repo}/issues?state=all&direction=desc&per_page=1`;
    
    let result = await axios({
        method: 'get',
        url: apiEndpoint,
        headers: {
            'Accept': config.github.acceptHeader,
            'Authorization': `token ${config.github.token}`,
        }
    });
    
    if (!_get(result, 'data[0].number')) {
        
        throw new Error(`Missing GitHub Issue number...`);
        
    }
    
    return result.data[0].number;
};

/**
 * If Unfuddle "starting" ticket number cannot be used in GitHub, stop the process.
 * - If the Unfuddle "starting" ticket number is less than or equal to the last GitHub issue number,
 *      then the Unfuddle ticket number CANNOT be used as GitHub auto-increments its issue number.
 * - For instance, if the "starting" Unfuddle ticket number is #1 and the last GitHub issue number created is #4,
 *      either there's already an existing GitHub issue #1 (or that had been deleted) therefore, GitHub issue #1 cannot be reused.
**/
const validateUnfuddleStartTicketNumber = async () => {
   
    if (unfuddleTicketNumberStart <= await getGitHubLastIssueNumber()) {
        
        throw new Error(`Cannot create GitHub issue for Unfuddle ticket #${unfuddleTicketNumberStart}. Adjust unfuddleTicketNumberStart to a higher value.`);
    }
    
};

/**
 * Retrieves Unfuddle ticket data (title, description, status, etc.) of a given Unfuddle ticket number
**/
const getUnfuddleTicketByNumber = async ticketNumber => {
    
    let apiEndpoint = `https://${config.unfuddle.subdomain}/api/${config.unfuddle.apiVersion}/projects/${config.unfuddle.projectId}/tickets/by_number/${ticketNumber}`;
    let result = {};
    let ticketData = {};
    let associatedComments = [];
    let unfuddleTicketExists = false;
    
    try {
        
        result = await axios({
            method: 'get',
            url: apiEndpoint,
            headers: {
                'Accept': 'application/json',
                'Authorization': unfuddle_auth,
            }
        });
        
        unfuddleTicketExists = true;
        
    } catch (e) {
        
        // If Unfuddle ticket is not found due to 404, it might be because the ticket was deleted in the past. Therefore, create a "placeholder" GitHub issue instead
        if (e.response.status === 404) {
            
            log(`WARNING: Missing Unfuddle Ticket #${ticketNumber}. Creating a placeholder GitHub issue instead.`);
            
        } else {
            
            throw new Error(`Error getting Unfuddle Ticket #${ticketNumber}. Message: ${e.message}`);    
            
        }
        
    }
    
    if (unfuddleTicketExists) {
    
        if (!_get(result, 'data.id')) {
            
            throw new Error(`Missing Unfuddle Ticket Id @ ticketNumber# ${ticketNumber}`);
            
        }
        
        if (!_get(result, 'data.summary')) {
            
            throw new Error(`Missing Unfuddle Ticket name @ ticketNumber# ${ticketNumber}`);
            
        }
        
        if (!_get(result, 'data.status')) {
            
            throw new Error(`Missing Unfuddle Ticket status @ ticketNumber# ${ticketNumber}`);
            
        }
        
    }
    
    ticketData = {
        id: (unfuddleTicketExists) ? result.data.id : null,
        title: (unfuddleTicketExists) ? result.data.summary : `${gitHubTitleprefixOnMissingUnfuddleTicket} ${ticketNumber}`, 
        description: (unfuddleTicketExists && _get(result, 'data.description')) ? result.data.description : gitHubDescOnMissingUnfuddleTicket,
        status: (unfuddleTicketExists) ? result.data.status : gitHubStatusOnMissingUnfuddleTicket,
    }
    
    if (unfuddleTicketExists) {
        
        associatedComments = await getUnfuddleTicketCommentsById(result.data.id, ticketNumber);
    
        // If there's a resolution description, append it as the last comment
        if (_get(result, 'data.resolution_description') && result.data.resolution_description.trim() !== '') {
        
            associatedComments.push(result.data.resolution_description);
        
        }
    
    return {
        ...ticketData,
        comments: associatedComments,
    };
    
};

/**
 * If there are associated comments for a given Unfuddle ticket, let's collect them.
 * NOTE: ticketNumber is the "number" attribute of an Unfuddle ticket object whereas ticketId is the "id" attribute
**/
const getUnfuddleTicketCommentsById = async (ticketId, ticketNumber) => {
    
    let apiEndpoint = `https://${config.unfuddle.subdomain}/api/${config.unfuddle.apiVersion}/projects/${config.unfuddle.projectId}/tickets/${ticketId}/comments`;
    let result = {};
    let comments = [];
    
    try {
        
        result = await axios({
            method: 'get',
            url: apiEndpoint,
            headers: {
                'Accept': 'application/json',
                'Authorization': unfuddle_auth,
            }
        });
        
        result.data.forEach((object) => {
          comments.push(object.body); 
        });
        
    } catch (e) {
        
        log(`WARNING: Unable to fetch comments for Unfuddle Ticket# ${ticketNumber}. Proceeding without it. Message: ${e.message}`);
    }
    
    return comments;
};

/**
 * Creates a new GitHub issue with the Unfuddle Ticket data
**/
const createGitHubIssueFromUnfuddleTicket = async (data, unfuddleTicketNumber) => {
    
    let apiBaseUrl = `${config.github.apiBaseUrl}/repos/${config.github.owner}/${config.github.repo}/issues`;
    let result = {};
    
    try {
        
        result = await axios({
            method: 'post',
            url: apiBaseUrl,
            headers: {
                'Accept': config.github.acceptHeader,
                'Authorization': `token ${config.github.token}`,
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                "title": data.title,
                "body": (data.description.trim() !== '') ? data.description : "N/A",
                "labels": newGitHubIssueLabels
            })
        });
        
    } catch (e) {
        
        throw new Error(`Error creating a new GitHub issue for Unfuddle Ticket #${unfuddleTicketNumber}. Message: ${e.message}`)
        
    }
    
    log(`Successfully created GitHub issue for Unfuddle Ticket# ${unfuddleTicketNumber}...`);
    
};

const timeout = ms => { return new Promise(resolve => setTimeout(resolve, ms)); };

/**
 * Adds comments to newly created GitHub issue
 * NOTE: 
 * - There's a 5 second delay for every comment that gets added in order to deal with GitHub's rate limiting
 * - If there's an error when adding a comment, then skip and continue on.
**/
const addGitHubIssueComments = async (issueNumber, comments) => {
    
    for (let i = 0; i < comments.length; i++) {
        
        await Promise.all([
            (async (issueNumber, comment) => {
                
                let apiBaseUrl = `${config.github.apiBaseUrl}/repos/${config.github.owner}/${config.github.repo}/issues/${issueNumber}/comments`;
                
                let result = {};
                
                try {
            
                    result = await axios({
                        method: 'post',
                        url: apiBaseUrl,
                        headers: {
                            'Accept': config.github.acceptHeader,
                            'Authorization': `token ${config.github.token}`,
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify({
                            "body": comment,
                        })
                    });
                    
                    log(`--- Successfully posted a comment to GitHub issue #${issueNumber}...`);
                    
                } catch (e) {
                    
                    log(`--- WARNING: Unable to post a comment to GitHub issue #${issueNumber}. Skipping and continuing on. Message: ${e.message}`);
                    
                }
                
            })(issueNumber, comments[i]),
            timeout(5000),
        ]);
        
    }
    
};

/**
 * Closes the GitHub issue given an issueNumber
**/
const closeGitHubIssueByNumber = async issueNumber => {
    
    let apiBaseUrl = `${config.github.apiBaseUrl}/repos/${config.github.owner}/${config.github.repo}/issues/${issueNumber}`;
    let result = {};
    
    try {
        
        result = await axios({
            method: 'patch',
            url: apiBaseUrl,
            headers: {
                'Accept': config.github.acceptHeader,
                'Authorization': `token ${config.github.token}`,
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                "state": "closed",
            })
        });
        
    } catch (e) {
        
        throw new Error(`Error closing GitHub issue #${issueNumber}. Message: ${e.message}`)
        
    }
    
    log(`Successfully closed GitHub issue #${issueNumber}...`);
};

const start = async () => {
    
    const startDate = new Date();
    log(`[${startDate}]: Start Unfuddle Ticket to GitHub issue copier.`);
    log("\n");
    
    try {
        
        await validateUnfuddleStartTicketNumber();
        
        for (let i = unfuddleTicketNumberStart; i <= unfuddleTicketNumberEnd; i++) {
            
            let unfuddleData = await getUnfuddleTicketByNumber(i);
            
            await createGitHubIssueFromUnfuddleTicket(unfuddleData, i);
            
            if (unfuddleData.comments.length > 0) {
                
                await addGitHubIssueComments(i, unfuddleData.comments);
                
            }
            
            if (["closed", "resolved"].indexOf(unfuddleData.status) > -1) {
                
                await closeGitHubIssueByNumber(i);
                
            }
        }
        
    } catch (e) {
    
        log(`ERROR: ${e.message}`);
        log("Stopping the process....")
    }
    
    log("\n");
    const endDate = new Date();
    log(`[${endDate}]: End Unfuddle Ticket to GitHub issue copier.`);
    
}

start();
