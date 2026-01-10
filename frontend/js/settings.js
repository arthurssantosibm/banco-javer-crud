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

    try {
        const res = await fetch("http://127.0.0.1:8000/user/user", {
            headers
        });

        const user = await res.json()

        document.getElementById("client-name").textContent = `Olá, ${user.nome}`
        document.getElementById("nome").value = user.nome;
        document.getElementById("email").value = user.email;
        document.getElementById("saldo").value = `R$ ${Number(user.saldo_cc).toFixed(2)}`
        document.getElementById("score").value = `${(Number(user.saldo_cc) * 0.1).toFixed(0)} pontos`

    } catch (err) {
        console.error("Erro ao carregar usuário", err)
        alert("Erro ao carregar dados do usuário")
    }

    document.getElementById("settingsForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitButton = document.getElementById("submitBtn")
        submitButton.innerText = "Salvando..."
        submitButton.disabled = true

        const payload = {
            nome: document.getElementById("nome").value,
            email: document.getElementById("email").value,
            telefone: "",
            current_password: document.getElementById("current_password").value || null,
            new_password: document.getElementById("new_password").value || null
        };

        try {
            const res = await fetch("http://127.0.0.1:8000/user/update_user", {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });

            const data = await res.json()

            if (!res.ok) {
                alert(data.detail || "Erro ao atualizar dados")
                return;
            }

            alert("Dados atualizados com sucesso!")
            document.getElementById("current_password").value = ""
            document.getElementById("new_password").value = ""
            document.getElementById("confirm_password").value = ""

        } catch (err) {
            console.error("Erro update", err)
            alert("Erro de conexão com o servidor")
        }
    });

    document.querySelector(".logout").addEventListener("click", () => {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
    });
});
