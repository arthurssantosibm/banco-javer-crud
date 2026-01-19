document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    let user;

    async function carregarDadosUsuario() {
        try {
            const res = await fetch("http://127.0.0.1:8000/user/user", { headers });
            
            if (!res.ok) throw new Error("Erro ao buscar dados");

            user = await res.json();
            const saldo = Number(user.saldo_cc) || 0;

            document.getElementById("client-name").textContent = `Olá, ${user.nome}`;
        
            document.getElementById("saldo-atual").textContent =
                saldo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                })

        } catch (err) {
            console.error("Erro ao carregar usuário", err);
        }
    }

    // Chamada inicial
    await carregarDadosUsuario();

    document.getElementById("transferForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!user) {
            Swal.fire("Erro", "Não foi possível identificar o usuário originário.", "error");
            return;
        }

        const transferButton = document.getElementById("transfBtn");
        transferButton.innerText = "Transferindo...";
        transferButton.disabled = true;

        const emailDestino = document.getElementById("emailDestino").value;
        const valor = parseFloat(document.getElementById("valorTransferencia").value);
        const mensagem = document.getElementById("mensagem").value;

        try {
            const response = await fetch("http://127.0.0.1:8000/transacoes/transacoes", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    email_origin: user.email,
                    email_destination: emailDestino,
                    valor,
                    mensagem
                })
            });

            const data = await response.json();

            if (!response.ok) {
                Swal.fire({
                    icon: "error",
                    title: "Erro na transferência",
                    text: data.detail || "Erro ao realizar transferência",
                    confirmButtonColor: "#CC5803"
                });
                return;
            }

            Swal.fire({
                icon: "success",
                title: "Transferência concluída",
                text: "Transferência realizada com sucesso!",
                confirmButtonColor: "#47d998"
            }).then(() => {
                document.getElementById("transferForm").reset();

                carregarDadosUsuario(); 
                carregarTransacoes();
            });

        } catch (err) {
            console.error("Erro na transferência", err);
            Swal.fire("Erro", "Erro ao realizar transferência", "error");
        } finally {
            transferButton.innerText = "Transferir";
            transferButton.disabled = false;
        }
    });



    document.querySelector(".logout").addEventListener("click", (e) => {
        e.preventDefault()
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    })
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
