from fastapi import FastAPI

app = FastAPI(title="Servicio IA Facial")

@app.get("/health")
def health():
    return{"status": "ok", "service": "face-recognition", "model": "pendiente_etapa_B"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

