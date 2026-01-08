async function login() {
    const email = document.getElementById('email').value
    const senha = document.getElementById('senha').value
    const errorDiv = document.getElementById('error')

    errorDiv.textContent = ""

    if (!email || !senha) {
        errorDiv.textContent = "Preencha todos os campos"
        return
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        })

        const data = await response.json()

        if (!response.ok) {
            errorDiv.textContent = data.detail || "Erro ao fazer login"
            return
        }

        localStorage.setItem("access_token", data.access_token)
        console.log("Login bem-sucedido! Redirecionando...")
        window.location.href = "home.html"

    } catch (error) {
        errorDiv.textContent = "Erro de conexão com o servidor"
        console.error(error)
    }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    await login()
})
