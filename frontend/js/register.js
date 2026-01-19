document.addEventListener("DOMContentLoaded", () => {
    const cadastroForm = document.getElementById("cadastroForm")
    const API_ENDPOINT = "http://127.0.0.1:8000/auth/criar_conta"

    const nomeInput = document.getElementById("nome")
    const emailInput = document.getElementById("email")
    const telefoneInput = document.getElementById("telefone")
    const senhaInput = document.getElementById("senha")

    const nomeError = document.getElementById("nomeError")
    const emailError = document.getElementById("emailError")
    const telefoneError = document.getElementById("telefoneError")
    const senhaError = document.getElementById("senhaError")
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

    const nomesProprios = [
        "joao", "maria", "pedro", "ana", "luiz",
        "carlos", "sofia", "antonio", "gabriel", "rafael"
    ]

    function validateNome(nome) {
        let error = ""
        const nomeLimpo = nome.trim()

        if (nomeLimpo.length === 0) {
            error = "O nome não pode estar vazio."
        } else if (nomeLimpo.length < 6) {
            error = "O nome deve ser completo."
        } else if (!/^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(nomeLimpo)) {
            error = "O nome deve ter iniciais maiúsculas em cada palavra e conter apenas letras."
        }

        nomeError.textContent = error
        return error === ""
    }

    function validateEmail(email) {
        let error = ""
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            error = "Por favor, insira um email válido (ex: seu.email@dominio.com)."
        }

        emailError.textContent = error
        return error === ""
    }

    function validateTelefone(telefone) {
        let error = ""
        const telefoneNumeros = telefone.replace(/\D/g, '')

        if (telefoneNumeros.length === 0) {
            error = "O telefone não pode estar vazio."
        } else if (telefoneNumeros.length < 10 || telefoneNumeros.length > 11) {
            error = "O telefone deve ter 10 ou 11 dígitos (com DDD)."
        }

        telefoneError.textContent = error
        return error === ""
    }

    function validateSenha(senha) {
        let erros = []

        if (senha.length < 8) erros.push("Mínimo de 8 caracteres.")
        if (!/[!@#$%^&*()_+\-=\[\]{}':"\\|,.<>\/?]+/.test(senha))
            erros.push("Deve conter um caractere especial.")
        if (/[çáàãâéèêíìîóòõôúùû]/.test(senha.toLowerCase()))
            erros.push('Não pode conter "ç" ou acentos.')
        if (!/[A-Z]/.test(senha))
            erros.push("Deve conter uma letra maiúscula.")
        if (/\s/.test(senha))
            erros.push("Não deve conter espaços.")

        const sequenciaNumRegex = /(123|234|345|456|567|678|789|987|876|765|654|543|432|321|012|210)/
        if (sequenciaNumRegex.test(senha))
            erros.push("Não deve conter sequências numéricas (ex: 123).")

        if (nomesProprios.some(nome => senha.toLowerCase().includes(nome)))
            erros.push("Não deve conter um nome próprio comum.")

        senhaError.innerHTML = erros.length
            ? "<ul>" + erros.map(e => `<li>${e}</li>`).join("") + "</ul>"
            : ""

        return erros.length === 0
    }

    nomeInput.addEventListener('input', () => validateNome(nomeInput.value))
    emailInput.addEventListener('input', () => validateEmail(emailInput.value))
    telefoneInput.addEventListener('input', () => validateTelefone(telefoneInput.value))
    senhaInput.addEventListener('input', () => validateSenha(senhaInput.value))

    function showLoading() {
        const overlay = document.getElementById("loadingOverlay")
        if (overlay) overlay.classList.remove("hidden")
        document.body.classList.add("loading-active")
    }

    function hideLoading() {
        const overlay = document.getElementById("loadingOverlay")
        if (overlay) overlay.classList.add("hidden")
        document.body.classList.remove("loading-active")
    }
    cadastroForm.addEventListener("submit", async (event) => {
        event.preventDefault()

        const submitButton = document.getElementById("submitButton")

        const isNomeValid = validateNome(nomeInput.value)
        const isEmailValid = validateEmail(emailInput.value)
        const isTelefoneValid = validateTelefone(telefoneInput.value)
        const isSenhaValid = validateSenha(senhaInput.value)

        if (!isNomeValid || !isEmailValid || !isTelefoneValid || !isSenhaValid) {
            Swal.fire({
                icon: "warning",
                title: "Formulário inválido",
                text: "Por favor, corrija os erros antes de enviar."
            })

            if (!isNomeValid) nomeInput.focus()
            else if (!isEmailValid) emailInput.focus()
            else if (!isTelefoneValid) telefoneInput.focus()
            else senhaInput.focus()

            return
        }

        const formData = {
            nome: nomeInput.value.trim(),
            email: emailInput.value.trim(),
            telefone: telefoneInput.value.trim(),
            senha: senhaInput.value
        }

        try {
            showLoading()

            submitButton.disabled = true
            submitButton.innerText = "Cadastrando..."

            const response = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            const result = await response.json()

            if (response.ok) {
                hideLoading()
                await Swal.fire({
                    icon: "success",
                    title: "Cadastro realizado!",
                    text: "Sua conta foi criada com sucesso.",
                    confirmButtonText: "Ir para login"
                })

                window.location.href = "login.html"

            } else {
                hideLoading()
                const errorMessage = result.detail || result.message || "Erro desconhecido."

                if (errorMessage.includes("Email já cadastrado")) {
                    emailError.textContent = "Este email já está em uso."

                    Swal.fire({
                        icon: "error",
                        title: "Email já cadastrado",
                        text: "Utilize outro email para continuar."
                    })
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Erro no cadastro",
                        text: errorMessage
                    })
                }
            }

        } catch (error) {
            hideLoading()
            console.error("Erro de rede:", error)

            Swal.fire({
                icon: "error",
                title: "Erro de conexão",
                text: "Não foi possível conectar ao servidor."
            })

        } finally {
            hideLoading()
            
            submitButton.disabled = false
            submitButton.innerText = "Cadastrar Cliente"
        }
    })
})
