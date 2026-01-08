Guia de Funcionamento da API (FastAPI) no projeto do Banco Javer

O framework FastAPI foi utilizado para lidar com a inicialização e roteamento das requisições, foi escolhido pela sua velocidade e por realizar as requisições de forma assíncrona.

OBS.: Inicializar o banco de dados antes da API é o ideal
      verificar se TODOS os pacotes estão instalados onde a (venv) roda

1. from fastapi import FastAPI
   app = FastAPI()

   essa linha representa a instancia principal do meu codigo, onde a variavel 'app' irá funcionar com um servidor ASGI (uvicorn)

2. app.include_router(auth_router)
   incluindo um roteamento modular usando 'from api.auth_routes import auth_router' onde eu defino o prefixo para realizar os testes de cada rota na documentacao do fastapi 
   (http://127.0.0.1:8000/docs)