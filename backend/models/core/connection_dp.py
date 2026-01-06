from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import quote_plus
import os
import mysql.connector
from mysql.connector import errorcode

DB_PASSWORD = "1701076288"
DB_USER = "admin"
DB_HOST = "database-project.cc1kujauuftf.us-east-1.rds.amazonaws.com"
DB_PORT = 3306
DB_NAME = "mysql"

try:
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT
    )
    
    if conn.is_connected():
        print("Conexão ao MYSQL da AWS RDS realizada com sucesso")
        
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION()")
        db_version = cursor.fetchone()
        print(f"Versão do Banco de Dados: {db_version[0]}")
        
    cursor.close()
    
except mysql.connector.Error as e:
    if e.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Erro de autenticação: Nome de usuário ou senha incorretos.")
    elif e.errno == errorcode.ER_BAD_DB_ERROR:
        print("Banco de dados não existe.")
    else:
        print(f"Erro ao conectar: {e}")

finally:
    if 'conn' in locals() and conn.is_connected():
        conn.close()
        print("Conexão Fechada")