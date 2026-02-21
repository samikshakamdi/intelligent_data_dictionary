from services.schema_extractor import extract_schema
from services.quality_checker import calculate_data_quality

def calculate_database_health():
    schema = extract_schema()
    if not schema:
        return {"health_score": 0, "status": "Empty Database", "details": "No tables found."}
        
    total_tables = len(schema)
    total_quality_score = 0
    tables_processed = 0
    
    table_scores = {}
    
    for table_name in schema.keys():
        quality_info = calculate_data_quality(table_name)
        if "error" not in quality_info:
            score = quality_info.get("overall_quality_score", 0)
            total_quality_score += score
            table_scores[table_name] = score
            tables_processed += 1
            
    if tables_processed == 0:
         return {"health_score": 0, "status": "Error", "details": "Could not calculate quality for any tables."}

    avg_health_score = round(total_quality_score / tables_processed, 2)
    
    status = "Excellent" if avg_health_score >= 90 else "Good" if avg_health_score >= 70 else "Needs Improvement" if avg_health_score >= 50 else "Poor"
    
    return {
        "overall_health_score": avg_health_score,
        "status": status,
        "total_tables": total_tables,
        "table_scores": table_scores
    }
