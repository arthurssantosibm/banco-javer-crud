document.addEventListener("DOMContentLoaded", () => {
    const senhaInput = document.getElementById("senha");
    const icon = document.getElementById("icons");

    function showHidePassword() {
        if (senhaInput.type === "password") {
            senhaInput.type = "text";
            icon.classList.add("show-password");
        } else {
            senhaInput.type = "password";
            icon.classList.remove("show-password");
        }
    }

    if (icon) {
        icon.addEventListener("click", showHidePassword);
    }
});

async function login() {
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const errorDiv = document.getElementById("error");
    const loginButton = document.getElementById("loginButton");

    const email = emailInput.value.trim().toLowerCase();
    const senha = senhaInput.value;

    errorDiv.textContent = "";

    if (!email || !senha) {
        errorDiv.textContent = "Preencha todos os campos";
        return;
    }

    loginButton.innerText = "Processando...";
    loginButton.disabled = true;

    try {
        // 🔐 LOGIN NORMAL
        const response = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        // 🚫 CONTA INATIVA
        if (response.status === 403 && data.detail === "CONTA_INATIVA") {
            const result = await Swal.fire({
                title: "Conta Inativa",
                text: "Sua conta está suspensa. Deseja reativá-la agora?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sim, reativar",
                cancelButtonText: "Cancelar"
            });

            if (!result.isConfirmed) return;

            // 🔁 REATIVAR CONTA
            const reactivateResponse = await fetch(
                "http://127.0.0.1:8000/user/reativar",
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                }
            );

            if (!reactivateResponse.ok) {
                const err = await reactivateResponse.json();
                Swal.fire(
                    "Erro",
                    err.detail || "Não foi possível reativar a conta",
                    "error"
                );
                return;
            }

            await Swal.fire(
                "Conta reativada!",
                "Agora você pode entrar normalmente.",
                "success"
            );

            // 🔁 TENTA LOGIN AUTOMATICAMENTE
            return login();
        }

        // ❌ OUTROS ERROS
        if (!response.ok) {
            errorDiv.textContent = data.detail || "Erro ao fazer login";
            return;
        }

        // ✅ LOGIN OK
        localStorage.setItem("access_token", data.access_token);
        window.location.href = "home.html";

    } catch (err) {
        errorDiv.textContent = "Erro de conexão com o servidor";
    } finally {
        loginButton.innerText = "Entrar";
        loginButton.disabled = false;
    }
}

document
    .getElementById("loginForm")
    .addEventListener("submit", (event) => {
        event.preventDefault();
        login();
    });
