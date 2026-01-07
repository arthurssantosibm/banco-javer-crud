from models.core.db_javer import get_connection

def get_session():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)