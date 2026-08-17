from app.db import engine, SessionLocal, ensure_vector_extension
from app.models import Base, Price
from app.logger import get_logger
import sys
import yfinance as yf
from sqlalchemy.dialects.postgresql import insert

logger = get_logger(__name__)


def create_tables():
    Base.metadata.create_all(bind=engine)


def fetch_and_store(ticker: str, period: str = "6mo"):
    logger.info(f"Fetching {ticker} data for period={period}")
    data = yf.Ticker(ticker).history(period=period)

    if data.empty:
        logger.warning(f"No data returned for {ticker}. Check the ticker symbol.")
        return

    session = SessionLocal()
    try:
        for date, row in data.iterrows():
            stmt = insert(Price).values(
                ticker=ticker,
                date=date.date(),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_ticker_date",
                set_={
                    "open": stmt.excluded.open,
                    "high": stmt.excluded.high,
                    "low": stmt.excluded.low,
                    "close": stmt.excluded.close,
                    "volume": stmt.excluded.volume,
                },
            )
            session.execute(stmt)
        session.commit()
        logger.info(f"Processed {len(data)} rows for {ticker}")
    except Exception:
        logger.error(f"Failed to ingest {ticker}", exc_info=True)
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.error("Usage: python -m app.ingest <TICKER>")
        sys.exit(1)
    

    ticker_symbol = sys.argv[1].upper()
    ensure_vector_extension()
    create_tables()
    fetch_and_store(ticker_symbol)