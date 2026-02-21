import pandas as pd
from database import get_engine
from sqlalchemy import inspect

def calculate_relationships(table_name: str):
    try:
        engine = get_engine()
        # Read table data from sqlite
        df = pd.read_sql_table(table_name, engine)
        
        # We only want to calculate relationships (correlations) between numeric columns
        # as categorical columns require different techniques (like Cramer's V or ANOVA)
        numeric_df = df.select_dtypes(include=['number'])
        
        if numeric_df.empty or len(numeric_df.columns) < 2:
            return {
                "error": "Not enough numeric columns to calculate relationships.",
                "table_name": table_name
            }
            
        # Calculate the correlation matrix
        corr_matrix = numeric_df.corr().round(3)
        
        # Convert the matrix into a format that is easy for the frontend to consume
        # We'll create a list of objects representing each cell in the matrix
        matrix_data = []
        columns = list(corr_matrix.columns)
        
        for idx, row in corr_matrix.iterrows():
            row_data = {"column": idx}
            for col in columns:
                # Handle NaN values (which happen if a column is constant)
                val = row[col]
                row_data[col] = float(val) if pd.notna(val) else None
            matrix_data.append(row_data)
            
        return {
            "table_name": table_name,
            "columns": columns,
            "matrix": matrix_data
        }
        
    except Exception as e:
        return {"error": str(e)}

def analyze_cross_table_relationships():
    try:
        engine = get_engine()
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        table_columns = {}
        for table in tables:
            columns = [c['name'] for c in inspector.get_columns(table)]
            table_columns[table] = columns
            
        links = []
        for i in range(len(tables)):
            for j in range(i + 1, len(tables)):
                table_a = tables[i]
                table_b = tables[j]
                
                cols_a = set(table_columns[table_a])
                cols_b = set(table_columns[table_b])
                
                common_cols = cols_a.intersection(cols_b)
                if common_cols:
                    links.append({
                        "source": table_a,
                        "target": table_b,
                        "common_columns": list(common_cols)
                    })
                    
        return {
            "tables": tables,
            "links": links
        }
    except Exception as e:
        return {"error": str(e)}
