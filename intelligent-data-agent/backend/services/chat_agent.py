import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

# Import the existing services to dynamically fetch context
from services.schema_extractor import extract_schema
from services.relationship_extractor import analyze_cross_table_relationships

load_dotenv()



def build_system_context() -> str:
    """
    Dynamically fetches the current database schema and cross-table relationships
    so the AI is fully aware of the uploaded datasets at the moment of the query.
    """
    try:
        # 1. Fetch the full schema dictionary
        schema = extract_schema()
        
        # 2. Fetch the calculated foreign key relationships
        relationships = analyze_cross_table_relationships()
        
        context_msg = f"""
You are an intelligent enterprise Data Engineering AI. 
The user is asking a question about their current SQL database. 
You must use the following live schema information to answer their question accurately. 
If they ask you to write a SQL query, make sure the column names perfectly match the schema below.

### CURRENT DATABASE SCHEMA ###
{json.dumps(schema, indent=2)}

### KNOWN CROSS-TABLE RELATIONSHIPS ###
{json.dumps(relationships, indent=2)}
"""
        return context_msg.strip()
    except Exception as e:
        print(f"Error building AI context: {e}")
        return "You are a helpful database assistant. An error occurred while fetching the live schema."


def query_ai(user_message: str) -> dict:
    """
    Sends the user's question, injected with the live DB schema context, to Google Gemini.
    """
    if not os.getenv("GEMINI_API_KEY"):
        return {"error": "GEMINI_API_KEY is missing from the .env file. Please add it to use the AI Chat feature."}

    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        system_context = build_system_context()
        
        # Initialize the Gemini model with the system context as instructions
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=system_context
        )
        
        # Send the user message
        response = model.generate_content(
            user_message,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3
            )
        )
        
        ai_reply = response.text
        return {"reply": ai_reply}
        
    except Exception as e:
        return {"error": str(e)}
