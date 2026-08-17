import os
import requests
from dotenv import load_dotenv
from app.logger import get_logger

load_dotenv()
logger = get_logger(__name__)

RETRIEVAL_SERVICE_URL = os.getenv("RETRIEVAL_SERVICE_URL", "http://localhost:8010")

def get_prices(ticker: str, limit: int = 10) -> list[dict]:
    try:
        response = requests.get(
            f"{RETRIEVAL_SERVICE_URL}/prices/{ticker}",
            params={"limit": limit},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        logger.error(f"Failed to fetch prices for {ticker}")
        return []

def search_news(query: str, ticker: str | None = None, top_k: int = 5) -> list[dict]:
    try:
        response = requests.post(
            f"{RETRIEVAL_SERVICE_URL}/news/search",
            json={"query": query, "ticker": ticker, "top_k": top_k},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        logger.error(f"Failed to search news for query='{query}'", exc_info=True)
        return []