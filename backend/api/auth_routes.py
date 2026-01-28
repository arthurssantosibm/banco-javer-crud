from fastapi import APIRouter, HTTPException, Depends
import mysql.connector
import httpx
from mysql.connector import Error
from models.core.db_javer import get_connection
from models.core.security import bcrypt_context
from schemas.schemas import LoginSchema, UpdateUserSchema, CriarConta, TransacaoCreate, DepositoRequest, DepositoResponse, ReativarSchema, SaqueRequest, SaqueResponse, HomeSchema, InvestRegisterSchema, ComprarAtivoSchema, UpdateInvestType
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
    import pandas as pd
    import numpy as np
    import yfinance as yf

    try:
        ticker = ticker.upper().strip()
        ativo = yf.Ticker(ticker)
        # Info geral
        info = ativo.info if isinstance(ativo.info, dict) else {}

        # Histórico completo
        hist = ativo.history(period="max", interval="1d")
        if hist.empty:
            raise HTTPException(status_code=404, detail="Ativo não encontrado")

        # Preparar gráfico
        historico_grafico = {
            "datas": hist.index.strftime("%Y-%m-%d").tolist(),
            "precos": [float(v) for v in hist["Close"].round(2).tolist()]
        }

        # Último preço
        ultimo_fechamento = float(hist["Close"].iloc[-1])
        preco_atual_usd = float(hist["Close"].iloc[-1])
        
        currency = info.get("currency", "USD")
        preco_original = ultimo_fechamento
        taxa_cambio = 1.0
        
        if currency != "BRL":
            try:
                par_moeda = f"{currency}BRL=X"
                fx = yf.Ticker(par_moeda)
                fx_hist = fx.history(period="1d")
                
                if not fx_hist.empty:
                    taxa_cambio = float(fx_hist["Close"].iloc[-1])
                    ultimo_fechamento = preco_original * taxa_cambio
            except Exception:
                pass
        
        

        fechamento_anterior = (
            float(hist["Close"].iloc[-2])
            if len(hist) > 1
            else ultimo_fechamento
        )
        preco_anterior_usd = (
            float(hist["Close"].iloc[-2])
            if len(hist) > 1
            else ultimo_fechamento
        )
        
        preco_atual = preco_atual_usd * taxa_cambio
        preco_anterior = preco_anterior_usd * taxa_cambio

        variacao = round(
            ((preco_atual_usd - preco_anterior_usd) / preco_anterior_usd) * 100,
            2
        )

        


        # ==============================
        # 1. D I V I D E N D O S
        # ==============================
        dividend_yield = None
        dividendos_anuais = {}
        payout = None
        dividendos = ativo.dividends

        if dividendos is not None and not dividendos.empty:
            dividendos.index = dividendos.index.tz_localize(None)
            
            ult_12m = dividendos[dividendos.index >= (pd.Timestamp.today() - pd.Timedelta(days=365))]
            total_12m = ult_12m.sum()

            if total_12m and ultimo_fechamento:
                dividend_yield = float((total_12m / ultimo_fechamento) * 100)

            dividendos_anuais = (
                dividendos.groupby(dividendos.index.year).sum().to_dict()
            )

            earnings = None
            try:
                earnings = ativo.get_earnings()
            except Exception:
                earnings = None

            if earnings is not None and not earnings.empty:
                try:
                    lucro = earnings.iloc[-1].get("Earnings")
                    if lucro and lucro > 0:
                        div_ano = dividendos[
                            dividendos.index.year == earnings.index[-1]
                        ].sum()
                        payout = float(div_ano / lucro)
                except Exception:
                    payout = None


        # ==============================
        # 2. I N D I C A D O R E S
        # ==============================
        indicadores = {
            "pe_ratio": info.get("forwardPE") or info.get("trailingPE"),
            "eps": info.get("trailingEps"),
            "beta": info.get("beta"),
            "market_cap": info.get("marketCap"),
            "industry": info.get("industry"),
            "roe": info.get("returnOnEquity")
        }


        # ==============================
        # 3. B E N C H M A R K  (IBOV)
        # ==============================
        retorno_ativo_12m = None
        retorno_bench_12m = None
        correlacao = None
        beta_calc = None

        try:
            hist_ativo_12m = ativo.history(period="1y")
            hist_bench_12m = yf.Ticker("^BVSP").history(period="1y")

            if not hist_ativo_12m.empty and not hist_bench_12m.empty:
                retorno_ativo_12m = float(
                    (hist_ativo_12m["Close"].iloc[-1] / hist_ativo_12m["Close"].iloc[0] - 1) * 100
                )
                retorno_bench_12m = float(
                    (hist_bench_12m["Close"].iloc[-1] / hist_bench_12m["Close"].iloc[0] - 1) * 100
                )

                df_join = (
                    hist_ativo_12m["Close"].pct_change()
                    .rename("ativo")
                    .to_frame()
                    .join(
                        hist_bench_12m["Close"].pct_change().rename("benchmark"),
                        how="inner"
                    )
                    .dropna()
                )

                if not df_join.empty:
                    correlacao = float(df_join["ativo"].corr(df_join["benchmark"]))

                    cov = np.cov(df_join["ativo"], df_join["benchmark"])[0][1]
                    var_bench = np.var(df_join["benchmark"])
                    beta_calc = float(cov / var_bench) if var_bench else None

        except Exception:
            pass

        # ==============================
        # R E T O R N O   F I N A L
        # ==============================
        return {
            "ticker": ticker,
            "nome": info.get("longName") or info.get("shortName") or "Nome indisponível",
            "preco": round(ultimo_fechamento, 2),
            "variacao": variacao,
            "historico": historico_grafico,

            "dividendos": {
                "dividend_yield_12m": dividend_yield,
                "dividendos_anuais": dividendos_anuais,
                "payout": payout
            },

            "indicadores": indicadores,

            "benchmark": {
                "indice": "IBOV",
                "retorno_ativo_12m": retorno_ativo_12m,
                "retorno_bench_12m": retorno_bench_12m,
                "correlacao": correlacao,
                "beta_calculado": beta_calc
            }
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

    # Criptos
    if ticker in {"BTC", "ETH", "SOL", "BNB"} or ticker.endswith("-USD"):
        return "cripto"

    # Fundos Imobiliários (B3)
    if ticker.endswith("11"):
        return "fii"

    # Renda fixa (exemplo interno)
    if ticker.endswith("11.SA"):
        return "renda_fixa"

    # Ações
    return "acao"


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
            "ticker": data.ticker.upper(),          
            "nome_ativo": ativo["nome"],
            "tipo_ativo": tipo_ativo,
            "quantidade": float(quantidade),
            "valor_investido": float(valor_total),
            "valor_atual": float(preco_unitario),  
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
    import yfinance as yf
    from decimal import Decimal

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 🔹 Buscar saldo da conta corrente
        cursor.execute(
            "SELECT saldo_cc FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        saldo = Decimal(user["saldo_cc"] or 0)

        # 🔹 Buscar ativos do usuário
        cursor.execute(
            """
            SELECT ticker, valor_investido, valor_atual
            FROM financial_transactions
            WHERE client_id = %s
            """,
            (user_id,)
        )
        ativos = cursor.fetchall()
        total_ativos = Decimal("0")

        for ativo in ativos:
            ticker = (ativo.get("ticker") or "").strip().upper()
            if not ticker:
                continue

            try:
                yf_ativo = yf.Ticker(ticker)
                hist = yf_ativo.history(period="1d")
                info = yf_ativo.info if isinstance(yf_ativo.info, dict) else {}

                if hist.empty:
                    continue

                # 🔹 Determinar moeda e taxa de câmbio
                currency = info.get("currency", "USD")
                taxa_cambio = Decimal("1")

                if currency != "BRL":
                    try:
                        fx = yf.Ticker(f"{currency}BRL=X")
                        fx_hist = fx.history(period="1d")
                        if not fx_hist.empty:
                            taxa_cambio = Decimal(str(fx_hist["Close"].iloc[-1]))
                    except Exception:
                        pass

                # 🔹 Preço atual convertido para BRL
                preco_hoje = Decimal(str(hist["Close"].iloc[-1])) * taxa_cambio

                # 🔹 Preço de compra salvo no banco
                preco_compra = Decimal(str(ativo["valor_atual"]))
                valor_investido = Decimal(str(ativo["valor_investido"]))

                if preco_compra <= 0:
                    continue

                # 🔹 Calcular valorização e valor atualizado
                fator = preco_hoje / preco_compra
                valor_atualizado = valor_investido * fator

                total_ativos += valor_atualizado

            except Exception as e:
                # Se algum ativo falhar, continua com os outros
                print(f"Erro ao processar {ticker}: {e}")
                continue

        patrimonio_total = saldo + total_ativos

        return {
            "saldo": float(round(saldo, 2)),
            "total_ativos": float(round(total_ativos, 2)),
            "patrimonio_total": float(round(patrimonio_total, 2))
        }

    finally:
        cursor.close()
        conn.close()


@invest_router.put("/perfil-investidor")
async def atualizar_perfil_investidor(
    data: UpdateInvestType,
    user_id: int = Depends(get_current_user_id)
):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            UPDATE invest_client
            SET perfil_investidor = %s
            WHERE client_id = %s
            """,
            (data.perfil_investidor, user_id)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Usuário não possui perfil de investidor"
            )

        conn.commit()

        return {
            "message": "Perfil de investidor atualizado com sucesso",
            "perfil_investidor": data.perfil_investidor
        }

    except Exception as e:
        conn.rollback()
        print("ERRO PERFIL INVESTIDOR:", e)
        raise HTTPException(status_code=500, detail="Erro ao atualizar perfil")

    finally:
        cursor.close()
        conn.close()

@invest_router.get("/carteira")
async def listar_carteira(user_id: int = Depends(get_current_user_id)):
    import yfinance as yf
    from decimal import Decimal

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT 
                nome_ativo,
                ticker,
                tipo_ativo,
                valor_atual,
                valor_investido,
                quantidade,
                data_aplicacao
            FROM financial_transactions
            WHERE client_id = %s
        """, (user_id,))

        ativos = cursor.fetchall()

        for ativo in ativos:
            ticker = (ativo["ticker"] or "").strip().upper()
            if not ticker:
                ativo["preco_atual"] = None
                ativo["valor_atualizado"] = None
                ativo["rentabilidade_pct"] = None
                continue

            try:
                yf_ativo = yf.Ticker(ticker)
                hist = yf_ativo.history(period="1d")
                info = yf_ativo.info if isinstance(yf_ativo.info, dict) else {}

                if hist.empty:
                    ativo["preco_atual"] = None
                    ativo["valor_atualizado"] = None
                    ativo["rentabilidade_pct"] = None
                    continue

                # 🔹 Moeda e taxa de câmbio
                currency = info.get("currency", "USD")
                taxa_cambio = Decimal("1")

                if currency != "BRL":
                    try:
                        fx = yf.Ticker(f"{currency}BRL=X")
                        fx_hist = fx.history(period="1d")
                        if not fx_hist.empty:
                            taxa_cambio = Decimal(str(fx_hist["Close"].iloc[-1]))
                    except Exception:
                        pass

                # 🔹 Preço atual convertido
                preco_atual = Decimal(str(hist["Close"].iloc[-1])) * taxa_cambio

                # 🔹 Preço de compra e valor investido
                preco_compra = Decimal(str(ativo["valor_atual"]))
                valor_investido = Decimal(str(ativo["valor_investido"]))

                if preco_compra <= 0:
                    ativo["preco_atual"] = round(float(preco_atual), 2)
                    ativo["valor_atualizado"] = None
                    ativo["rentabilidade_pct"] = None
                    continue

                # 🔹 Valor atualizado e rentabilidade %
                valor_atualizado = valor_investido * (preco_atual / preco_compra)
                rentabilidade_pct = ((preco_atual / preco_compra - 1) * 100)

                ativo["preco_atual"] = round(float(preco_atual), 2)
                ativo["valor_atualizado"] = round(float(valor_atualizado), 2)
                ativo["rentabilidade_pct"] = round(float(rentabilidade_pct), 2)

            except Exception as e:
                print(f"Erro ao processar {ticker}: {e}")
                ativo["preco_atual"] = None
                ativo["valor_atualizado"] = None
                ativo["rentabilidade_pct"] = None

        return ativos

    finally:
        cursor.close()
        conn.close()

@invest_router.get("/projecao-patrimonio")
async def projecao_patrimonio(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1️⃣ Soma apenas renda fixa
        cursor.execute("""
            SELECT COALESCE(SUM(ft.valor_investido), 0) AS total_renda_fixa, ic.perfil_investidor FROM invest_client ic LEFT JOIN financial_transactions ft ON ic.client_id = ft.client_id AND ft.tipo_ativo = 'renda_fixa' WHERE ic.client_id = %s GROUP BY ic.perfil_investidor
        """, (user_id,))

        row = cursor.fetchone()

        total_renda_fixa = float(row["total_renda_fixa"] or 0)
        perfil = row["perfil_investidor"]


        # 3️⃣ Projeções
        projecoes = {
            "CONSERVADOR": round(total_renda_fixa * 0.08, 2),
            "MODERADO": round(total_renda_fixa * 0.12, 2),
            "ARROJADO": round(total_renda_fixa * 0.18, 2),
        }

        return {
            "total_renda_fixa": float(total_renda_fixa),
            "perfil_usuario": perfil,
            "projecoes": projecoes
        }

    finally:
        cursor.close()
        conn.close()
