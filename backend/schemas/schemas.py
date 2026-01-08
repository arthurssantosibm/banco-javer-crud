from pydantic import BaseModel, EmailStr

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