document.addEventListener("DOMContentLoaded", () => {
    const senhaInput = document.getElementById("senha")
    const icon = document.getElementById("icons")

    function showHidePassword() {
        if (senhaInput.type === "password") {
            senhaInput.type = "text"
            icon.classList.add("show-password")
        } else {
            senhaInput.type = "password"
            icon.classList.remove("show-password")
        }
    }

    if (icon) {
        icon.addEventListener("click", showHidePassword)
    }
})

async function login() {
    const email = document.getElementById('email').value
    const senha = document.getElementById('senha').value
    const errorDiv = document.getElementById('error')
    const loginButton = document.getElementById('loginButton')

    errorDiv.textContent = ""

    if (!email || !senha) {
        errorDiv.textContent = "Preencha todos os campos"
        return
    }

    loginButton.innerText = "Processando..."
    loginButton.disabled = true

    try {
        const response = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        })

        const data = await response.json()

        if (!response.ok) {
            errorDiv.textContent = data.detail || "Erro ao fazer login"
            return
        }

        localStorage.setItem("access_token", data.access_token)
        window.location.href = "home.html"

    } catch (error) {
        errorDiv.textContent = "Erro de conexão com o servidor"
    } finally {
        loginButton.innerText = "Entrar"
        loginButton.disabled = false
    }
}

document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault()
    login()
})
