import os
import sys
import requests
from datetime import datetime
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.db import engine, SessionLocal,ensure_vector_extension
from app.models import Base, NewsChunk

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")
NEWSAPI_URL = "https://newsapi.org/v2/everything"

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)


def create_tables():
    Base.metadata.create_all(bind=engine)


def fetch_news(query: str, page_size: int = 20):
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": page_size,
        "apiKey": NEWSAPI_KEY,
    }
    response = requests.get(NEWSAPI_URL, params=params)
    response.raise_for_status()
    return response.json().get("articles", [])


def chunk_and_store(ticker: str, articles: list):
    session = SessionLocal()
    try:
        total_chunks = 0
        for article in articles:
            content = article.get("content") or article.get("description") or ""
            if not content.strip():
                continue

            published_at = datetime.fromisoformat(
                article["publishedAt"].replace("Z", "+00:00")
            ).date()

            chunks = splitter.split_text(content)
            vectors = embeddings.embed_documents(chunks)

            for chunk_text, vector in zip(chunks, vectors):
                news_chunk = NewsChunk(
                    ticker=ticker,
                    title=article["title"],
                    source_url=article["url"],
                    published_at=published_at,
                    chunk_text=chunk_text,
                    embedding=vector,
                )
                session.add(news_chunk)
                total_chunks += 1

        session.commit()
        print(f"Done. Stored {total_chunks} chunks from {len(articles)} articles for {ticker}.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        logger.error("Usage: python -m app.news_ingest <TICKER> <COMPANY_NAME_FOR_SEARCH>")
        sys.exit(1)

    ticker = sys.argv[1].upper()
    search_query = sys.argv[2]

    ensure_vector_extension()
    create_tables()
    articles = fetch_news(search_query)
    chunk_and_store(ticker, articles)