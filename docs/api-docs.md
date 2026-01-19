   # 📘 Guia de Funcionamento da API (FastAPI) – Projeto Banco Javer

O projeto **Banco Javer** utiliza o framework **FastAPI** para construção de uma arquitetura de APIs REST, separadas por responsabilidade e organizadas em **duas portas diferentes**, garantindo segurança, escalabilidade e clareza no fluxo de dados.

O FastAPI foi escolhido por:

* Alta performance (ASGI)
* Suporte nativo a async/await
* Validação automática de dados com Pydantic
* Documentação automática (Swagger / OpenAPI)

---

## ⚠️ Observações Importantes

* **Inicializar o banco de dados antes de subir a API**
* Garantir que **todos os pacotes estejam instalados** no ambiente virtual (`venv`)
* As duas APIs **devem estar rodando simultaneamente**

---

## 🧠 Arquitetura Geral do Projeto

O sistema é dividido em **duas APIs independentes**, que se comunicam entre si:

| Porta    | Função                                                      |
| -------- | ----------------------------------------------------------- |
| **8000** | API CORE (Autenticação, regras de negócio, segurança, JWT)  |
| **8001** | API DATA (Banco de dados, CRUD direto, transações internas) |

Essa separação garante:

* Mais segurança (API de dados não é acessada diretamente pelo front)
* Melhor organização
* Facilidade de manutenção

---

## 🚀 Inicialização da API com FastAPI

```python
from fastapi import FastAPI

app = FastAPI()
```

Essa linha cria a **instância principal da aplicação**, onde:

* `app` atua como servidor ASGI
* Será executada pelo **Uvicorn**
* Gerencia todo o ciclo de vida da aplicação

---

## 📦 Inclusão de Rotas (Arquitetura Modular)

```python
app.include_router(auth_router)
```

O FastAPI permite dividir a aplicação em **módulos**, usando `APIRouter`.

Exemplo:

```python
from api.auth_routes import auth_router
```

Cada router:

* Possui um **prefixo**
* Agrupa rotas por responsabilidade
* Facilita testes no Swagger

📍 Documentação automática:

```
http://127.0.0.1:8000/docs
```

---

## 🔐 Autenticação e Segurança (JWT)

O sistema utiliza **JWT (JSON Web Token)** para autenticação.

### 🔑 Fluxo de Login

1. Usuário envia `email` e `senha`
2. API DATA (8001) valida credenciais no banco
3. API CORE (8000) gera um **JWT**
4. Token é retornado ao frontend
5. Token é armazenado no `localStorage`
6. Token é enviado em todas as requisições protegidas

Header padrão:

```http
Authorization: Bearer <TOKEN>
```

---

## 🧾 Estrutura do Token JWT

```json
{
  "sub": 1,
  "exp": 1700000000
}
```

* `sub` → ID do usuário
* `exp` → tempo de expiração

O token é validado automaticamente via:

```python
Depends(get_current_user_id)
```

---

## 🧍 Controle de Conta Ativa / Inativa

A tabela `usuarios` possui o campo:

```sql
correntista BOOLEAN DEFAULT 1
```

### Regras:

* `correntista = 1` → acesso liberado
* `correntista = 0` → conta suspensa

Se o usuário tentar logar com conta suspensa:

```json
{
  "detail": "CONTA_INATIVA"
}
```

O frontend exibe um alerta:

> “Parece que você inativou sua conta. Deseja ativá-la novamente?”

Se confirmado:

* API reativa a conta
* Login é concluído automaticamente

---

## 🔁 Comunicação Entre APIs (8000 ↔ 8001)

A **API CORE (8000)** se comunica com a **API DATA (8001)** usando requisições HTTP internas.

### Segurança interna

As requisições internas usam um header secreto:

```http
X-Internal-Key: INTERNAL_SECRET
```

Isso impede acesso direto externo às rotas críticas da API de dados.

---

## 💰 Fluxo de Depósito (Exemplo)

1. Front chama:

```
POST /deposit
```

2. API CORE valida token
3. API CORE chama API DATA (8001)
4. API DATA:

   * Atualiza saldo
   * Registra transação
5. Retorna saldo atualizado
6. Front atualiza UI

---

## 🔄 Fluxo de Transferência

1. Usuário envia dados da transação
2. API CORE valida:

   * Token
   * Saldo
   * Usuário destino
3. API CORE chama API DATA
4. API DATA:

   * Debita origem
   * Credita destino
   * Registra transação
5. Retorno de sucesso

---

## 🧪 Testes via Swagger (Navegador)

Após iniciar a API CORE:

```
http://127.0.0.1:8000/docs
```

Você pode:

* Testar login
* Copiar o token
* Autorizar no Swagger
* Executar rotas protegidas

---

## ▶️ Como Rodar o Projeto no Terminal

```bash
python -m venv venv
```

### 2️⃣ Ativar ambiente virtual

**Windows**

```bash
venv\Scripts\activate
```

--- Caso não de certo, rode o comando a seguir para destravar o terminal, e rode novamente a venv: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
---

### 3️⃣ Instalar dependências

```bash
pip install -r requirements.txt


```bash
cd backend
uvicorn api.main:app --reload
```