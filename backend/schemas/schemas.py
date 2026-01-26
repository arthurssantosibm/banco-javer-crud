from pydantic import BaseModel, EmailStr, Field, PositiveFloat
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

class SaqueRequest(BaseModel):
    valor: float = Field(..., gt=0, description="Valor do depósito")
    
class SaqueResponse(BaseModel):
    saldo_atual: float
    mensagem: str

class InvestRegisterSchema(BaseModel):
    perfil_investidor: str
    
class ComprarAtivoSchema(BaseModel):
    ticker: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Ticker do ativo (ex: BTC, PETR4, MXRF11)"
    )

    quantidade: PositiveFloat = Field(
        ...,
        description="Quantidade de cotas/unidades que o usuário deseja comprar"
    )