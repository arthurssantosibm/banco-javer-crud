/* ================= VARIÁVEIS GLOBAIS ================= */

let headers = {};
let user = null;
let saldo = 0;
let chartInstance = null;
let ativoSelecionado = null;
let precoUnitarioAtual = 0;

/* ================= REGISTRO DE PLUGINS (OBRIGATÓRIO NO CHART.JS v4) ================= */

if (window.Chart && Chart.registry) {
    Chart.register(ChartZoom);
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    await carregarDadosUsuario();
    await verificarInvestidor();
    await carregarPatrimonio();
    await carregarCarteira();
    await carregarGraficoProjecao();
    await carregarGraficoInflacao();


    document.querySelector(".logout").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    });
});

/* ================= LOADING ================= */

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

/* ================= USUÁRIO ================= */

async function carregarDadosUsuario() {
    try {
        const res = await fetch(
            "http://127.0.0.1:8000/user/user",
            { headers }
        );

        if (!res.ok) throw new Error("Erro ao buscar usuário");

        user = await res.json();
        saldo = Number(user.saldo_cc) || 0;

        document.getElementById("client-name").textContent = `Olá, ${user.nome}`;
        document.getElementById("saldo-disponivel").textContent =
            saldo.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

    } catch (err) {
        console.error(err);
        Swal.fire("Erro", "Erro ao carregar dados do usuário", "error");
    }
}


/* ================= INVESTIDOR ================= */

async function verificarInvestidor() {
    try {
        const res = await fetch("http://127.0.0.1:8000/invest/verify", { headers });

        if (!res.ok) throw new Error("Erro na verificação");

        const data = await res.json();

        if (!data.is_investor) {
            document.getElementById("investorModal").classList.remove("hidden");
        }

    } catch (err) {
        console.error(err);

        // Mostra o alerta e redireciona depois que o usuário fechar
        await Swal.fire("Erro", "Erro ao validar Perfil de Investidor", "error");
        window.location.href = "../html/login.html";
    }
}


/* ================= REGISTRAR INVESTIDOR ================= */

async function registrarInvestidor() {
    const perfil = document.getElementById("perfilInvestidor").value;

    if (!perfil) {
        Swal.fire("Atenção", "Selecione um perfil válido", "warning");
        return;
    }

    try {
        showLoading();

        const res = await fetch(
            "http://127.0.0.1:8000/invest/register",
            {
                method: "POST",
                headers,
                body: JSON.stringify({ perfil_investidor: perfil })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Erro ao registrar investidor");
        }

        Swal.fire({
            icon: "success",
            title: "Cadastro realizado!",
            text: "Perfil de investidor registrado com sucesso",
            confirmButtonColor: "#04b197"
        });

        document
            .getElementById("investorModal")
            .classList.add("hidden");

    } catch (err) {
        console.error(err);
        Swal.fire("Erro", err.message, "error");
    } finally {
        hideLoading();
    }
}

/* ================= PATRIMONIO ================= */
async function carregarPatrimonio() {
    try {
        showLoading();
        const res = await fetch(
            "http://127.0.0.1:8000/invest/patrimony",
            { headers }
        );

        if (!res.ok) throw new Error("Erro ao buscar patrimônio");

        const data = await res.json();

        document.getElementById("total-patrimony").textContent =
            data.patrimonio_total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });
    hideLoading()

    } catch (err) {
        console.error(err);
    }
}


async function carregarGraficoInflacao() {
    const res = await fetch("http://127.0.0.1:8000/invest/comparacao-inflacao", {
        headers
    });

    const data = await res.json();

    new Chart(document.getElementById("graficoInflacao"), {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: "Seu Patrimônio",
                    data: data.patrimonio,
                    borderWidth: 3,
                    tension: 0.4
                },
                {
                    label: "Inflação",
                    data: data.inflacao,
                    borderWidth: 2,
                    borderDash: [6, 6],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                display: true,
                text: data.perfil_investidor
            }
        }

    });
}

/* ================= ATUALIZAR PERFIL DE INVESTIDOR ================= */
async function updateInvestType() {
    const perfil = document.getElementById("perfilInvestidor").value;
    const token = localStorage.getItem("access_token");

    if (!perfil) {
        Swal.fire({
            title: "Selecione um perfil!",
            text: "Você precisa selecionar um perfil de investidor",
            icon: "warning"
            });
        return;
    }

    try {
        showLoading()
        const res = await fetch("http://127.0.0.1:8000/invest/perfil-investidor", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                perfil_investidor: perfil
            })
        });

        const data = await res.json();

        hideLoading()
        if (!res.ok) {
            throw new Error(data.detail || "Erro ao atualizar perfil");
        }

        Swal.fire({
            title: "Sucesso!",
            text: "Perfil de investidor atualizado com sucesso!",
            icon: "success"
        });

    } catch (err) {
        console.error(err);
        Swal.fire({
            title: "Erro",
            text: "Erro ao salvar o perfil",
            icon: "warning"
        });
    }
}


/* ================= ALERTA ================= */

function dispararAlerta() {
    Swal.fire({
        title: '<span style="color:#000;font-weight:800;font-size:28px">BankPY</span>',
        html: `<div style="padding:10px">
                <p style="font-size:1.1rem;color:#333;margin-bottom:20px">
                    Bem-vindo(a) à sua conta digital.
                </p>
                <div style="background:#f8f9fa;border-radius:12px;padding:15px;border-left:5px solid #04b197;text-align:left">
                    <div style="margin-bottom:8px">
                        <strong>Versão:</strong> 1.2.1
                    </div>
                    <div style="font-size:0.85rem;color:#888">
                        Arthur Santana dos Santos ©
                    </div>
                </div>
               </div>`,
        icon: "info",
        confirmButtonColor: "#04b197"
    });
}

/* ================= BUSCAR ATIVO ================= */

async function buscarAtivo() {
    const ticker = document.getElementById("ticker").value.trim().toUpperCase();
    const resultado = document.getElementById("resultado");
    const canvasElement = document.getElementById("meuGrafico");
    const ctx = canvasElement.getContext("2d");

    if (!ticker) return;

    showLoading();

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
            <button class="btn-buy" onclick='abrirModalCompra(${JSON.stringify(data)})'>
                Comprar
            </button>
        `;
        renderAnalises(data);

        /* ================= GRÁFICO ================= */

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
                    title: {
                        display: true,
                        text: 'Gráfico de Histórico de Ativos (Todo Período)'
                    },
                    legend: { display: true },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: "x",
                            modifierKey: "ctrl"
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
                        min: labels[Math.max(0, labels.length - 20)]
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
        console.error(err);
        resultado.innerHTML = "Erro ao carregar dados do ativo.";
    } finally {
        hideLoading();
    }
}

/* ================= CARTEIRA ================= */
async function carregarCarteira() {
    const token = localStorage.getItem("access_token");
    const container = document.getElementById("carteiraList");

    try {
        showLoading()
        const res = await fetch("http://127.0.0.1:8000/invest/carteira", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await res.json();

        container.innerHTML = "";

        if (data.length === 0) {
            container.innerHTML = "<p>Nenhum investimento encontrado</p>";
            return;
        }

        data.forEach(item => {
            const card = document.createElement("div");
            card.classList.add("ativo-card");
            const precoCompra = Number(item.valor_atual);
            const precoAtual = Number(item.preco_atual);
            const quantidade = Number(item.quantidade);

            let valorizacao = 0

            
            if (precoCompra > 0 && precoAtual > 0) {
                valorizacao = ((precoAtual - precoCompra) / precoCompra) * 100;
            }

            const classeValorizacao = valorizacao >= 0 ? "positivo" : "negativo";

            card.innerHTML = `
                <div class="ativo-header">
                    <strong>${item.nome_ativo}</strong>
                    <span>${item.ticker}</span>
                </div>

                <div class="ativo-info">
                    <p><b>Ticker:</b> ${item.ticker}</p>
                    <p><b>Tipo:</b> ${item.tipo_ativo}</p>
                    <p><b>Quantidade:</b> ${item.quantidade}</p>
                    <p><b>Preço Compra:</b> R$ ${Number(item.valor_atual).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <p><b>Preço Mercado:</b> R$ ${precoAtual > 0 ? precoAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "N/A"}</p>
                    <p><b>Total investido:</b> R$ ${Number(item.valor_investido).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <p>
                        <b>Valorização:</b> 
                        <span class="${classeValorizacao}">
                            ${valorizacao.toFixed(2)}%
                        </span>
                    </p>
                    <p class="data"><b>Data:</b> ${new Date(item.data_aplicacao).toLocaleDateString()}</p>
                </div>
            `;

            container.appendChild(card);
        });
    
    hideLoading()

    } catch (err) {
        console.error("Erro ao carregar carteira", err);
        container.innerHTML = "<p>Erro ao carregar investimentos</p>";
    }
}

/* ================= ANALISES DE AÇÕES ================= */
function renderAnalises(data) {
    const analisesContainer = document.getElementById("analises-container");
    const indicadoresList = document.getElementById("indicadores-list");
    const benchmarkList = document.getElementById("benchmark-list");

    analisesContainer.classList.remove("hidden");

    /* ================= INDICADORES ================= */
    indicadoresList.innerHTML = `
        <li>PE Ratio: <strong>${data.indicadores.pe_ratio ?? "—"}</strong></li>
        <li>EPS (Lucro por ação): <strong>${data.indicadores.eps ?? "—"}</strong></li>
        <li>Beta (volatilidade): <strong>${data.indicadores.beta ?? "—"}</strong></li>
        <li>Market Cap: <strong>${(data.indicadores.market_cap || 0)
            .toLocaleString("en-US")}</strong></li>
        <li>Industry: <strong>${data.indicadores.industry ?? "—"}</strong></li>
        <li>ROE (Retorno sobre patrimônio): 
            <strong>${data.indicadores.roe ? (data.indicadores.roe * 100).toFixed(2) + "%" : "—"}</strong>
        </li>
    `;


    /* ================= BENCHMARK ================= */
    benchmarkList.innerHTML = `
        <li>Índice base: <strong>${data.benchmark.indice}</strong></li>
        <li>Retorno do ativo (12m): 
            <strong>${data.benchmark.retorno_ativo_12m?.toFixed(2) ?? "—"}%</strong>
        </li>
        <li>Retorno do benchmark (12m): 
            <strong>${data.benchmark.retorno_bench_12m?.toFixed(2) ?? "—"}%</strong>
        </li>
        <li>Correlação ativo/benchmark: 
            <strong>${data.benchmark.correlacao?.toFixed(3) ?? "—"}</strong>
        </li>
        <li>Beta calculado: 
            <strong>${data.benchmark.beta_calculado?.toFixed(3) ?? "—"}</strong>
        </li>
    `;
}


/* ================= MODAL DE COMPRA ================= */


function abrirModalCompra(ativo) {
    ativoSelecionado = ativo;
    precoUnitarioAtual = Number(ativo.preco);

    document.getElementById("buy-nome-ativo").textContent = ativo.nome;
    document.getElementById("buy-ticker").textContent = ativo.ticker;
    document.getElementById("buy-preco-unitario").textContent =
        precoUnitarioAtual.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    document.getElementById("quantidadeAtivo").value = "";
    document.getElementById("buy-total").textContent = "R$ 0,00";

    document.getElementById("buyAssetModal").classList.remove("hidden");
}

function fecharModalCompra() {
    document.getElementById("buyAssetModal").classList.add("hidden");
}

function calcularTotalCompra() {
    const qtd = Number(document.getElementById("quantidadeAtivo").value);

    if (!qtd || qtd <= 0) {
        document.getElementById("buy-total").textContent = "R$ 0,00";
        return;
    }

    const total = qtd * precoUnitarioAtual;

    document.getElementById("buy-total").textContent =
        total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
}

/* ================= CONFIRMAR COMPRA ================= */

async function confirmarCompra() {
    const quantidade = Number(document.getElementById("quantidadeAtivo").value);

    if (!quantidade || quantidade <= 0) {
        Swal.fire("Atenção", "Quantidade inválida", "warning");
        return;
    }

    try {
        showLoading();

        const res = await fetch(
            "http://127.0.0.1:8000/invest/buy",
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ticker: ativoSelecionado.ticker,
                    quantidade
                })
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Erro ao comprar ativo");
        }

        Swal.fire("Sucesso", "Ativo comprado com sucesso!", "success");

        fecharModalCompra();
        await carregarDadosUsuario();

    } catch (err) {
        console.error(err);
        Swal.fire("Erro", err.message, "error");
    } finally {
        hideLoading();
    }
}

/* ================= GRAFICO DE PROJECOES ================= */
let graficoProjecaoInstance = null;

async function carregarGraficoProjecao() {
    try {
        showLoading()
        const res = await fetch("http://127.0.0.1:8000/invest/projecao-patrimonio", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`
            }
        });

        if (!res.ok) {
            throw new Error("Erro ao buscar dados da rota de projeção.");
        }

        // 1. Extraindo os dados conforme o seu retorno Python
        const data = await res.json();
        const valorInicial = Number(data.total_renda_fixa) || 0;
        const perfilUsuario = data.perfil_usuario;

        const meses = 60; // Projeção para 5 anos

        // 2. Labels do eixo X (Hoje, 1m, 2m...)
        const labels = Array.from({ length: meses + 1 }, (_, i) =>
            i === 0 ? "Hoje" : `${i}m`
        );

        // 3. Função de cálculo de Juros Compostos (Crescimento Exponencial)
        function gerarDadosProjecao(valorBase, taxaAnual) {
            // Converte taxa anual para mensal: (1 + i_anual)^(1/12) - 1
            const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
            let pontos = [valorBase];
            let acumulado = valorBase;

            for (let i = 1; i <= meses; i++) {
                acumulado *= (1 + taxaMensal);
                pontos.push(Number(acumulado.toFixed(2)));
            }
            return pontos;
        }

        const ctx = document.getElementById("graficoProjecao").getContext("2d");

        // 4. Limpeza de instância anterior para evitar sobreposição
        if (graficoProjecaoInstance) {
            graficoProjecaoInstance.destroy();
        }

        // 5. Configuração do Chart.js
        graficoProjecaoInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Conservador (8% a.a)",
                        data: gerarDadosProjecao(valorInicial, 0.08),
                        borderColor: "#00d1b2",
                        backgroundColor: "transparent",
                        borderWidth: 3,
                        fill: false,
                        tension: 1, // Curva suave
                        pointRadius: 0
                    },
                    {
                        label: "Moderado (12% a.a)",
                        data: gerarDadosProjecao(valorInicial, 0.12),
                        borderColor: "#737b80",
                        backgroundColor: "transparent",
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: "Arrojado (18% a.a)",
                        data: gerarDadosProjecao(valorInicial, 0.18),
                        borderColor: "#e74c3c",
                        backgroundColor: "transparent",
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: "Projeção de Patrimonio em Renda Fixa (Total)",
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                    legend: {
                        labels: { color: "#e5e7eb", usePointStyle: true }
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        callbacks: {
                            label: (ctx) => {
                                let valor = ctx.parsed.y.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL"
                                });
                                return `${ctx.dataset.label}: ${valor}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: "#9ca3af" },
                        grid: { color: "rgba(255,255,255,0.05)" }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: "#9ca3af",
                            callback: (value) => value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                                maximumFractionDigits: 0
                            })
                        },
                        grid: { color: "rgba(255,255,255,0.08)" }
                    }
                }
            }
        });
    
    hideLoading()
    } catch (error) {
        console.error("Erro ao carregar gráfico:", error);
    }
}