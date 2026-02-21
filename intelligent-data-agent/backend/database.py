from sqlalchemy import create_engine
import pandas as pd

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL)

def load_csv_to_db():
    df = pd.read_csv("your_dataset.csv")
    df.to_sql("business_data", engine, if_exists="replace", index=False)
