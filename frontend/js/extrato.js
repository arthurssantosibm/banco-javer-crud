document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token")

    if (!token) {
        window.location.href = "login.html"
        return
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    }

    let user

    try {
        const res = await fetch("http://127.0.0.1:8000/user/user", { headers })
        user = await res.json()

        document.getElementById("client-name").textContent = `Olá, ${user.nome}`
    } catch (err) {
        console.error("Erro ao carregar usuário", err)
        return
    }

    document.getElementById("transferForm").addEventListener("submit", async (e) => {
        e.preventDefault()

        const emailDestino = document.getElementById("emailDestino").value
        const valor = parseFloat(document.getElementById("valorTransferencia").value)

        try {
            const response = await fetch("http://127.0.0.1:8000/transacoes/transacoes", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    email_origin: user.email,
                    email_destination: emailDestino,
                    valor: valor,
                    mensagem: ""
                })
            })

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || "Erro ao realizar transferência")
                return
            }

            alert("Transferência realizada com sucesso!")
            document.getElementById("transferForm").reset()
            carregarTransacoes()

        } catch (err) {
            console.error("Erro na transferência", err)
            alert("Erro ao realizar transferência")
        }
    })

    async function carregarTransacoes() {
        try {
            const res = await fetch(
                "http://127.0.0.1:8000/transacoes/listar_transacoes",
                { headers }
            )

            const transacoes = await res.json()
            const list = document.getElementById("transaction-list")
            list.innerHTML = ""

            if (!transacoes.length) {
                list.innerHTML = "<li>Nenhuma transação encontrada</li>"
                return
            }

            transacoes.forEach(tx => {
                const li = document.createElement("li")
                const entrada = tx.email_destination === user.email

                li.innerHTML = `
                    <strong>${entrada ? "Entrada" : "Saída"}</strong><br>
                    ${entrada ? "+" : "-"} R$ ${Number(tx.valor).toFixed(2)}<br>
                    <small>${tx.mensagem || "Sem mensagem"}</small><br>
                    <small>${new Date(tx.create_time).toLocaleString("pt-BR")}</small>
                `
                list.appendChild(li)
            })

        } catch (err) {
            console.error("Erro ao carregar transações", err)
        }
    }

    carregarTransacoes()

    document.querySelector(".logout").addEventListener("click", (e) => {
        e.preventDefault()
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    })
})
