# banco-javer-crud
Projeto desafio: criar um CRUD de cadastro de clientes utilizando Python e AWS. A ideia do projeto é realizar requisições REST para cadastrar, visualizar, atualizar e deletar informações de um Banco (banco javer).

O projeto está sendo feito na AWS também com um Banco de Dados MYSQL na nuvem da AWS para acesso em outras maquinas e IP diferente.

A aplicação irá fazer requisições via FastAPI para executar cada chamada.

Como incializar o projeto:
- Antes de qualquer coisa, abrir o terminal na raiz do projeto e executar: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass. Isso irá garantir que o ambiente virtual seja carregado sem problemas

- Instalar o pacote venv (ambiente virtual), para isso, no mesmo terminal execute: python -m venv venv

- Agora com o ambiente virtual instalado, execute no terminal a instalação dos pacotes: pip install fastapi uvicorn sqlalchemy passlib[bcrypt] python-jose[cryptography] python-dotenv python-multipart

- execute a api no terminal para subir a aplicação com: uvicorn api.main:app --reload
isso faz com que o terminal execute a variavel de ambiente 'app' da api e mantenha sempre atualizado com o '--reload'
