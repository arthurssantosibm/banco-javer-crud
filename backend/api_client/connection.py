import mysql.connector
from mysql.connector import errorcode, pooling, Error
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="C:/Users/ArthurSantanadosSant/Documents/banco-javer-crud/backend/models/core/.env")

DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_USER = os.getenv("DB_USER")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = 3306
DB_NAME = os.getenv("DB_NAME")

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="javer_pool",
        pool_size=5,  
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT,
        use_pure=True
    )
    print("Conexão com o banco de dados estabelecida com sucesso.")

except Error as e:
    print(f"Erro ao conectar ao banco de dados: {e}")
    raise

def get_connection():
    return connection_pool.get_connection()