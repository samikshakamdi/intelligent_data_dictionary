from fastapi import FastAPI, UploadFile, File, Body
from database import get_engine, set_database_url
import pandas as pd
from pydantic import BaseModel
from typing import List
import io
from services.schema_extractor import extract_schema
from services.quality_checker import calculate_data_quality
from services.health_score import calculate_database_health
from services.industry_detector import detect_industry
from services.relationship_extractor import calculate_relationships, analyze_cross_table_relationships
from services.chat_agent import query_ai
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import MetaData, inspect

app = FastAPI(
    title="Intelligent Data Dictionary Agent API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.delete("/api/reset")
def reset_database():
    try:
        from sqlalchemy import MetaData
        engine = get_engine()
        meta = MetaData()
        meta.reflect(bind=engine)
        meta.drop_all(bind=engine)
        return {"message": "Database reset successfully"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/tables")
def get_tables():
    try:
        engine = get_engine()
        inspector = inspect(engine)
        return {"tables": inspector.get_table_names()}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/tables/{table_name}")
def delete_table(table_name: str):
    try:
        from sqlalchemy import MetaData
        engine = get_engine()
        meta = MetaData()
        meta.reflect(bind=engine)
        if table_name in meta.tables:
            meta.tables[table_name].drop(engine)
            return {"message": f"Table '{table_name}' deleted"}
        return {"error": "Table not found"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/schema")
def get_schema():
    return extract_schema()

@app.get("/api/quality/{table_name}")
def get_data_quality(table_name: str):
    return calculate_data_quality(table_name)

@app.get("/api/health")
def get_health_score():
    return calculate_database_health()

@app.get("/api/industry")
def get_industry():
    return detect_industry()

@app.get("/api/relationships/{table_name}")
def get_relationships(table_name: str):
    return calculate_relationships(table_name)

@app.get("/api/cross-relationships")
def get_cross_relationships():
    return analyze_cross_table_relationships()

@app.post("/api/generate-docs")
def generate_docs():
    return {"message": "Docs generation endpoint"}

@app.post("/api/chat")
def chat_with_data(request: ChatRequest):
    return query_ai(request.message)

@app.post("/api/upload")
async def upload_dataset(files: List[UploadFile] = File(...)):
    results = []
    engine = get_engine()
    for file in files:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents))
            # Optional: do some basic clean up for column names
            df.columns = df.columns.astype(str).str.strip()
            
            table_name = file.filename.split('.')[0]
            # Replace spaces or hyphens in table names with underscores
            table_name = table_name.replace(" ", "_").replace("-", "_")
            df.to_sql(table_name, engine, if_exists="replace", index=False)
            
            results.append({
                "name": table_name,
                "columns": list(df.columns),
                "rows": len(df),
                "status": "success"
            })
        except Exception as e:
            results.append({
                "name": file.filename,
                "status": "error",
                "error": str(e)
            })
            
    return {"message": "Upload operations finished", "results": results}

@app.post("/api/connect")
def connect_external_db(payload: dict = Body(...)):
    database_url = payload.get("url")
    if not database_url:
        return {"error": "No URL provided"}
    
    success, msg = set_database_url(database_url)
    if success:
        return {"message": msg}
    else:
        return {"error": msg}

import os
from fastapi.staticfiles import StaticFiles

# Mount the static frontend securely. This must be the *last* route added
# so that it doesn't try to intercept /api routes.
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
