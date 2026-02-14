const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function reset() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Reset all question points to max
    const qResult = await db.collection('questions').updateMany(
        {},
        [{ $set: { currentPoints: '$totalPoints', noOfTeamsSolved: 0 } }]
    );
    console.log('Questions reset:', qResult.modifiedCount);

    // Delete all teams
    const tResult = await db.collection('teams').deleteMany({});
    console.log('Teams deleted:', tResult.deletedCount);

    // Delete all submissions
    const sResult = await db.collection('submissions').deleteMany({});
    console.log('Submissions deleted:', sResult.deletedCount);

    await mongoose.disconnect();
    console.log('Done!');
}

reset().catch(err => { console.error(err); process.exit(1); });
