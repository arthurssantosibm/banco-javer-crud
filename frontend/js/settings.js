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

    try {
        const res = await fetch("http://127.0.0.1:8000/user/user", { headers })
        const user = await res.json()

        document.getElementById("client-name").textContent = `Olá, ${user.nome}`
        document.getElementById("nome").value = user.nome
        document.getElementById("email").value = user.email
        document.getElementById("saldo").value = `R$ ${Number(user.saldo_cc).toFixed(2)}`
        document.getElementById("score").value = `${(Number(user.saldo_cc) * 0.1).toFixed(0)} pontos`

    } catch (err) {
        console.error(err)
        alert("Erro ao carregar dados do usuário")
    }

    const newPasswordInput = document.getElementById("new_password")
    const confirmPasswordInput = document.getElementById("confirm_password")
    const senhaError = document.getElementById("senhaError")

    const nomesProprios = ["joao", "maria", "pedro", "ana", "luiz", "carlos", "sofia", "antonio", "gabriel", "rafael"]

    function validateSenha(senha) {
        let erros = []

        if (senha.length < 8) erros.push("Mínimo de 8 caracteres.")
        if (!/[A-Z]/.test(senha)) erros.push("Deve conter uma letra maiúscula.")
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(senha))
            erros.push("Deve conter um caractere especial.")
        if (/\s/.test(senha)) erros.push("Não deve conter espaços.")
        if (/[çáàãâéèêíìîóòõôúùû]/i.test(senha))
            erros.push('Não pode conter "ç" ou acentos.')

        const sequenciaNumRegex = /(123|234|345|456|567|678|789|987|876|765|654|543|432|321|012|210)/
        if (sequenciaNumRegex.test(senha))
            erros.push("Não deve conter sequências numéricas.")

        const senhaMinuscula = senha.toLowerCase()
        if (nomesProprios.some(nome => senhaMinuscula.includes(nome)))
            erros.push("Não deve conter nome próprio comum.")

        senhaError.innerHTML = erros.length
            ? "<ul>" + erros.map(e => `<li>${e}</li>`).join("") + "</ul>"
            : ""

        return erros.length === 0
    }

    newPasswordInput.addEventListener("input", () => {
        if (newPasswordInput.value) {
            validateSenha(newPasswordInput.value)
        } else {
            senhaError.innerHTML = ""
        }
    })

    document.getElementById("settingsForm").addEventListener("submit", async (e) => {
        e.preventDefault()

        const submitButton = document.getElementById("submitBtn")
        submitButton.innerText = "Salvando..."
        submitButton.disabled = true

        const currentPassword = document.getElementById("current_password").value
        const newPassword = newPasswordInput.value
        const confirmPassword = confirmPasswordInput.value

        if (newPassword) {
            if (!currentPassword) {
                senhaError.textContent = "Informe a senha atual."
                submitButton.disabled = false
                submitButton.innerText = "Salvar"
                return
            }

            if (newPassword !== confirmPassword) {
                senhaError.textContent = "As senhas não coincidem."
                submitButton.disabled = false
                submitButton.innerText = "Salvar"
                return
            }

            if (!validateSenha(newPassword)) {
                submitButton.disabled = false
                submitButton.innerText = "Salvar"
                return
            }
        }

        const payload = {
            nome: document.getElementById("nome").value,
            email: document.getElementById("email").value,
            telefone: "",
            current_password: currentPassword || null,
            new_password: newPassword || null
        }

        try {
            const res = await fetch("http://127.0.0.1:8000/user/update_user", {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (!res.ok) {
                alert(data.detail || "Erro ao atualizar")
                return
            }

            alert("Dados atualizados com sucesso!")
            document.getElementById("current_password").value = ""
            newPasswordInput.value = ""
            confirmPasswordInput.value = ""
            senhaError.innerHTML = ""

        } catch (err) {
            alert("Erro de conexão com o servidor")
        } finally {
            submitButton.innerText = "Salvar"
            submitButton.disabled = false
        }
    })

    document.querySelector(".logout").addEventListener("click", () => {
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    })
})