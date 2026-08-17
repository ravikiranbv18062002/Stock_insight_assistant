from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from langchain_huggingface import HuggingFaceEmbeddings

from app.db import SessionLocal
from app.models import Price, NewsChunk
from app.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Retrieval Service")

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")


class NewsSearchRequest(BaseModel):
    query: str
    ticker: str | None = None
    top_k: int = 5


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/prices/{ticker}")
def get_prices(ticker: str, limit: int = 30):
    ticker = ticker.upper()
    logger.info(f"Fetching last {limit} prices for {ticker}")

    session = SessionLocal()
    try:
        stmt = (
            select(Price)
            .where(Price.ticker == ticker)
            .order_by(Price.date.desc())
            .limit(limit)
        )
        rows = session.execute(stmt).scalars().all()

        if not rows:
            raise HTTPException(status_code=404, detail=f"No price data found for {ticker}")

        return [
            {
                "date": row.date.isoformat(),
                "open": row.open,
                "high": row.high,
                "low": row.low,
                "close": row.close,
                "volume": row.volume,
            }
            for row in rows
        ]
    finally:
        session.close()


@app.post("/news/search")
def search_news(request: NewsSearchRequest):
    logger.info(f"Searching news: query='{request.query}' ticker={request.ticker}")

    query_vector = embeddings.embed_query(request.query)

    session = SessionLocal()
    try:
        stmt = select(NewsChunk).order_by(
            NewsChunk.embedding.cosine_distance(query_vector)
        ).limit(request.top_k)

        if request.ticker:
            stmt = stmt.where(NewsChunk.ticker == request.ticker.upper())

        rows = session.execute(stmt).scalars().all()

        return [
            {
                "title": row.title,
                "source_url": row.source_url,
                "published_at": row.published_at.isoformat(),
                "chunk_text": row.chunk_text,
            }
            for row in rows
        ]
    finally:
        session.close()

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)