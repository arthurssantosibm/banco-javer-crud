from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class LoginSchema(BaseModel, extra="ignore"):
    email: EmailStr
    senha: str


class ReativarSchema(BaseModel):
    email: EmailStr
    
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

class DepositoRequest(BaseModel):
    valor: float = Field(..., gt=0, description="Valor do depósito")
    
class DepositoResponse(BaseModel):
    saldo_atual: float
    mensagem: str