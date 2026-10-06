from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from data_access.db_init import startup

# Import Routers
from routers import user, authentication, merchant, account, category, tag, transaction, receipt, ai_insights, receipt_line_item


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Datenbank beim Start initialisieren (idempotent)
    await run_in_threadpool(startup)
    yield


app = FastAPI(title="FinanceConsulter API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(authentication.router)
app.include_router(user.router)
app.include_router(transaction.router)
app.include_router(account.router)
app.include_router(merchant.router)
app.include_router(category.router)
app.include_router(tag.router)
app.include_router(receipt.router)
app.include_router(receipt_line_item.router)
app.include_router(ai_insights.router)


@app.get("/")
def root():
    return {
        "message": "FinanceConsulter API läuft",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}