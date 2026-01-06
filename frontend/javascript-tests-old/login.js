document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const API_LOGIN = "http://127.0.0.1:5000/api/login";

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;

        try {
            const response = await fetch(API_LOGIN, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, senha })
            });

            const result = await response.json();

            if (response.ok && result.user) {
                localStorage.setItem("loggedUser", JSON.stringify({
                    id: result.user.id,
                    nome: result.user.nome,
                    email: result.user.email,
                    saldo: result.user.saldo_cc
                }));
                window.location.href = "home.html";

            } else {
                alert(result.message || "Email ou senha inválidos");
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor");
        }
    });
});