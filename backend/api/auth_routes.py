from fastapi import APIRouter, HTTPException, Depends
import mysql.connector
import httpx
from mysql.connector import Error
from models.core.db_javer import get_connection
from models.core.security import bcrypt_context
from schemas.schemas import LoginSchema, UpdateUserSchema, CriarConta, TransacaoCreate
from api.jwt import create_access_token, get_current_user_id


auth_router = APIRouter(prefix="/auth", tags=["auth"])
user_router = APIRouter(prefix="/user", tags=["user"])
transacoes_router = APIRouter(prefix="/transacoes", tags=["transacoes"])

DATA_API_URL = "http://127.0.0.1:8001"
INTERNAL_KEY = "INTERNAL_SECRET"
BCRYPT_MAX_BYTES = 72


# BLOCO CADASTRO
async def insert_usuario(data: dict):
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{DATA_API_URL}/loginUsuarios",
            json=data,
            headers={
                "X-Internal-Key": INTERNAL_KEY
            }
        )
        response.raise_for_status()

@auth_router.post("/criar_conta")
async def criar_conta(data: CriarConta):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT email, telefone
            FROM usuarios
            WHERE email = %s OR telefone = %s
            """,
            (data.email, data.telefone)
        )

        rows = cursor.fetchall()

        for row in rows:
            if row["email"] == data.email and row["telefone"] == data.telefone:
                msg = "Email e telefone já cadastrados"
            elif row["email"] == data.email:
                msg = "Email já cadastrado"
            else:
                msg = "Telefone já cadastrado"

            raise HTTPException(status_code=400, detail=msg)

        password_bytes = data.senha.encode("utf-8")
        password_to_hash = password_bytes[:BCRYPT_MAX_BYTES]

        senha_hash = bcrypt_context.hash(password_to_hash)

        await insert_usuario({
            "nome": data.nome,
            "email": data.email,
            "telefone": data.telefone,
            "senha": senha_hash
        })

        return {"mensagem": "Conta criada com sucesso!"}

    except httpx.HTTPError:
        raise HTTPException(
            status_code=500,
            detail="Erro ao salvar usuário"
        )

    finally:
        cursor.close()
        conn.close()





# BLOCO LOGIN
async def login_usuario(email: str):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{DATA_API_URL}/loginUsuarios",
                json={"email": email},
                headers={
                    "X-Internal-Key": INTERNAL_KEY
                }
            )

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="API indisponível"
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout ao conectar com API"
        )

    if response.status_code == 404:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if response.status_code == 422:
        raise HTTPException(status_code=400, detail="Dados inválidos")

    if response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Erro interno da API")

    return response.json()

@auth_router.post("/login")
async def login(data: LoginSchema):
    user = await login_usuario(data.email)

    if not bcrypt_context.verify(data.senha, user["senha"]):
        raise HTTPException(
            status_code=401,
            detail="Credenciais inválidas"
        )

    token = create_access_token(
        data={"sub": str(user["id"])}
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }




# BLOCO USUÁRIO E ATUALIZAÇÃO
@user_router.get("/user")
async def get_user(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            """
            SELECT id, nome, email, telefone, saldo_cc, correntista
            FROM usuarios
            WHERE id = %s
            """,
            (user_id,))

        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        return user

    finally:
        cursor.close()
        conn.close()

async def update_user_data_api(user_id: int, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.put(
                f"{DATA_API_URL}/updateUsuarios/{user_id}",
                json=payload,
                headers={
                    "X-Internal-Key": INTERNAL_KEY
                }
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Erro na Data API: {response.text}"
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout ao comunicar com a Data API"
        )

@user_router.put("/update_user")
async def update_user(
    data: UpdateUserSchema,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT senha FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        senha_hash_atual = user["senha"]
        nova_senha_hash = None

        if data.new_password:
            if not data.current_password:
                raise HTTPException(
                    status_code=400,
                    detail="Senha atual obrigatória"
                )

            if not bcrypt_context.verify(
                data.current_password,
                senha_hash_atual
            ):
                raise HTTPException(
                    status_code=401,
                    detail="Senha atual incorreta"
                )

            nova_senha_hash = bcrypt_context.hash(data.new_password)

        payload = {
            "nome": data.nome,
            "email": data.email,
            "telefone": data.telefone,
            "senha": nova_senha_hash
        }

        await update_user_data_api(user_id, payload)

        return {"message": "Usuário atualizado com sucesso"}

    finally:
        cursor.close()
        conn.close()
        
        
        
        
        
# BLOCO TRANSAÇÕES
async def executar_transacao_data_api(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{DATA_API_URL}/transacoesUsuarios",
                json=payload,
                headers={
                    "X-Internal-Key": INTERNAL_KEY
                }
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Erro na Data API: {response.text}"
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout ao comunicar com a Data API"
        )


@transacoes_router.post("/transacoes")
async def criar_transacao(
    data: TransacaoCreate,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 🔹 Usuário origem
        cursor.execute(
            "SELECT email, saldo_cc FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user_origin = cursor.fetchone()

        if not user_origin:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        if data.valor <= 0:
            raise HTTPException(status_code=400, detail="Valor inválido")

        if user_origin["saldo_cc"] < data.valor:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")

        # 🔹 Usuário destino
        cursor.execute(
            "SELECT id FROM usuarios WHERE email = %s",
            (data.email_destination,)
        )
        user_dest = cursor.fetchone()

        if not user_dest:
            raise HTTPException(
                status_code=404,
                detail="Usuário de destino não encontrado"
            )

        # 🔹 Payload INTERNO (Core → Data API)
        payload = {
            "email_origin": user_origin["email"],
            "user_origin_id": user_id,
            "email_destination": data.email_destination,
            "valor": data.valor,
            "mensagem": data.mensagem,
        }

        await executar_transacao_data_api(payload)

        return {"message": "Transação realizada com sucesso"}

    finally:
        cursor.close()
        conn.close()

@transacoes_router.get("/listar_transacoes")
def listar_transacoes(current_user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT email FROM usuarios WHERE id = %s",
            (current_user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        email = user["email"]

        cursor.execute(
            """
            SELECT 
                id,
                email_origin,
                email_destination,
                valor,
                mensagem,
                create_time
            FROM transacoes
            WHERE email_origin = %s OR email_destination = %s
            ORDER BY create_time DESC
            """,
            (email, email)
        )

        transacoes = cursor.fetchall()
        return transacoes

    finally:
        cursor.close()
        conn.close()