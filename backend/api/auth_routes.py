from fastapi import APIRouter, HTTPException, Depends
import mysql.connector
from mysql.connector import Error
from models.core.db_javer import get_connection
from models.core.security import bcrypt_context
from schemas.schemas import LoginSchema, UpdateUserSchema, CriarConta, TransacaoCreate
from api.jwt import create_access_token, get_current_user_id

auth_router = APIRouter(prefix="/auth", tags=["auth"])
user_router = APIRouter(prefix="/user", tags=["user"])
transacoes_router = APIRouter(prefix="/transacoes", tags=["transacoes"])

BCRYPT_MAX_BYTES = 72

@auth_router.post("/criar_conta")
async def criar_conta(data: CriarConta):
    nome = data.nome
    email = data.email
    senha = data.senha
    telefone = data.telefone
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            "SELECT id FROM usuarios WHERE email = %s",
            (email,)
        )
        
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        password_bytes = senha.encode("utf-8")
        
        if len(password_bytes) > BCRYPT_MAX_BYTES:
            password_to_hash = password_bytes[:BCRYPT_MAX_BYTES]
        else:
            password_to_hash = password_bytes
        
        senha_hash = bcrypt_context.hash(password_to_hash)
        
        cursor.execute(
            """
            INSERT INTO usuarios (nome, email, senha, telefone)
            VALUES (%s, %s, %s, %s)
            """,
            (nome, email, senha_hash, telefone)
        )
        
        conn.commit()
        return {"mensagem": "Conta criada com sucesso!"}
    
    except mysql.connector.Error as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    
    finally:
        cursor.close()
        conn.close()

@auth_router.post("/login")
async def login(data: LoginSchema):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
        "SELECT id, senha FROM usuarios WHERE email = %s",
        (data.email,))
        
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        if not bcrypt_context.verify(data.senha, user["senha"]):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")

        token = create_access_token(
            data={"sub": str(user["id"])}
        )

        return {
            "access_token": token,
            "token_type": "bearer"
        }

    finally:
        cursor.close()
        conn.close()

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

        senha_hash = user["senha"]

        if data.new_password:
            if not data.current_password:
                raise HTTPException(
                    status_code=400,
                    detail="Senha atual obrigatória"
                )

            if not bcrypt_context.verify(
                data.current_password,
                senha_hash
            ):
                raise HTTPException(
                    status_code=401,
                    detail="Senha atual incorreta"
                )

            nova_senha_hash = bcrypt_context.hash(data.new_password)

            cursor.execute(
                """
                UPDATE usuarios
                SET nome=%s, email=%s, telefone=%s, senha=%s
                WHERE id=%s
                """,
                (
                    data.nome,
                    data.email,
                    data.telefone,
                    nova_senha_hash,
                    user_id
                )
            )
        else:
            cursor.execute(
                """
                UPDATE usuarios
                SET nome=%s, email=%s, telefone=%s
                WHERE id=%s
                """,
                (
                    data.nome,
                    data.email,
                    data.telefone,
                    user_id
                )
            )

        conn.commit()
        return {"message": "Dados atualizados com sucesso"}

    finally:
        cursor.close()
        conn.close()

        
@transacoes_router.post("/transacoes")
async def criar_transacao(data: TransacaoCreate, user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT email, saldo_cc FROM usuarios WHERE id = %s",
            (user_id,)
        )
        user_origin = cursor.fetchone()

        if not user_origin:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        saldo = user_origin["saldo_cc"]
        email_origin = user_origin["email"]

        if data.valor <= 0:
            raise HTTPException(status_code=400, detail="Valor inválido")

        if saldo < data.valor:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")

        cursor.execute(
            "SELECT id FROM usuarios WHERE email = %s",
            (data.email_destination,)
        )
        user_destination = cursor.fetchone()

        if not user_destination:
            raise HTTPException(status_code=404, detail="Usuário de destino não encontrado")

        cursor.execute(
            """
            INSERT INTO transacoes 
                (email_origin, email_destination, valor, mensagem, create_time)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (
                email_origin,
                data.email_destination,
                data.valor,
                data.mensagem
            )
        )
        
        cursor.execute(
            "UPDATE usuarios SET saldo_cc = saldo_cc - %s WHERE id = %s",
            (data.valor, user_id)
        )

        cursor.execute(
            "UPDATE usuarios SET saldo_cc = saldo_cc + %s WHERE email = %s",
            (data.valor, data.email_destination)
        )

        conn.commit()

        return {"mensagem": "Transação realizada com sucesso!"}

    except mysql.connector.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Erro no banco de dados")

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