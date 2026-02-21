import pandas as pd
from database import engine

def calculate_data_quality(table_name: str):
    try:
        # Read table data from sqlite
        df = pd.read_sql_table(table_name, engine)
        
        total_rows = len(df)
        if total_rows == 0:
            return {"error": "Table is empty"}
            
        columns_quality = []
        for col in df.columns:
            missing = df[col].isnull().sum()
            missing_percentage = (missing / total_rows) * 100
            unique_count = df[col].nunique()
            
            columns_quality.append({
                "column": col,
                "missing_count": int(missing),
                "missing_percentage": round(float(missing_percentage), 2),
                "unique_values": int(unique_count),
                "dtype": str(df[col].dtype)
            })
            
        overall_missing = df.isnull().sum().sum()
        total_cells = total_rows * len(df.columns)
        overall_quality_score = round(max(0, 100 - ((overall_missing / total_cells) * 100)), 2)
        
        return {
            "table_name": table_name,
            "total_rows": total_rows,
            "total_columns": len(df.columns),
            "overall_quality_score": overall_quality_score,
            "columns": columns_quality
        }
        
    except Exception as e:
        return {"error": str(e)}
