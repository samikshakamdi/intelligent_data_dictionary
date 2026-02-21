from sqlalchemy import inspect
from database import get_engine

def extract_schema():
    try:
        engine = get_engine()
        inspector = inspect(engine)
    except Exception as e:
        # Handle the exception, e.g., log it or raise a custom error
        print(f"Error initializing database engine or inspector: {e}")
        return {} # Return an empty schema or re-raise the exception
    
    schema_info = {}
    
    for table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        
        column_details = []
        for col in columns:
            column_details.append({
                "name": col['name'],
                "type": str(col['type']),
                "nullable": col['nullable'],
                "primary_key": col.get('primary_key', 0) > 0
            })
            
        schema_info[table_name] = {
            "columns": column_details
        }
        
    return schema_info
