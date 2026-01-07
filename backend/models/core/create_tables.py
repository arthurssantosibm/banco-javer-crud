import mysql.connector
from mysql.connector import errorcode

DB_PASSWORD = "1701076288"
DB_USER = "admin"
DB_HOST = "databaseproject.cc1kujauuftf.us-east-1.rds.amazonaws.com"
DB_PORT = 3306
DB_NAME = "javer"

try:
    conn = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )
    
    print("Conectado ao banco!")
    
    cursor = conn.cursor()
    
    #c ursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    # print(f"Banco '{DB_NAME}' verificado/criado")
    
    cursor.execute(f"USE {DB_NAME}")
    
    
    create_table_sql = """
    ALTER TABLE usuarios MODIFY senha VARCHAR(255);
    """
    
    cursor.execute(create_table_sql)
    conn.commit()

    print("Tabela 'usuarios' atualizada com sucesso")
    
except mysql.connector.Error as e:
    if e.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Erro de autenticação: usuário ou senha incorretos")
    elif e.errno == errorcode.ER_BAD_DB_ERROR:
        print("Banco de dados não existe")
    else:
        print(f"Erro ao conectar/criar: {e}")

finally:
    if 'conn' in locals() and conn.is_connected():
        cursor.close()
        conn.close()
        print("Conexão fechada")