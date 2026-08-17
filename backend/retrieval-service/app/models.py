from sqlalchemy import Column, Integer, String, Date, Float, UniqueConstraint,Text
from sqlalchemy.orm import declarative_base
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True)
    ticker = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("ticker", "date", name="uq_ticker_date"),
    )

class NewsChunk(Base):
    __tablename__ = "news_chunks"

    id = Column(Integer, primary_key=True)
    ticker = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    published_at = Column(Date, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=False)