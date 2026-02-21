from fastapi import FastAPI, UploadFile, File
from database import engine
import pandas as pd
from pydantic import BaseModel
import io
from services.schema_extractor import extract_schema
from services.quality_checker import calculate_data_quality
from services.health_score import calculate_database_health
from services.industry_detector import detect_industry
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import MetaData

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
        meta = MetaData()
        meta.reflect(bind=engine)
        meta.drop_all(bind=engine)
        return {"message": "Database reset"}
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

@app.post("/api/generate-docs")
def generate_docs():
    return {"message": "Docs generation endpoint"}

@app.post("/api/chat")
def chat_with_data(request: ChatRequest):
    return {"message": f"Chat endpoint received: {request.message}"}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    # Read the uploaded CSV file
    contents = await file.read()
    
    # Load into pandas dataframe
    try:
        df = pd.read_csv(io.BytesIO(contents))
        
        # Save to SQLite database
        table_name = file.filename.split('.')[0]
        df.to_sql(table_name, engine, if_exists="replace", index=False)
        
        return {
            "message": f"Successfully uploaded {file.filename} and saved to table '{table_name}'",
            "columns": list(df.columns),
            "rows": len(df)
        }
    except Exception as e:
        return {"error": str(e)}
