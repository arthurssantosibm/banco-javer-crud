document.addEventListener("DOMContentLoaded", async () => {
    const storedUser = localStorage.getItem("loggedUser");

    if (!storedUser) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(storedUser);
    let saldo = 0;

    /* ================= USER ================= */
    const clientNameEl = document.getElementById("client-name");
    if (clientNameEl && user.nome) {
        clientNameEl.textContent = `Olá, ${user.nome}!`;
    }

    document.querySelector(".logout")?.addEventListener("click", () => {
        localStorage.removeItem("loggedUser");
        window.location.href = "login.html";
    });

    /* ================= SALDO ================= */
    function animateCount(el, start, end, duration) {
        let startTime = null;

        function step(ts) {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            const value = start + progress * (end - start);

            el.textContent =
                "R$ " + value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2
                });

            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    try {
        const res = await fetch(
            `http://127.0.0.1:5000/api/dashboard?user_id=${user.id}`
        );

        const data = await res.json();
        saldo = Number(data.saldo_cc) || 0;

        user.saldo = saldo;
        localStorage.setItem("loggedUser", JSON.stringify(user));

    } catch (err) {
        console.error("Erro dashboard:", err);
    }

    const balanceEl = document.getElementById("current-balance");
    if (balanceEl) animateCount(balanceEl, 0, saldo, 1000);

    /* ================= SCORE ================= */
const scoreCanvas = document.getElementById("credit-score-chart");
const scoreLabel = document.getElementById("score-percentage-display");

if (scoreCanvas && scoreLabel) {
    const score = Math.min(Math.round(saldo * 0.1), 1000);
    const percent = Math.round((score / 1000) * 100);

    new Chart(scoreCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
            datasets: [{
                data: [score, 1000 - score],
                backgroundColor: ["#4caf50", "#cc3737ff"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            circumference: 180,
            rotation: 270,
            cutout: "80%",
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
    
    scoreLabel.textContent = `${percent}%`;
}

    /* ================= TRANSAÇÕES ================= */
    const listEl = document.getElementById("transaction-list");

    try {
        const res = await fetch(
            `http://127.0.0.1:5000/api/transacoes?user_id=${user.id}`
        );

        const data = await res.json();
        listEl.innerHTML = "";

        if (!data.length) {
            listEl.innerHTML = "<li>Nenhuma transação encontrada</li>";
            return;
        }

        data.forEach(tx => {
            const li = document.createElement("li");

            const isEntrada = tx.tipo === "entrada";
            li.className = isEntrada ? "in" : "out";

            li.innerHTML = `
                <span>
                    ${isEntrada ? "+" : "-"} R$ ${Number(tx.valor).toFixed(2).replace(".", ",")}
                </span>
                <span>
                    ${isEntrada ? `De ${tx.email_origem}` : `Para ${tx.email_destino}`}
                    <br>
                    <small>${new Date(tx.data_hora).toLocaleString("pt-BR")}</small>
                </span>
            `;

            listEl.appendChild(li);
        });

    } catch (err) {
        console.error("Erro transações:", err);
        listEl.innerHTML = "<li>Erro ao carregar transações</li>";
    }

    /* ================= TEMA ================= */
    const themeToggle = document.getElementById("theme-toggle");

    themeToggle?.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        localStorage.setItem(
            "theme",
            document.body.classList.contains("dark-mode") ? "dark" : "light"
        );
    });

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
