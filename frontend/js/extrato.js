document.addEventListener("DOMContentLoaded", async () => {
    const storedUser = localStorage.getItem("loggedUser")

    if (!storedUser) {
        window.location.href = "login.html"
        return
    }

    const user = JSON.parse(storedUser)
    const clientNameEl = document.getElementById("client-name")
    if (clientNameEl && user.nome) {
        clientNameEl.textContent = `Olá, ${user.nome}!`
    }
    const logoutBtn = document.querySelector(".logout")
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("loggedUser")
            window.location.href = "login.html"
        })
    }
    let saldo = 0

    try {
        const response = await fetch(
            `http://127.0.0.1:5000/api/dashboard?user_id=${encodeURIComponent(user.id)}`
        );

        console.log("STATUS API:", response.status)

        const rawText = await response.text()
        console.log("RESPOSTA:", rawText)

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`)
        }

        const data = JSON.parse(rawText)

        saldo = isNaN(Number(data.saldo)) ? 0 : Number(data.saldo)

    } catch (error) {
        console.error("Erro ao buscar dados financeiros:", error)
        saldo = 0
    }


document.getElementById("transferForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailDestino = document.getElementById("emailDestino").value
    const valor = document.getElementById("valorTransferencia").value

    // Exemplo: ID do usuário logado
    const idOrigem = 1;

    try {
        const response = await fetch("http://127.0.0.1:5000/api/transferir", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_origem: idOrigem,
                email_destino: emailDestino,
                valor: valor
            })
        });

        const data = await response.json()

        if (!response.ok) {
            alert(data.message || "Erro ao realizar transferência.")
            return;
        }

        alert(data.message)
        const saldoEl = document.getElementById("current-balance");
        if (saldoEl && data.novo_saldo !== undefined) {
            saldoEl.textContent =
                "R$ " + data.novo_saldo.toFixed(2).replace(".", ",");
        }

        document.getElementById("transferForm").reset();

    } catch (error) {
        console.error(error);
        alert("Erro de conexão com o servidor.");
    }
});

})