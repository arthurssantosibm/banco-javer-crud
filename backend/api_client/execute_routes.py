from fastapi import APIRouter, HTTPException
from models.core.db_javer import get_connection
from schemas.schemas import CriarConta

router = APIRouter()

@router.post("/usuarios")
async def insert_usuario(data: CriarConta):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO usuarios (nome, email, telefone, senha)
            VALUES (%s, %s, %s, %s)
            """,
            (
                data.nome,
                data.email,
                data.telefone,
                data.senha
            )
        )

        conn.commit()

        return {
            "status": "ok",
            "message": "Usuário inserido com sucesso"
        }

    except Exception:
        conn.rollback()
        raise HTTPException(
            status_code=500,
            detail="Erro ao inserir usuário"
        )

    finally:
        cursor.close()
        conn.close()
