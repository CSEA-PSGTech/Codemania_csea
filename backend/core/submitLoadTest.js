// Script to submit Java code for 50 teams simultaneously to test load balancing
// Usage: node submitLoadTest.js

const axios = require('axios');
const mongoose = require('mongoose');
const Team = require('./models/Team');

const EXECUTION_URL = 'http://localhost:8000/execute'; // Nginx endpoint
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://codemania_user:FckDlryu6A12jaLv@cluster0.xoyhmip.mongodb.net/CodeMania?appName=Cluster0';

// Sample Java code to submit
const javaCode = `public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from load test!\");\n    }\n}`;

const language = 'java';
const problemId = 'loadtest-problem'; // Replace with actual problem ID if needed

async function submitForAllTeams() {
    await mongoose.connect(MONGO_URI);
    const teams = await Team.find({}).limit(50);
    console.log(`Submitting for ${teams.length} teams...`);

    const submissions = teams.map(team => {
        return axios.post(EXECUTION_URL, {
            teamId: team._id,
            code: javaCode,
            language,
            problemId,
        }).then(res => {
            console.log(`Team ${team.teamName}: Success (${res.status})`);
        }).catch(err => {
            console.error(`Team ${team.teamName}: Error`, err.response ? err.response.status : err.message);
        });
    });

    await Promise.all(submissions);
    console.log('All submissions complete.');
    mongoose.disconnect();
}

submitForAllTeams();
