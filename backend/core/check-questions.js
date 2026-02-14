const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const qs = await db.collection('questions').find({}).project({ title: 1, totalPoints: 1, currentPoints: 1, timeLimitPython: 1 }).toArray();
    console.log('--- QUESTION DATA ---');
    qs.forEach(q => {
        const flag = q.currentPoints > q.totalPoints ? ' *** MISMATCH ***' : '';
        const tlFlag = !q.timeLimitPython || q.timeLimitPython === 1000 ? ' (DEFAULT)' : '';
        console.log(`  ${q.title}`);
        console.log(`    total=${q.totalPoints} current=${q.currentPoints}${flag} TL=${q.timeLimitPython}ms${tlFlag}`);
    });

    // Fix: set currentPoints = totalPoints where currentPoints > totalPoints
    const fixResult = await db.collection('questions').updateMany(
        { $expr: { $gt: ['$currentPoints', '$totalPoints'] } },
        [{ $set: { currentPoints: '$totalPoints' } }]
    );
    console.log(`\nFixed ${fixResult.modifiedCount} questions (currentPoints > totalPoints)`);

    await mongoose.disconnect();
});
