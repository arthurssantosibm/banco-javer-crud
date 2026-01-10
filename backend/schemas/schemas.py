from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class LoginSchema(BaseModel):
    email: EmailStr
    senha: str
    
    class Config:
        from_attributes = True
        
class HomeSchema(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    correntista: bool
    saldo_cc: float

class CriarConta(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    senha: str

class UpdateUserSchema(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class TransacaoCreate(BaseModel):
    email_destination: EmailStr
    valor: float
    mensagem: str
