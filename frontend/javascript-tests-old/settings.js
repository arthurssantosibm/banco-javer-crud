document.addEventListener("DOMContentLoaded", async () => {
    const storedUser = localStorage.getItem("loggedUser");

    if (!storedUser) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(storedUser);
    const userId = Number(user.id);

    if (isNaN(userId) || userId <= 0) {
        alert("Erro: ID de usuário inválido. Por favor, faça login novamente.");
        localStorage.removeItem("loggedUser");
        window.location.href = "login.html";
        return;
    }

    document.getElementById("client-name").textContent = `Olá, ${user.nome}`;

    document.querySelector(".logout").addEventListener("click", () => {
        localStorage.removeItem("loggedUser");
        window.location.href = "login.html";
    });
    
    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const saldoInput = document.getElementById("saldo");
    const scoreInput = document.getElementById("score"); 

    try {
        const response = await fetch(
            `http://127.0.0.1:5000/api/users/${userId}` 
        );

        if (!response.ok) {
            throw new Error("Erro ao buscar dados do usuário");
        }

        const data = await response.json();
        const currentBalance = Number(data.saldo) || 0; 
        const calculatedScore = Math.min(Math.round(currentBalance * 0.1), 1000);
        
        nomeInput.value = data.nome;
        emailInput.value = data.email;
        
        saldoInput.value =
            "R$ " + currentBalance.toLocaleString("pt-BR", {
                minimumFractionDigits: 2
            });
        scoreInput.value = calculatedScore; 

    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        alert("Erro ao carregar dados do usuário. Verifique a API.");
    }

    document.getElementById("settingsForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const currentPassword = document.getElementById("current_password").value.trim();
        const newPassword = document.getElementById("new_password").value.trim();
        const confirmPassword = document.getElementById("confirm_password").value.trim();
        const updateData = { nome, email };
        let updatePasswordAttempt = false;

        if (newPassword || currentPassword || confirmPassword) {
            updatePasswordAttempt = true;

            if (!currentPassword) {
                alert("Para alterar a senha, você deve informar a Senha Atual.");
                return;
            }
            if (newPassword.length < 8) {
                alert("A Nova Senha deve ter no mínimo 8 caracteres.");
                return;
            }
            if (newPassword !== confirmPassword) {
                alert("A Nova Senha e a Confirmação não coincidem.");
                return;
            }
            updateData.current_password = currentPassword;
            updateData.new_password = newPassword;
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/users/${userId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updateData)
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Erro ao atualizar dados. Verifique a conexão.");
            }
            user.nome = nome;
            user.email = email;
            localStorage.setItem("loggedUser", JSON.stringify(user));
            document.getElementById("client-name").textContent = `Olá, ${user.nome}`;


            if (updatePasswordAttempt) {
                document.getElementById("current_password").value = "";
                document.getElementById("new_password").value = "";
                document.getElementById("confirm_password").value = "";
                alert("Dados e Senha atualizados com sucesso!");
            } else {
                 alert("Dados atualizados com sucesso!");
            }

        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert(err.message); 
        }
    });
    document.getElementById("deleta-conta-btn").addEventListener("click", async () => {
        const confirmDelete = confirm("Tem certeza que deseja deletar sua conta? Esta ação não pode ser desfeita.");
        if (!confirmDelete) return;

        const finalConfirmation = prompt(
            "Para confirmar a exclusão, digite a palavra 'DELETAR' abaixo:"
        );

        if (finalConfirmation !== 'DELETAR') {
            alert("Exclusão cancelada. A palavra de confirmação não foi digitada corretamente.");
            return;
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/users/${userId}`,
                {
                    method: "DELETE"
                }
            );

            if (response.ok) {
                alert("Sua conta foi excluída com sucesso.");
                
                localStorage.removeItem("loggedUser");
                window.location.href = "login.html";
            } else {
                const errorData = await response.json();
                alert(`Falha ao excluir a conta: ${errorData.message || 'Erro desconhecido'}`);
            }

        } catch (err) {
            console.error("Erro na exclusão da conta:", err);
            alert("Erro de conexão com o servidor. Tente novamente mais tarde.");
        }
    
    })
});