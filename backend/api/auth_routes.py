from fastapi import APIRouter, HTTPException, Depends
import mysql.connector
from mysql.connector import Error
from models.core.db_javer import get_connection
from models.core.security import bcrypt_context
from schemas.schemas import LoginSchema, HomeSchema
from api.jwt import create_access_token, get_current_user_id

auth_router = APIRouter(prefix="/auth", tags=["auth"])
user_router = APIRouter(prefix="/user", tags=["user"])

BCRYPT_MAX_BYTES = 72

@auth_router.post("/criar_conta")
async def criar_conta(nome: str, email: str, senha: str, telefone: str):
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
