from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer
from sqlalchemy.orm import declarative_base

db = create_engine("databas.cc1kujauuftf.us-east-1.rds.amazonaws.com")
Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column("id", Integer, primary_key=True, autoincrement=True)
    nome = Column("nome", String)
    email = Column("email", String, nullable=False)
    senha = Column("senha", String)
    telefone = Column("telefone", String)
    correntista = Column("correntista", Boolean, default=True)
    saldo_cc = Column("saldo_cc", Float)
    
    def __init__(self, nome, email, senha, telefone, correntista, saldo_cc):
        self.nome = nome
        self.email = email
        self.senha = senha
        self.telefone = telefone
        self.correntista = correntista
        self.saldo_cc = saldo_cc