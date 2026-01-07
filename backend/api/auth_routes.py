from fastapi import APIRouter, HTTPException
import mysql.connector
from mysql.connector import Error
from models.core.db_javer import get_connection
from api.main import bcrypt_context

auth_router = APIRouter(prefix="/auth", tags=["auth"])

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