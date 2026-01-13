import mysql.connector
from mysql.connector import errorcode, pooling, Error

DB_PASSWORD = "1701076288"
DB_USER = "admin"
DB_HOST = "databaseproject.cc1kujauuftf.us-east-1.rds.amazonaws.com"
DB_PORT = 3306
DB_NAME = "javer"

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="javer_pool",
        pool_size=5,  
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT
    )
    print("Conexão com o banco de dados estabelecida com sucesso.")

except Error as e:
    print(f"Erro ao conectar ao banco de dados: {e}")
    raise

def get_connection():
    return connection_pool.get_connection()