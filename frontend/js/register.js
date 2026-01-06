document.addEventListener("DOMContentLoaded", () => {

    const cadastroForm = document.getElementById("cadastroForm");

    const API_ENDPOINT = "http://127.0.0.1:5000/api/cadastro";

    cadastroForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = {
            nome: document.getElementById("nome").value.trim(),
            email: document.getElementById("email").value.trim(),
            telefone: document.getElementById("telefone").value.trim(),
            senha: document.getElementById("senha").value
        };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Cadastro realizado com sucesso!`);
                cadastroForm.reset();
            } else {
                alert(`❌ Erro: ${result.message}`);
                console.error("Erro do servidor:", result);
            }

        } catch (error) {
            alert("❌ Não foi possível conectar ao servidor.");
            console.error("Erro de rede:", error);
        }
    });

});