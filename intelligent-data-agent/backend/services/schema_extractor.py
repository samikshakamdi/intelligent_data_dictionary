from sqlalchemy import inspect
from database import engine

def extract_schema():
    inspector = inspect(engine)
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
