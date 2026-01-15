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
        })

        if (!res.ok) throw new Error("Token inválido")

        user = await res.json()

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
    })

    function animateCount(el, start, end, duration) {
        let startTime = null

        function step(ts) {
            if (!startTime) startTime = ts
            const progress = Math.min((ts - startTime) / duration, 1)
            const value = start + progress * (end - start)
            el.textContent =
                "R$ " + value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2
                })

            if (progress < 1) requestAnimationFrame(step)
        }

        requestAnimationFrame(step)
    }

    saldo = Number(user.saldo_cc) || 0

    const balanceEl = document.getElementById("current-balance")
    if (balanceEl) animateCount(balanceEl, 0, saldo, 1000)

    const scoreCanvas = document.getElementById("credit-score-chart")
    const scorePointsLabel = document.getElementById("score-points-display")


    const gaugeNeedle = {
    id: "gaugeNeedle",
    afterDatasetDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0)
        const centerX = meta.data[0].x
        const centerY = meta.data[0].y
        const radius = meta.data[0].outerRadius

        const value = chart.data.datasets[0].needleValue
        const max = chart.data.datasets[0].maxValue

        const angle = Math.PI + (value / max) * Math.PI

        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(angle)

        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
        ctx.shadowBlur = 5
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2

        ctx.beginPath()
        ctx.fillStyle = "#333333"
        
        ctx.moveTo(0, -5)       
        ctx.lineTo(radius * 0.9, 0)
        ctx.lineTo(0, 5)            
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2)
        ctx.fillStyle = "#333333"
        ctx.fill()

        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2)
        ctx.fillStyle = "#e0e0e0"
        ctx.fill()

        ctx.restore()
    }
};

    if (scoreCanvas && scorePointsLabel) {
        const score = saldo * 0.1
        const maxVisualScore = 1000
        const visualScore = Math.min(score, maxVisualScore)

        new Chart(scoreCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
                datasets: [{
                    data: [visualScore, maxVisualScore - visualScore],
                    needleValue: visualScore,
                    maxValue: maxVisualScore,
                    backgroundColor: ["#47d998", "#ff6961"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                circumference: 180,
                rotation: 270,
                cutout: "70%",
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [gaugeNeedle]
        })

        scorePointsLabel.textContent =
            `${score.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })} Pontos`
    }

    async function carregarTransacoes() {
        try {
            const res = await fetch("http://127.0.0.1:8000/transacoes/listar_transacoes", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!res.ok) throw new Error("Erro ao buscar transações")

            const transacoes = await res.json()
            const list = document.getElementById("transaction-list")

            if (!list) return

            list.innerHTML = ""

            if (transacoes.length === 0) {
                list.innerHTML = `<li class="empty">Nenhuma transação encontrada</li>`
                return
            }

            transacoes.forEach(tx => {
                const isSaida = tx.email_origin === user.email
                const tipo = isSaida ? "saida" : "entrada"
                const sinal = isSaida ? "-" : "+"
                const emailRelacionado = isSaida ? tx.email_destination : tx.email_origin

                const li = document.createElement("li")
                li.classList.add(tipo)

                li.innerHTML = `
                    <strong>${isSaida ? "Enviada" : "Transferência recebida"}</strong><br>
                    ${sinal} R$ ${Number(tx.valor).toFixed(2)}<br>
                    <small>De/Para: ${emailRelacionado}</small><br>
                    <small>${tx.mensagem || "Sem mensagem"}</small><br>
                    <small>${new Date(tx.create_time).toLocaleString()}</small>
                `

                list.appendChild(li)
            })

        } catch (err) {
            console.error("Erro ao carregar transações:", err)
        }
    }

    carregarTransacoes()
})


function dispararAlerta() {
    Swal.fire({
        title: '<span style="color: #F7934C; font-weight: 800; font-size: 28px;">BankJaver</span>',
        html: `
            <div style="padding: 10px;">
                <p style="font-size: 1.1rem; color: #333; margin-bottom: 20px;">
                    Bem-vindo(a) à sua conta digital.
                </p>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border-left: 5px solid #F7934C; text-align: left;">
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #1F1300;">Versão:</strong> 
                        <span style="color: #666;">1.2.1</span>
                    </div>
                    <div style="font-size: 0.85rem; line-height: 1.4; color: #888;">
                        All rights reserved to <br>
                        <strong style="color: #1F1300;">Arthur Santana dos Santos ©</strong>
                    </div>
                </div>
            </div>
        `,
        icon: "info",
        iconColor: "#F7934C",
        confirmButtonText: "ACESSAR CONTA",
        confirmButtonColor: "#F7934C",
        background: "#ffffff",
        color: "#1F1300",
        padding: "2em",
        width: '400px',
        showClass: {
            popup: `
                animate__animated
                animate__fadeInUp
                animate__faster
            `
        },
        hideClass: {
            popup: `
                animate__animated
                animate__fadeOutDown
                animate__faster
            `
        },
        customClass: {
            confirmButton: 'botao-confirmar-estilizado',
            title: 'titulo-customizado'
        }
    })
}

