document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token")

    if (!token) {
        window.location.href = "login.html"
        return
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    let user;
    let saldo = 0

    async function carregarDadosUsuario() {
        try {
            const res = await fetch("http://127.0.0.1:8000/user/user", { headers })

            if (!res.ok) throw new Error("Erro ao buscar dados")

            user = await res.json()
            saldo = Number(user.saldo_cc) || 0

            document.getElementById("client-name").textContent = `Olá, ${user.nome}`

            document.getElementById("saldo-disponivel").textContent =
                saldo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                })

        } catch (err) {
            console.error("Erro ao carregar usuário", err)
        }
    }

    await carregarDadosUsuario()

    window.showLoading = function () {
        const overlay = document.getElementById("loadingOverlay");
        if (overlay) overlay.classList.remove("hidden");
        document.body.classList.add("loading-active");
    };

    window.hideLoading = function () {
        const overlay = document.getElementById("loadingOverlay");
        if (overlay) overlay.classList.add("hidden");
        document.body.classList.remove("loading-active");
    };

    document.querySelector(".logout").addEventListener("click", (e) => {
        e.preventDefault()
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    })
})

function dispararAlerta() {
    Swal.fire({
        title: '<span style="color:#000;font-weight:800;font-size:28px">BankPY</span>',
        html: `<div style="padding:10px">
                <p style="font-size:1.1rem;color:#333;margin-bottom:20px">
                    Bem-vindo(a) à sua conta digital.
                </p>
                <div style="background:#f8f9fa;border-radius:12px;padding:15px;border-left:5px solid #04b197;text-align:left">
                    <div style="margin-bottom:8px">
                        <strong style="color:#1F1300">Versão:</strong> 
                        <span style="color:#666">1.2.1</span>
                    </div>
                    <div style="font-size:0.85rem;line-height:1.4;color:#888">
                        All rights reserved to <br>
                        <strong style="color:#1F1300">Arthur Santana dos Santos ©</strong>
                    </div>
                </div>
               </div>`,
        icon: "info",
        iconColor: "#04b197",
        confirmButtonText: "ACESSAR CONTA",
        confirmButtonColor: "#04b197",
        background: "#ffffff",
        color: "#000000",
        padding: "2em",
        width: "400px",
        showClass: { popup: "animate__animated animate__fadeInUp animate__faster" },
        hideClass: { popup: "animate__animated animate__fadeOutDown animate__faster" },
        customClass: { confirmButton: 'botao-confirmar-estilizado', title: 'titulo-customizado' }
    })
}

let chartInstance = null;
async function buscarAtivo() {
    const ticker = document.getElementById("ticker").value.trim().toUpperCase();
    const resultado = document.getElementById("resultado");
    const canvasElement = document.getElementById("meuGrafico");
    const ctx = canvasElement.getContext("2d");

    if (!ticker) return;

    showLoading()

    try {
        const res = await fetch(`http://127.0.0.1:8000/ativos/${ticker}`);
        if (!res.ok) throw new Error("Erro");
        const data = await res.json();

        resultado.classList.remove("hidden");
        resultado.innerHTML = `
            <h3>${data.ticker} - ${data.nome}</h3>
            <p>
              Preço Atual:
              <strong style="color:var(--primary)">
                R$ ${data.preco}
              </strong>
              (${data.variacao}%)
            </p>
            <button class="btn-buy">Comprar</button>
        `;

        if (window.chartInstance) {
            window.chartInstance.destroy();
        }

        const labels = data.historico.datas;
        const ultimaData = labels[labels.length - 1];

        const labelsComFolga = [...labels, "", "", ""]; 

        window.chartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: labelsComFolga,
                datasets: [{
                    label: `Histórico ${data.ticker}`,
                    data: data.historico.precos,
                    borderColor: "#00d1b2",
                    backgroundColor: "rgba(0, 209, 178, 0.12)",
                    fill: true,
                    tension: 0.25,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        right: 30,
                        left: 10,
                        top: 30
                    }
                },
                plugins: {
                    legend: { display: false },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: "x",
                            modifierKey: 'ctrl'
                        },
                        zoom: {
                            wheel: { enabled: true, speed: 0.08 },
                            pinch: { enabled: true },
                            mode: "x"
                        }
                    },
                    annotation: {
                        annotations: {
                            hoje: {
                                type: "line",
                                scaleID: "x",
                                value: ultimaData,
                                borderColor: "#00d1b2",
                                borderWidth: 2,
                                borderDash: [6, 4],
                                label: {
                                    display: true,
                                    content: "Agora",
                                    position: "start", 
                                    backgroundColor: "#00d1b2",
                                    color: "#000",
                                    font: { size: 11, weight: "bold" },
                                    yAdjust: -10 
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        offset: true, 
                        grid: { display: false },
                        ticks: {
                            color: "#a0a0a0",
                            maxTicksLimit: 8
                        },
                        
                        min: labels[Math.max(0, labels.length - 20)], 
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: "rgba(255,255,255,0.05)" },
                        ticks: {
                            color: "#a0a0a0",
                            callback: value => `R$ ${value}`
                        }
                    }
                }
            }
        });

        document.getElementById("grafico-container").classList.add("grafico-ativo");

    } catch (err) {
        resultado.innerHTML = "Erro ao carregar dados do ativo.";
        console.error(err);
    } finally {
        hideLoading()
    }
}