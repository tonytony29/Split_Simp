from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database

# Initialize the database tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Split Bill API")

# Configure CORS so the frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for local development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE)
    allow_headers=["*"],
)

# A simple health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Backend is running smoothly."}