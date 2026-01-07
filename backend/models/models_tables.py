from sqlalchemy import create_engine, Column, String, Boolean, Float, Integer
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv
import os

load_dotenv(".env")
DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:"
    f"{os.getenv('DB_PORT')}/"
    f"{os.getenv('DB_NAME')}"
)
print("DB_PORT =", os.getenv("DB_PORT"))
print("DATABASE_URL =", DATABASE_URL)

engine = create_engine(DATABASE_URL, echo=True)
Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column("id", Integer, primary_key=True, autoincrement=True)
    nome = Column("nome", String(100))
    email = Column("email", String(100), nullable=False)
    senha = Column("senha", String(25))
    telefone = Column("telefone", String(14))
    correntista = Column("correntista", Boolean, default=True)
    saldo_cc = Column("saldo_cc", Float, default=0.0)
    
    def __init__(self, nome, email, senha, telefone, correntista, saldo_cc):
        self.nome = nome
        self.email = email
        self.senha = senha
        self.telefone = telefone
        self.correntista = correntista
        self.saldo_cc = saldo_cc

Base.metadata.create_all(engine)
print(f"Tabelas criadas com sucesso")