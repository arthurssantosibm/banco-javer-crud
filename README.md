# 🏦 Banco Javer – CRUD de Clientes

LINK DO REPOSITORIO DA API 2: https://github.com/arthurssantosibm/api_client.git

Projeto desafio desenvolvido com **Python**, **FastAPI** e **AWS**, cujo objetivo é criar um **CRUD completo de clientes** para um sistema bancário fictício chamado **Banco Javer**.

A aplicação expõe uma **API REST** responsável por **cadastrar, visualizar, atualizar, suspender/reativar e gerenciar transações** de clientes, utilizando um **banco de dados MySQL hospedado na AWS**, permitindo acesso a partir de diferentes máquinas e endereços IP.

---

## 🚀 Tecnologias Utilizadas

* **Python 3.12+**
* **FastAPI** (API REST assíncrona)
* **Uvicorn** (servidor ASGI)
* **MySQL** (AWS RDS)
* **SQLAlchemy**
* **JWT (JSON Web Token)** para autenticação
* **Passlib / Bcrypt** para segurança de senhas
* **HTTPX** para comunicação entre APIs
* **AWS** (infraestrutura em nuvem)

---

## 🧠 Arquitetura do Projeto

* A aplicação é dividida em **módulos de rotas** (usuários, login, atualização, transações, depósitos).
* O FastAPI gerencia o roteamento e a documentação automática (`/docs`).
* A autenticação é feita via **JWT**, validando o usuário em rotas protegidas.
* O banco de dados MySQL roda na AWS, garantindo persistência e acesso remoto.
* As APIs se comunicam entre si utilizando **requisições HTTP internas** com chave de segurança.

---

## 📦 Pré-requisitos

Antes de iniciar o projeto, certifique-se de ter instalado:

* Python 3.12 ou superior
* MySQL (ou acesso ao RDS da AWS)
* Git
* PowerShell (Windows)

---

## ▶️ Como inicializar o projeto

### 1️⃣ Configurar permissões no PowerShell (Windows)

Abra o terminal **na raiz do projeto** e execute:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Isso garante que o ambiente virtual possa ser ativado corretamente.

---

### 2️⃣ Criar o ambiente virtual

```bash
python -m venv venv
```

---

### 3️⃣ Ativar o ambiente virtual

**Windows**

```bash
venv\Scripts\activate
```

**Linux / Mac**

```bash
source venv/bin/activate
```

---

### 4️⃣ Instalar as dependências

Com o ambiente virtual ativo:

```bash
pip install -r requirements.txt
```

> 📌 O arquivo `requirements.txt` contém todas as dependências necessárias para rodar o projeto.

---

### 5️⃣ Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as configurações do banco e da API, por exemplo:

```env
DB_HOST=seu_host_mysql
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco
SECRET_KEY=sua_chave_secreta
```

---

### 6️⃣ Executar a aplicação

```bash
uvicorn api.main:app --reload
```

Esse comando:

* Inicializa o servidor FastAPI
* Executa a aplicação a partir da variável `app`
* Mantém o servidor em modo de desenvolvimento com **auto-reload**

---

## 🌐 Acessando a API

* **Documentação interativa (Swagger):**

  ```
  http://127.0.0.1:8000/docs
  ```

---

## ✅ Funcionalidades Principais

* Cadastro de clientes
* Login com autenticação JWT
* Atualização de dados do usuário
* Suspensão e reativação de contas
* Depósitos
* Transferências entre contas
* Registro de transações financeiras

---

## 📌 Observações Importantes

* O banco de dados deve estar **ativo antes de iniciar a API**
* Verifique se todas as dependências foram instaladas corretamente no ambiente virtual
* O projeto foi desenvolvido pensando em **escalabilidade e deploy em nuvem (AWS)**

---

## 👨‍💻 Autor

Projeto desenvolvido por **Arthur Santana dos Santos**
Desafio prático de backend com Python, FastAPI e AWS.