import mysql.connector
from mysql.connector import errorcode

DB_PASSWORD = "1701076288"
DB_USER = "admin"
DB_HOST = "databaseproject.cc1kujauuftf.us-east-1.rds.amazonaws.com"
DB_PORT = 3306
DB_NAME = "javer"

def get_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        port=DB_PORT
)