document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("access_token")

    if (!token) {
        window.location.href = "login.html"
        return
    }

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    let user;
    let saldo = 0

    async function carregarDadosUsuario() {
        try {
            const res = await fetch("http://127.0.0.1:8000/user/user", { headers })

            if (!res.ok) throw new Error("Erro ao buscar dados")

            user = await res.json()

            saldo = Number(user.saldo_cc) || 0

            document.getElementById("client-name").textContent = `Olá, ${user.nome}`

            document.getElementById("saldo-disponivel").textContent =
                saldo.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                })

        } catch (err) {
            console.error("Erro ao carregar usuário", err)
        }
    }


    await carregarDadosUsuario()

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

    document.querySelector(".logout").addEventListener("click", (e) => {
        e.preventDefault()
        localStorage.removeItem("access_token")
        window.location.href = "login.html"
    })
})

function dispararAlerta() {
    Swal.fire({
        title: '<span style="color:#000;font-weight:800;font-size:28px">BankPY</span>',
        html: `<div style="padding:10px">
                <p style="font-size:1.1rem;color:#333;margin-bottom:20px">
                    Bem-vindo(a) à sua conta digital.
                </p>
                <div style="background:#f8f9fa;border-radius:12px;padding:15px;border-left:5px solid #04b197;text-align:left">
                    <div style="margin-bottom:8px">
                        <strong style="color:#1F1300">Versão:</strong> 
                        <span style="color:#666">1.2.1</span>
                    </div>
                    <div style="font-size:0.85rem;line-height:1.4;color:#888">
                        All rights reserved to <br>
                        <strong style="color:#1F1300">Arthur Santana dos Santos ©</strong>
                    </div>
                </div>
               </div>`,
        icon: "info",
        iconColor: "#04b197",
        confirmButtonText: "ACESSAR CONTA",
        confirmButtonColor: "#04b197",
        background: "#ffffff",
        color: "#000000",
        padding: "2em",
        width: "400px",
        showClass: { popup: "animate__animated animate__fadeInUp animate__faster" },
        hideClass: { popup: "animate__animated animate__fadeOutDown animate__faster" },
        customClass: { confirmButton: 'botao-confirmar-estilizado', title: 'titulo-customizado' }
    })
}
