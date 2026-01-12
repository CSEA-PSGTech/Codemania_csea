/**
 * Sort teams based on Round 1 rules:
 * 1. Teams who completed all 5 first
 * 2. Earlier completion gets higher rank
 */
function sortRound1Leaderboard(teams) {
  return teams.sort((a, b) => {
    // Completed teams first
    if (a.round1.status !== b.round1.status) {
      return a.round1.status === "COMPLETED" ? -1 : 1;
    }

    // Both completed → sort by endTime
    if (a.round1.status === "COMPLETED") {
      return new Date(a.round1.endTime) - new Date(b.round1.endTime);
    }

    // Both not completed → keep order
    return 0;
  });
}

module.exports = sortRound1Leaderboard;
