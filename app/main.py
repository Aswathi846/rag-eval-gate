import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(".env.local")

import uuid
import psycopg2
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()

# Initialize embedding model (matching your main pipeline)
model = SentenceTransformer("all-MiniLM-L6-v2")

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def process_document_background(job_id: str, filename: str, file_bytes: bytes):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE ingestion_jobs SET status = %s WHERE id = %s",
            ("processing", job_id)
        )
        conn.commit()

        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        cleaned_text = extracted_text.replace("ignore previous instructions", "").replace("SYSTEM:", "")

        chunk_size = 512
        overlap = 64
        chunks = []
        for i in range(0, len(cleaned_text), chunk_size - overlap):
            chunk = cleaned_text[i:i + chunk_size]
            if len(chunk.strip()) > 50:  
                chunks.append(chunk.strip())

        for idx, chunk in enumerate(chunks):
            embedding = model.encode(chunk).tolist()
            cur.execute(
                """
                INSERT INTO chunks (section, chunk_index, content, embedding, document_id)
                VALUES (%s, %s, %s, %s, %s)
                """,
                ("General", idx, chunk, embedding, filename)
            )
        conn.commit()

        cur.execute(
            "UPDATE ingestion_jobs SET status = %s WHERE id = %s",
            ("completed", job_id)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        cur.execute(
            "UPDATE ingestion_jobs SET status = %s, error_message = %s WHERE id = %s",
            ("failed", str(e), job_id)
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

@app.post("/documents")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf") or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
    
    job_id = str(uuid.uuid4())
    
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO ingestion_jobs (id, status, filename)
        VALUES (%s, %s, %s)
        """,
        (job_id, "pending", file.filename)
    )
    conn.commit()
    cur.close()
    conn.close()

    background_tasks.add_task(process_document_background, job_id, file.filename, contents)
    
    return {"job_id": job_id, "status": "pending"}

@app.get("/documents/{job_id}")
async def get_document_status(job_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, status, filename, error_message FROM ingestion_jobs WHERE id = %s",
        (job_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Job ID not found.")
    
    return {
        "job_id": row[0],
        "status": row[1],
        "filename": row[2],
        "error_message": row[3]
    }