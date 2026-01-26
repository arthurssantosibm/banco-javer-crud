from fastapi import APIRouter, HTTPException, Depends
import mysql.connector
import httpx
from mysql.connector import Error
from models.core.db_javer import get_connection
from models.core.security import bcrypt_context
from schemas.schemas import LoginSchema, UpdateUserSchema, CriarConta, TransacaoCreate, DepositoRequest, DepositoResponse, ReativarSchema, SaqueRequest, SaqueResponse, HomeSchema, InvestRegisterSchema, ComprarAtivoSchema
from api.jwt import create_access_token, get_current_user_id
from decimal import Decimal
import yfinance as yf
import re


auth_router = APIRouter(prefix="/auth", tags=["auth"])
user_router = APIRouter(prefix="/user", tags=["user"])
transacoes_router = APIRouter(prefix="/transacoes", tags=["transacoes"])
deposit_router = APIRouter(prefix="/depositos", tags=["depositos"])
saque_router = APIRouter(prefix="/saques", tags=["saques"])
buscar_ativos = APIRouter(prefix="/ativos", tags=["ativos"])
invest_router = APIRouter(prefix="/invest", tags=["invest"])

DATA_API_URL = "http://127.0.0.1:8001"
INTERNAL_KEY = "INTERNAL_SECRET"
BCRYPT_MAX_BYTES = 72


# BLOCO CADASTRO
async def insert_usuario(data: dict):
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{DATA_API_URL}/usuarios",
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
@auth_router.post("/login")
async def login(data: LoginSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://127.0.0.1:8001/loginUsuarios",
            json=data.dict(),
            headers={"X-Internal-Key": "INTERNAL_SECRET"}
        )

    if response.status_code == 403:
        raise HTTPException(status_code=403, detail="CONTA_INATIVA")

    user = response.json()

    if not bcrypt_context.verify(data.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")


    token = create_access_token({"sub": str(user["id"])})
    return {"access_token": token}

# BLOCO USUÁRIO E ATUALIZAÇÃO
@user_router.get("/user", response_model=HomeSchema)
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
        async with httpx.AsyncClient(timeout=60.0) as client:
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

        payload = {}

        if data.nome is not None:
            payload["nome"] = data.nome

        if data.email is not None:
            payload["email"] = data.email

        if data.telefone is not None:
            payload["telefone"] = data.telefone

        if nova_senha_hash is not None:
            payload["senha"] = nova_senha_hash


        await update_user_data_api(user_id, payload)

        return {"message": "Usuário atualizado com sucesso"}

    finally:
        cursor.close()
        conn.close()
               
# BLOCO TRANSAÇÕES
async def executar_transacao_data_api(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
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
async def listar_transacoes(current_user_id: int = Depends(get_current_user_id)):
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
               
# BLOCO DEPÓSITOS
@deposit_router.post("/", response_model=DepositoResponse)
async def realizar_deposito(
    data: DepositoRequest,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 🔹 Buscar email do usuário autenticado
        cursor.execute(
            "SELECT email FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado"
            )

        # 🔹 Payload para a Data API (porta 8001)
        data_api_payload = {
            "email": user["email"],
            "valor": data.valor
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{DATA_API_URL}/deposito",
                json=data_api_payload,
                headers={
                    "X-Internal-Key": INTERNAL_KEY
                }
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Erro na Data API: {response.text}"
            )

        saldo_atualizado = response.json().get("saldo_atual")

        return DepositoResponse(
            saldo_atual=saldo_atualizado,
            mensagem="Depósito realizado com sucesso"
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout ao comunicar com a Data API"
        )

    finally:
        cursor.close()
        conn.close()

# BLOCO SUSPENDER
@user_router.put("/suspender")
async def suspender_conta(user_id: int = Depends(get_current_user_id)):
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.put(
            f"{DATA_API_URL}/updateUsuarios/suspender/{user_id}",
            headers={"X-Internal-Key": INTERNAL_KEY}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# BLOCO REATIVAR
@user_router.put("/reativar")
async def reativar_conta(data: ReativarSchema):
    email = data.email.strip().lower()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.put(
            f"{DATA_API_URL}/updateUsuarios/reativar_por_email/",
            json={"email": email},
            headers={
                "X-Internal-Key": INTERNAL_KEY,
                "Content-Type": "application/json"
            }
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    return response.json()


# BLOCO DEPÓSITOS
@saque_router.post("/", response_model=SaqueResponse)
async def realizar_saque(
    data: SaqueRequest,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT email FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Usuário não encontrado"
            )

        data_api_payload = {
            "email": user["email"],
            "valor": data.valor
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{DATA_API_URL}/saque",
                json=data_api_payload,
                headers={
                    "X-Internal-Key": INTERNAL_KEY
                }
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Erro na Data API: {response.text}"
            )

        saldo_atualizado = response.json().get("saldo_atual")

        return SaqueResponse(
            saldo_atual=saldo_atualizado,
            mensagem="Saque realizado com sucesso"
        )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Timeout ao comunicar com a Data API"
        )

    finally:
        cursor.close()
        conn.close()


# BLOCO DE INVESTIMENTOS
@buscar_ativos.get("/{ticker}")
async def buscar_ativo(ticker: str):
    try:
        ticker = ticker.upper().strip()
        ativo = yf.Ticker(ticker)

        hist = ativo.history(period="max", interval="1d")

        if hist.empty:
            raise HTTPException(status_code=404, detail="Ativo não encontrado")

        historico_grafico = {
            "datas": hist.index.strftime("%Y-%m-%d").tolist(),
            "precos": [float(v) for v in hist["Close"].round(2).tolist()]
        }

        ultimo_fechamento = float(hist["Close"].iloc[-1])
        fechamento_anterior = (
            float(hist["Close"].iloc[-2])
            if len(hist) > 1
            else ultimo_fechamento
        )

        variacao = round(
            ((ultimo_fechamento - fechamento_anterior) / fechamento_anterior) * 100,
            2
        )

        info = ativo.info or {}

        return {
            "ticker": ticker,
            "nome": info.get("longName") or info.get("shortName") or "Nome indisponível",
            "preco": round(ultimo_fechamento, 2),
            "variacao": variacao,
            "historico": historico_grafico
        }

    except HTTPException:
        raise
    except Exception as e:
        print("ERRO buscar_ativo:", e)
        raise HTTPException(status_code=500, detail="Erro ao buscar histórico")



@invest_router.get("/verify")
async def verify_investor(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT email FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        cursor.execute(
            "SELECT id FROM invest_client WHERE email = %s",
            (user["email"],)
        )
        invest = cursor.fetchone()

        return {
            "is_investor": bool(invest)
        }

    finally:
        cursor.close()
        conn.close()

@invest_router.post("/register")
async def register_investor(
    data: InvestRegisterSchema,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, email FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        cursor.execute(
            "SELECT id FROM invest_client WHERE email = %s",
            (user["email"],)
        )
        exists = cursor.fetchone()

        if exists:
            raise HTTPException(
                status_code=400,
                detail="Usuário já é investidor"
            )

        cursor.execute(
            """
            INSERT INTO invest_client
            (client_id, email, perfil_investidor, patrimonio_total)
            VALUES (%s, %s, %s, 0)
            """,
            (
                user["id"],
                user["email"],
                data.perfil_investidor.upper()
            )
        )

        conn.commit()

        return {"message": "Perfil investidor registrado com sucesso"}

    finally:
        cursor.close()
        conn.close()


def identificar_tipo_ativo(ticker: str) -> str:
    ticker = ticker.upper()

    if ticker.endswith("-USD") or ticker.endswith("BRL") or ticker in {
        "BTC", "ETH", "SOL", "USDT"
    }:
        return "cripto"

    units_acoes = {
        "SULA11", "SANB11", "SAPR11", "KLBN11", "TAEE11",
        "PINE11", "ALUP11", "BPAC11", "ENGI11", "TIET11"
    }

    if re.match(r"^[A-Z]{4}11$", ticker):
        return "acoes" if ticker in units_acoes else "fundo"

    if re.match(r"^[A-Z]{4}[3456]$", ticker):
        return "acoes"

    if re.match(r"^[A-Z]{4}(34|35|39)$", ticker):
        return "acoes"

    return "outros"


@invest_router.post("/buy")
async def comprar_ativo(
    data: ComprarAtivoSchema,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT id, email, saldo_cc FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"http://127.0.0.1:8000/ativos/{data.ticker}"
            )

        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="Ativo inválido")

        ativo = res.json()

        preco_unitario = Decimal(str(ativo["preco"]))
        quantidade = Decimal(str(data.quantidade))
        valor_total = preco_unitario * quantidade

        if user["saldo_cc"] < valor_total:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")

        tipo_ativo = identificar_tipo_ativo(data.ticker)

        novo_saldo = user["saldo_cc"] - valor_total

        cursor.execute(
            "UPDATE usuarios SET saldo_cc = %s WHERE id = %s",
            (novo_saldo, user_id)
        )
        conn.commit()

        payload = {
            "client_id": user["id"],
            "email": user["email"],
            "nome_ativo": ativo["nome"],
            "tipo_ativo": tipo_ativo,
            "quantidade": int(data.quantidade),
            "preco_unitario": float(preco_unitario),
            "valor_investido": float(valor_total),
            "valor_atual": float(valor_total),
            "rentabilidade": 0.0
        }

        async with httpx.AsyncClient() as client:
            res = await client.post(
                "http://127.0.0.1:8001/invest/create",
                headers={"X-Internal-Key": INTERNAL_KEY},
                json=payload
            )

        if res.status_code != 201:
            raise HTTPException(
                status_code=500,
                detail="Erro ao registrar transação"
            )

        return {
            "message": "Ativo comprado com sucesso",
            "valor_pago": float(round(valor_total, 2)),
            "saldo_restante": float(round(novo_saldo, 2))
        }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@invest_router.get("/patrimony")
async def get_patrimony(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # saldo do usuário
        cursor.execute(
            "SELECT saldo_cc FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        saldo = user["saldo_cc"] or 0

        # soma dos ativos
        cursor.execute(
            """
            SELECT COALESCE(SUM(valor_atual), 0) AS total_ativos
            FROM financial_transactions
            WHERE client_id = %s
            """,
            (user_id,)
        )
        ativos = cursor.fetchone()

        total_ativos = ativos["total_ativos"] or 0

        patrimonio_total = saldo + total_ativos

        return {
            "saldo": float(saldo),
            "total_ativos": float(total_ativos),
            "patrimonio_total": float(patrimonio_total)
        }

    finally:
        cursor.close()
        conn.close()
