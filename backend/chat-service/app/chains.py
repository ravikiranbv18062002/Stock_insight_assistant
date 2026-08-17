import os
from dotenv import load_dotenv
load_dotenv()

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from langchain_groq import ChatGroq

from app.logger import get_logger
from app.retrieval_client import get_prices, search_news

logger = get_logger(__name__)


# ---------------------------------------------------------------------
# Shared LLM instances
# ---------------------------------------------------------------------
# temperature=0 -> deterministic, used for classification/extraction/condensing tasks
llm = ChatGroq(model="openai/gpt-oss-20b", temperature=0, api_key=os.getenv("GROQ_API_KEY"))

# temperature=0.3 -> slight natural variation, used for the final written answer
generation_llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0.3, api_key=os.getenv("GROQ_API_KEY"))


# ---------------------------------------------------------------------
# Step 0: Condense — rewrite a follow-up question into a standalone one
# ---------------------------------------------------------------------
condense_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Given the conversation history and a follow-up question, rewrite the follow-up "
     "into a standalone question that includes all necessary context (like the company "
     "being discussed and any relevant timeframe). If the question is already standalone, "
     "return it unchanged. Reply with ONLY the rewritten question, nothing else."),
    MessagesPlaceholder("history"),
    ("human", "{question}")
])

condense_chain = condense_prompt | llm | StrOutputParser()


def condense_question(question: str, history: list) -> str:
    if not history:
        return question

    standalone = condense_chain.invoke({"history": history, "question": question}).strip()
    logger.info(f"Condensed '{question}' -> '{standalone}'")
    return standalone


# ---------------------------------------------------------------------
# Step 1: Ticker extraction — "Tesla" -> "TSLA"
# ---------------------------------------------------------------------
ticker_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You extract stock ticker symbols from questions. Reply with ONLY the ticker symbol, "
     "uppercase, no other words. If truly no company is mentioned, reply UNKNOWN."),
    ("human", "What was Tesla's closing price?"),
    ("ai", "TSLA"),
    ("human", "Why did Apple stock drop?"),
    ("ai", "AAPL"),
    ("human", "Tell me about Microsoft"),
    ("ai", "MSFT"),
    ("human", "{question}")
])

ticker_extraction_chain = ticker_extraction_prompt | llm | StrOutputParser()


def extract_ticker(question: str) -> str | None:
    result = ticker_extraction_chain.invoke({"question": question}).strip().upper()
    logger.info(f"Extracted ticker '{result}' from question: '{question}'")

    if result == "UNKNOWN" or not result.isalpha() or len(result) > 5:
        logger.warning(f"Could not confidently extract a ticker from: '{question}'")
        return None

    return result


# ---------------------------------------------------------------------
# Step 2: Router — decide if the question needs price data, news data, or both
# ---------------------------------------------------------------------
router_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You classify a user's question about a stock into exactly one category. "
     "Reply with ONLY one word, no punctuation, no explanation:\n"
     "- 'price' if the question is about price, close, high, low, volume, or specific numbers\n"
     "- 'news' if the question is about why something happened, reasons, or events\n"
     "- 'both' if it needs both price movement AND the reason behind it"),
    ("human", "{question}")
])

router_chain = router_prompt | llm | StrOutputParser()


def classify_route(question: str) -> str:
    result = router_chain.invoke({"question": question}).strip().lower()
    logger.info(f"Routed question '{question}' -> '{result}'")

    if result not in ("price", "news", "both"):
        logger.warning(f"Unexpected router output '{result}', defaulting to 'both'")
        return "both"
    return result


# ---------------------------------------------------------------------
# Step 3: Gather context — call retrieval-service based on the route
# ---------------------------------------------------------------------
def gather_context(question: str, ticker: str) -> str:
    route = classify_route(question)

    context_parts = []

    if route in ("price", "both"):
        prices = get_prices(ticker, limit=10)
        price_summary = "\n".join(
            f"{p['date']}: close={p['close']}, volume={p['volume']}" for p in prices
        )
        context_parts.append(f"Recent price data for {ticker}:\n{price_summary}")

    if route in ("news", "both"):
        news = search_news(question, ticker=ticker, top_k=5)
        news_summary = "\n\n".join(
            f"[{n['published_at']}] {n['title']}: {n['chunk_text']}" for n in news
        )
        context_parts.append(f"Relevant news for {ticker}:\n{news_summary}")

    return "\n\n---\n\n".join(context_parts)


# ---------------------------------------------------------------------
# Step 4: Generation — turn context + question into a final written answer
# ---------------------------------------------------------------------
generation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a financial research assistant. Answer the user's question about a stock "
     "using ONLY the context provided below. If the context doesn't contain enough "
     "information to answer, say so honestly rather than guessing.\n\n"
     "Context:\n{context}"),
    ("human", "{question}")
])

generation_chain = generation_prompt | generation_llm | StrOutputParser()


# ---------------------------------------------------------------------
# Orchestrator — runs the full pipeline for one user question
# ---------------------------------------------------------------------
def answer_question(question: str, history: list = None) -> str:
    history = history or []

    standalone_question = condense_question(question, history)

    ticker = extract_ticker(standalone_question)
    if ticker is None:
        return "I couldn't identify which company you're asking about. Could you mention the company or ticker symbol?"

    context = gather_context(standalone_question, ticker)
    logger.info(f"Generating answer for: {standalone_question}")
    return generation_chain.invoke({"context": context, "question": standalone_question})


# ---------------------------------------------------------------------
# Standalone test — simulates a short multi-turn conversation
# ---------------------------------------------------------------------
if __name__ == "__main__":
    history = []

    q1 = "What's going on with Tesla recently?"
    a1 = answer_question(q1, history)
    print("Q1:", q1)
    print("A1:", a1)

    history.append(HumanMessage(content=q1))
    history.append(AIMessage(content=a1))

    q2 = "What about their stock price?"
    a2 = answer_question(q2, history)
    print("\nQ2:", q2)
    print("A2:", a2)