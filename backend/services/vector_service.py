# backend/services/vector_service.py

import os
import shutil
import tempfile
from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from dotenv import load_dotenv

from core.s3_client import s3_client  # <<< Import our new S3 helper

# --- CONFIGURATION ---
load_dotenv()

# We define a local cache directory for the server to hold active indices
# This persists as long as the server is running (or until reboot)
LOCAL_CACHE_DIR = os.path.join(tempfile.gettempdir(), "learn_ease_cache", "vector_stores")
os.makedirs(LOCAL_CACHE_DIR, exist_ok=True)

# --- INITIALIZE EMBEDDINGS ---
try:
    model_name = "all-MiniLM-L6-v2"
    model_kwargs = {'device': 'cpu'}
    embeddings_model = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs
    )
    print(f"INFO: Local embedding model '{model_name}' loaded successfully.")
except Exception as e:
    print(f"CRITICAL: Failed to load local embedding model. Error: {e}")
    embeddings_model = None

# --- PUBLIC FUNCTIONS ---

async def create_vector_store_for_book(book_id: str, book_text: str) -> bool:
    """
    Creates FAISS index locally (in temp), uploads to S3, then cleans up.
    """
    if not embeddings_model:
        return False
        
    print(f"INFO: Starting vector store creation for book_id: {book_id}")
    
    try:
        # 1. Split Text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200, length_function=len
        )
        chunks = text_splitter.split_text(book_text)
        
        if not chunks:
            return False

        # 2. Create FAISS index in memory
        vector_store = FAISS.from_texts(texts=chunks, embedding=embeddings_model)
        
        # 3. Save to a Temporary Directory first
        with tempfile.TemporaryDirectory() as temp_dir:
            # save_local creates 'index.faiss' and 'index.pkl' inside temp_dir
            vector_store.save_local(temp_dir)
            
            # 4. Upload both files to S3
            # S3 Path: user-book-files/vector-stores/{book_id}/index.faiss
            base_s3_key = f"user-book-files/vector-stores/{book_id}"
            
            s3_client.upload_file(
                os.path.join(temp_dir, "index.faiss"), 
                f"{base_s3_key}/index.faiss"
            )
            s3_client.upload_file(
                os.path.join(temp_dir, "index.pkl"), 
                f"{base_s3_key}/index.pkl"
            )
            
        print(f"INFO: Successfully uploaded vector store for {book_id} to S3")
        return True

    except Exception as e:
        print(f"ERROR: Failed vector store creation for {book_id}. Error: {e}")
        return False

def search_in_vector_store(book_id: str, query: str, k: int = 4) -> List[Document]:
    """
    Downloads vector store from S3 to local cache (if needed) and searches it.
    """
    if not embeddings_model:
        return []

    # Local Cache Path: /tmp/learn_ease_cache/vector_stores/{book_id}/
    local_book_store_path = os.path.join(LOCAL_CACHE_DIR, book_id)
    
    # Check if we need to download from S3 (Cache Miss)
    # We check if 'index.faiss' exists locally
    if not os.path.exists(os.path.join(local_book_store_path, "index.faiss")):
        print(f"INFO: Cache miss for {book_id}. Downloading from S3...")
        
        # S3 Path
        base_s3_key = f"user-book-files/vector-stores/{book_id}"
        
        # Check if it exists in S3 first
        if not s3_client.check_file_exists(f"{base_s3_key}/index.faiss"):
            print(f"WARN: Vector store not found in S3 for {book_id}")
            return []
            
        # Download files
        success_faiss = s3_client.download_file(
            f"{base_s3_key}/index.faiss", 
            os.path.join(local_book_store_path, "index.faiss")
        )
        success_pkl = s3_client.download_file(
            f"{base_s3_key}/index.pkl", 
            os.path.join(local_book_store_path, "index.pkl")
        )
        
        if not (success_faiss and success_pkl):
            print("ERROR: Failed to download vector store files.")
            return []
    else:
        # Cache Hit - do nothing, just proceed to load
        pass 

    try:
        # Load from the local cache
        vector_store = FAISS.load_local(
            local_book_store_path, 
            embeddings_model, 
            allow_dangerous_deserialization=True
        )
        
        retriever = vector_store.as_retriever(search_kwargs={"k": k})
        relevant_docs = retriever.invoke(query)
        
        return relevant_docs

    except Exception as e:
        print(f"ERROR: Search failed for {book_id}. Error: {e}")
        # If loading failed, maybe cache is corrupt? Delete it for next time.
        shutil.rmtree(local_book_store_path, ignore_errors=True)
        return []