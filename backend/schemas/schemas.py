from pydantic import BaseModel, EmailStr, Field, PositiveFloat, field_validator
from datetime import datetime
from typing import Optional
from decimal import Decimal

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

    quantidade: Decimal = Field(
        ...,
        gt=0,
        description="Quantidade de cotas/unidades a comprar"
    )

    @field_validator("ticker")
    @classmethod
    def normalizar_ticker(cls, v: str) -> str:
        return v.strip().upper()

class UpdateInvestType(BaseModel):
    perfil_investidor: str = Field(..., min_length=3, max_length=20)
    
class VenderAtivoSchema(BaseModel):
    ticker: str
    quantidade: Decimal
