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
        document.getElementById("score").value = `${(Number(user.saldo_cc) * 0.1).toFixed(2)} pontos`

    } catch (err) {
        console.error(err)
        Swal.fire({
            icon: "error",
            title: "Erro",
            text: "Erro ao carregar dados do usuário",
            confirmButtonColor: "#F7934C"
        })
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
                submitButton.innerText = "Salvar Alterações"
                return
            }

            if (newPassword !== confirmPassword) {
                senhaError.textContent = "As senhas não coincidem."
                submitButton.disabled = false
                submitButton.innerText = "Salvar Alterações"
                return
            }

            if (!validateSenha(newPassword)) {
                submitButton.disabled = false
                submitButton.innerText = "Salvar Alterações"
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
                Swal.fire({
                    icon: "error",
                    title: "Erro",
                    text: data.detail || "Erro ao atualizar",
                    confirmButtonColor: "#F7934C"
                })
                return
            }

            Swal.fire({
                icon: "success",
                title: "Sucesso!",
                text: "Dados atualizados com sucesso!",
                confirmButtonColor: "#F7934C"
            })

            document.getElementById("current_password").value = ""
            newPasswordInput.value = ""
            confirmPasswordInput.value = ""
            senhaError.innerHTML = ""

        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Erro de conexão",
                text: "Erro de conexão com o servidor",
                confirmButtonColor: "#F7934C"
            })
        } finally {
            submitButton.innerText = "Salvar Alterações"
            submitButton.disabled = false
        }
    })

    document.querySelector(".logout").addEventListener("click", () => {
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    })

    /* ================================
       EXIBIR / OCULTAR SENHA (ADICIONADO)
    ================================= */

    const passwordFields = [
        "current_password",
        "new_password",
        "confirm_password"
    ]

    passwordFields.forEach(fieldId => {
        const input = document.getElementById(fieldId)
        if (!input) return

        const wrapper = document.createElement("div")
        wrapper.style.position = "relative"
        input.parentNode.insertBefore(wrapper, input)
        wrapper.appendChild(input)

        const icon = document.createElement("div")
        icon.style.position = "absolute"
        icon.style.top = "50%"
        icon.style.right = "12px"
        icon.style.transform = "translateY(-50%)"
        icon.style.width = "22px"
        icon.style.height = "22px"
        icon.style.cursor = "pointer"
        icon.style.backgroundImage = "url('../img/disable.png')"
        icon.style.backgroundSize = "cover"

        wrapper.appendChild(icon)
        input.style.paddingRight = "45px"

        icon.addEventListener("click", () => {
            if (input.type === "password") {
                input.type = "text"
                icon.style.backgroundImage = "url('../img/enable.png')"
            } else {
                input.type = "password"
                icon.style.backgroundImage = "url('../img/disable.png')"
            }
        })
    })
    /* ================================
    SUSPENDER CONTA
    ================================ */

    const suspenderBtn = document.getElementById("suspender-conta-btn")

    if (suspenderBtn) {
        suspenderBtn.addEventListener("click", async () => {
            const confirm = await Swal.fire({
                icon: "warning",
                title: "Suspender conta?",
                text: "Sua conta será inativada e você não poderá acessar até reativar.",
                showCancelButton: true,
                confirmButtonText: "Sim, suspender",
                cancelButtonText: "Cancelar",
                confirmButtonColor: "#CC5803",
                cancelButtonColor: "#999"
            })

            if (!confirm.isConfirmed) return

            try {
                const res = await fetch(`http://127.0.0.1:8000/user/suspender`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                })


                const data = await res.json()

                if (!res.ok) {
                    Swal.fire({
                        icon: "error",
                        title: "Erro",
                        text: data.detail || "Erro ao suspender conta",
                        confirmButtonColor: "#F7934C"
                    })
                    return
                }

                await Swal.fire({
                    icon: "success",
                    title: "Conta suspensa",
                    text: "Sua conta foi suspensa com sucesso.",
                    confirmButtonColor: "#F7934C"
                })

                // 🔒 Remove token e redireciona
                localStorage.removeItem("access_token")
                window.location.href = "login.html"

            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "Erro de conexão",
                    text: "Não foi possível suspender a conta.",
                    confirmButtonColor: "#F7934C"
                })
            }
        })
    }

})

function dispararAlerta() {
    Swal.fire({
        title: '<span style="color: #F7934C; font-weight: 800; font-size: 28px;">BankJaver</span>',
        html: `
            <div style="padding: 10px;">
                <p style="font-size: 1.1rem; color: #333; margin-bottom: 20px;">
                    Bem-vindo(a) à sua conta digital.
                </p>
                <div style="background: #f8f9fa; border-radius: 12px; padding: 15px; border-left: 5px solid #F7934C; text-align: left;">
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #1F1300;">Versão:</strong> 
                        <span style="color: #666;">1.2.1</span>
                    </div>
                    <div style="font-size: 0.85rem; line-height: 1.4; color: #888;">
                        All rights reserved to <br>
                        <strong style="color: #1F1300;">Arthur Santana dos Santos ©</strong>
                    </div>
                </div>
            </div>
        `,
        icon: "info",
        iconColor: "#F7934C",
        confirmButtonText: "ACESSAR CONTA",
        confirmButtonColor: "#F7934C"
    })
}
