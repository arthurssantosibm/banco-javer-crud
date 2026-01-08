document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");

    // 🔒 Proteção da rota
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    let saldo = 0;
    let user = null;

    try {
        const res = await fetch("http://127.0.0.1:8000/user/user", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Token inválido");

        user = await res.json();

        const clientNameEl = document.getElementById("client-name");
        if (clientNameEl) {
            clientNameEl.textContent = `Olá, ${user.nome}!`;
        }

    } catch (err) {
        console.error("Erro usuário:", err);
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
        return;
    }

    document.querySelector(".logout")?.addEventListener("click", () => {
        localStorage.removeItem("access_token");
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

    saldo = Number(user.saldo_cc) || 0;

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
        const res = await fetch("http://127.0.0.1:8000/transacoes", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

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
                    ${tx.descricao || ""}
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
