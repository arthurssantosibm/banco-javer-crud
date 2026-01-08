document.addEventListener("DOMContentLoaded", () => {
    const cadastroForm = document.getElementById("cadastroForm");
    const API_ENDPOINT = "http://127.0.0.1:8000/auth/criar_conta";

    // Elementos de input
    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const telefoneInput = document.getElementById("telefone");
    const senhaInput = document.getElementById("senha");

    // Elementos de erro
    const nomeError = document.getElementById("nomeError");
    const emailError = document.getElementById("emailError");
    const telefoneError = document.getElementById("telefoneError");
    const senhaError = document.getElementById("senhaError");
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


    // --- Funções de Validação ---

    // Lista de nomes próprios (para a validação da senha)
    const nomesProprios = ["joao", "maria", "pedro", "ana", "luiz", "carlos", "sofia", "antonio", "gabriel", "rafael"]; // Adicione mais nomes conforme necessário

    // Validação de Nome
    function validateNome(nome) {
        let error = "";
        const nomeLimpo = nome.trim();

        if (nomeLimpo.length === 0) {
            error = "O nome não pode estar vazio.";
        } 
        if (nomeLimpo.length < 6){
            error = "O nome deve ser completo";
        }
        else if (!/^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(nomeLimpo)) {
            error = "O nome deve ter iniciais maiúsculas em cada palavra e conter apenas letras.";
        }

        nomeError.textContent = error;
        return error === "";
    }

    // Validação de Email
    function validateEmail(email) {
        let error = "";
        // Regex básica para email válido (exige @ e pelo menos um ponto após o @)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            error = "Por favor, insira um email válido (ex: seu.email@dominio.com).";
        }

        emailError.textContent = error;
        return error === "";
    }

    // Validação de Telefone (Exemplo: 10 ou 11 dígitos numéricos, opcionalmente com código de área)
    function validateTelefone(telefone) {
        let error = "";
        const telefoneNumeros = telefone.replace(/\D/g, ''); // Remove caracteres não numéricos

        if (telefoneNumeros.length < 10 || telefoneNumeros.length > 11) {
            error = "O telefone deve ter 10 ou 11 dígitos (com DDD).";
        } else if (telefoneNumeros.length === 0) {
            error = "O telefone não pode estar vazio.";
        }

        telefoneError.textContent = error;
        return error === "";
    }

    // Validação de Senha
    function validateSenha(senha) {
        let erros = [];

        // 1. Mínimo 8 caracteres
        if (senha.length < 8) {
            erros.push("Mínimo de 8 caracteres.");
        }

        // 2. Deve ter um caracter especial (não alfanumérico)
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(senha)) {
            erros.push("Deve conter um caractere especial.");
        }

        // 3. Não pode conter "ç" nem acentos
        if (/[çáàãâéèêíìîóòõôúùû]/.test(senha.toLowerCase())) {
            erros.push('Não pode conter "ç" ou acentos.');
        }

        // 4. Deve ter uma letra maiúscula
        if (!/[A-Z]/.test(senha)) {
            erros.push("Deve conter uma letra maiúscula.");
        }

        // 5. Não deve conter espaço
        if (/\s/.test(senha)) {
            erros.push("Não deve conter espaços.");
        }

        // 6. Não deve conter sequências de números crescentes ou decrescentes (3 ou mais)
        const sequenciaNumRegex = /(123|234|345|456|567|678|789|987|876|765|654|543|432|321|012|210)/;
        if (sequenciaNumRegex.test(senha)) {
            erros.push("Não deve conter sequências numéricas (ex: 123, 321).");
        }
        
        // 7. Não pode ser um nome próprio de pessoa (em minúsculas)
        const senhaMinuscula = senha.toLowerCase();
        if (nomesProprios.some(nome => senhaMinuscula.includes(nome))) {
            erros.push("Não deve conter um nome próprio comum.");
        }


        // Exibe os erros
        senhaError.innerHTML = erros.length > 0 ? "<ul>" + erros.map(e => `<li>${e}</li>`).join("") + "</ul>" : "";
        return erros.length === 0;
    }

    // --- Validação em Tempo Real (no evento 'input') ---

    nomeInput.addEventListener('input', () => validateNome(nomeInput.value));
    emailInput.addEventListener('input', () => validateEmail(emailInput.value));
    telefoneInput.addEventListener('input', () => validateTelefone(telefoneInput.value));
    senhaInput.addEventListener('input', () => validateSenha(senhaInput.value));

    // --- Validação Final (no evento 'submit') ---

    cadastroForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Referencie o botão aqui, assim ele pode ser usado em qualquer lugar
        const submitButton = document.getElementById("submitButton");

        // Roda todas as validações novamente e verifica se todas passaram
        const isNomeValid = validateNome(nomeInput.value);
        const isEmailValid = validateEmail(emailInput.value);
        const isTelefoneValid = validateTelefone(telefoneInput.value);
        const isSenhaValid = validateSenha(senhaInput.value);

        const isFormValid = isNomeValid && isEmailValid && isTelefoneValid && isSenhaValid;

        if (isFormValid) {
            // Se tudo estiver válido, procede com o envio
            const formData = {
                nome: nomeInput.value.trim(),
                email: emailInput.value.trim(),
                telefone: telefoneInput.value.trim(),
                senha: senhaInput.value
            };

            try {
                // Desabilita o botão para evitar cliques múltiplos
                if (submitButton) submitButton.disabled = true; // Verificação extra

                const response = await fetch('http://127.0.0.1:8000/auth/criar_conta', {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(formData)
                });

                // Tenta obter o resultado JSON (mesmo em caso de erro, o servidor pode enviar detalhes)
                const result = await response.json(); 

                if (response.ok) {
                    alert(`✅ Cadastro realizado com sucesso!`);
                    
                    // Redirecionamento após o cadastro bem-sucedido é uma boa prática
                    window.location.href = 'login.html'; 
                    
                    // A limpeza do formulário (cadastroForm.reset();) pode ser opcional 
                    // se você for redirecionar, mas mantenha-a se for ficar na mesma página.
                    // Limpar mensagens de erro após o sucesso
                    [nomeError, emailError, telefoneError, senhaError].forEach(el => el.textContent = '');
                } else {
                    // Se a resposta NÃO for 2xx (ex: 400 Bad Request, 409 Conflict)
                    // O servidor Fast API geralmente retorna o erro no campo 'detail'.
                    const errorMessage = result.detail || result.message || "Erro desconhecido do servidor.";
                    
                    // Se for um erro específico (ex: Email já cadastrado), você pode exibi-lo no campo certo
                    if (errorMessage.includes("Email já cadastrado")) { 
                        emailError.textContent = "❌ Este email já está em uso.";
                        alert(`❌ Erro: Email já cadastrado.`);
                    } else {
                        alert(`❌ Erro: ${errorMessage}`);
                    }
                    console.error("Erro do servidor:", result);
                }

            } catch (error) {
                alert("❌ Não foi possível conectar ao servidor. Verifique a rede ou o endereço.");
                console.error("Erro de rede:", error);
            } finally {
                // Garante que o botão seja reabilitado, mesmo em caso de falha de rede ou servidor.
                if (submitButton) submitButton.disabled = false; 
            }

        } else {
            // Se o formulário não for válido
            alert("❌ Por favor, corrija os erros no formulário antes de enviar.");
            // O foco deve ir para o primeiro campo inválido para guiar o usuário
            if (!isNomeValid) nomeInput.focus();
            else if (!isEmailValid) emailInput.focus();
            else if (!isTelefoneValid) telefoneInput.focus();
            else if (!isSenhaValid) senhaInput.focus();
        }
    })
})
