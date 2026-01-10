document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token")
    if (!token) {
        window.location.href = "login.html"
        return
    }

    let saldo = 0
    let user = null

    try {
        const res = await fetch("http://127.0.0.1:8000/user/user", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Token inválido")

        user = await res.json();

        const clientNameEl = document.getElementById("client-name")
        if (clientNameEl) {
            clientNameEl.textContent = `Olá, ${user.nome}!`
        }

    } catch (err) {
        console.error("Erro usuário:", err)
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
        return
    }

    document.querySelector(".logout")?.addEventListener("click", () => {
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    });

    function animateCount(el, start, end, duration) {
        let startTime = null

        function step(ts) {
            if (!startTime) startTime = ts
            const progress = Math.min((ts - startTime) / duration, 1)
            const value = start + progress * (end - start)
            el.textContent =
                "R$ " + value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2 
                });

            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step)
    }

    saldo = Number(user.saldo_cc) || 0

    const balanceEl = document.getElementById("current-balance")
    if (balanceEl) animateCount(balanceEl, 0, saldo, 1000)

    const scoreCanvas = document.getElementById("credit-score-chart")
    const scoreLabel = document.getElementById("score-percentage-display")
    const scorePointsLabel = document.getElementById("score-points-display")

    if (scoreCanvas && scoreLabel) {
        const score = Math.min(Math.round(saldo * 0.1), 1000)
        const percent = Math.round((score / 1000) * 100)

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
        })

        scoreLabel.textContent = `${percent}%`
        scorePointsLabel.textContent = `${score} pontos`
    async function carregarTransacoes() {
        try {
            const res = await fetch("http://127.0.0.1:8000/transacoes/listar_transacoes", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Erro ao buscar transações")

            const transacoes = await res.json()
            const list = document.getElementById("transaction-list")

            if (!list) return

            list.innerHTML = ""

            if (transacoes.length === 0) {
                list.innerHTML = `<li class="empty">Nenhuma transação encontrada</li>`
                return;
            }

            transacoes.slice(0, 5).forEach(tx => {
                const isSaida = tx.email_origin === user.email
                const tipo = isSaida ? "saida" : "entrada"
                const sinal = isSaida ? "-" : "+"

                const li = document.createElement("li")
                li.classList.add(tipo)

                li.innerHTML = `
                    <strong>${isSaida ? "Enviada" : "Transferência recebida"}</strong><br>
                    ${sinal} R$ ${Number(tx.valor).toFixed(2)}<br>
                    <small>${tx.mensagem || "Sem mensagem"}</small><br>
                    <small>${new Date(tx.create_time).toLocaleString()}</small>
                `;

                list.appendChild(li)
            });

        } catch (err) {
            console.error("Erro ao carregar transações:", err)
        }
    }
        carregarTransacoes()
    }
})