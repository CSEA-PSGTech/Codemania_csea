const API = "http://localhost:5000/api/admin";
let teams = [];

async function loadTeams() {
  const res = await fetch(`${API}/teams`);
  teams = await res.json();
  renderTeams();
}

function renderTeams() {
  const tbody = document.querySelector("#teamTable tbody");
  tbody.innerHTML = "";

  teams.forEach((team, tIndex) => {
    const solvedCount = team.round1?.solvedCount || 0;
    const percent = (solvedCount / 5) * 100;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <strong>${team.teamName}</strong>
        <div class="progress">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>
      </td>

      ${[0,1,2,3,4].map(qIndex => `
        <td>
          <input type="checkbox" ${team.round1?.questionsSolved[`q${qIndex+1}`] ? "checked disabled" : ""}
            onchange="toggleSolve('${team._id}', ${qIndex})">
        </td>
      `).join("")}

      <td>${solvedCount}/5</td>
      <td>
        <span class="status-badge ${team.round1?.status === "COMPLETED" ? "done" : "pending"}">
          ${team.round1?.status || "NOT_STARTED"}
        </span>
      </td>
    `;

    tbody.appendChild(tr);
  });

  renderLeaderboard();
}

async function toggleSolve(teamId, qIndex) {
  await fetch(`${API}/solve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId, questionIndex: qIndex })
  });
  loadTeams();
}

function renderLeaderboard() {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";

  const sorted = [...teams]
    .filter(t => t.round1?.status === "COMPLETED")
    .sort((a,b) => b.round1.round1Points - a.round1.round1Points);

  sorted.forEach((team, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i+1}</td>
        <td>${team.teamName}</td>
        <td>${team.round1.round1Points}</td>
      </tr>
    `;
  });
}

// Initial load
loadTeams();
