import logging
import heapq
import numpy as np
from typing import List, Tuple, Optional, Dict
from collections import defaultdict
from langchain.schema import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from sklearn.feature_extraction.text import TfidfVectorizer
from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)

class BM25L:
    def __init__(self, corpus, k1=1.5, b=0.75, delta=0.5):
        self.corpus = corpus
        self.k1 = k1
        self.b = b
        self.delta = delta
        self.avg_doc_len = sum(len(doc.split()) for doc in corpus) / len(corpus)
        self.doc_freqs = []
        self.idf = defaultdict(float)
        self.doc_len = []
        self.corpus_size = len(corpus)
        self._initialize()

    def _initialize(self):
        for document in self.corpus:
            words = document.split()
            self.doc_len.append(len(words))
            freq_dict = defaultdict(int)
            for word in words:
                freq_dict[word] += 1
            self.doc_freqs.append(freq_dict)
            for word in freq_dict:
                self.idf[word] += 1

        for word, freq in self.idf.items():
            self.idf[word] = np.log((self.corpus_size - freq + 0.5) / (freq + 0.5))

    def get_scores(self, query):
        scores = [0] * self.corpus_size
        query_words = query.split()
        q_freqs = defaultdict(int)
        for word in query_words:
            q_freqs[word] += 1

        for i, doc in enumerate(self.corpus):
            for word in query_words:
                if word not in self.doc_freqs[i]:
                    continue
                freq = self.doc_freqs[i][word]
                numerator = self.idf[word] * freq * (self.k1 + 1)
                denominator = freq + self.k1 * (1 - self.b + self.b * self.doc_len[i] / self.avg_doc_len)
                scores[i] += (numerator / denominator) + self.delta

        return scores

class BM25LRetriever:
    def __init__(self, documents: List[str], k1: float = 1.5, b: float = 0.75, delta: float = 0.5):
        self.documents = documents
        self.bm25 = BM25L(self.documents, k1=k1, b=b, delta=delta)

    def retrieve(self, query: str, top_k: int = 10) -> List[Tuple[int, float]]:
        doc_scores = self.bm25.get_scores(query)
        return heapq.nlargest(top_k, enumerate(doc_scores), key=lambda x: x[1])

class RetrievalService:
    def __init__(self, documents: List[Document]):
        self.documents = documents
        self.vectorstore = None
        self.bm25l_retriever = None
        self.tfidf_vectorizer = None
        self.cross_encoder = None

    def initialize(self):
        try:
            logger.info("Inicializando servicios de recuperación...")
            self._init_vectorstore()
            self._init_bm25l()
            self._init_tfidf()
            self._init_cross_encoder()
            logger.info("Servicios de recuperación inicializados")
            return True
        except Exception as e:
            logger.error(f"Error inicializando servicios de recuperación: {str(e)}")
            return False

    def _init_vectorstore(self):
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )
        self.vectorstore = Chroma.from_documents(
            documents=self.documents,
            embedding=embeddings
        )

    def _init_bm25l(self):
        doc_texts = [doc.page_content for doc in self.documents]
        self.bm25l_retriever = BM25LRetriever(doc_texts, k1=1.2, b=0.75, delta=0.5)

    def _init_tfidf(self):
        doc_texts = [doc.page_content for doc in self.documents]
        self.tfidf_vectorizer = TfidfVectorizer()
        self.tfidf_vectorizer.fit(doc_texts)

    def _init_cross_encoder(self):
        self.cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

    def weight_chat_history(self, chat_history: List[Dict], max_messages: int = 2, decay_factor: float = 0.9) -> str:
        if not chat_history:
            return ""
        recent_history = chat_history[-max_messages:]
        weighted_history = []
        for i, message in enumerate(reversed(recent_history)):
            weight = decay_factor ** i
            weighted_history.append(f"{weight:.2f} * {message['content']}")
        return " ".join(reversed(weighted_history))

    def rerank_results(self, docs: List[str], query: str, original_scores: List[float]) -> List[str]:
        pairs = [[query, doc] for doc in docs]
        scores = self.cross_encoder.predict(pairs)
        combined_scores = [0.7 * new_score + 0.3 * original_score for new_score, original_score in zip(scores, original_scores)]
        return [doc for _, doc in sorted(zip(combined_scores, docs), reverse=True)]

    def fallback_keyword_search(self, query: str) -> str:
        keywords = query.lower().split()
        relevant_docs = []
        for doc in self.documents:
            if any(keyword in doc.page_content.lower() for keyword in keywords):
                relevant_docs.append(doc.page_content)
        if not relevant_docs:
            return "No pude encontrar información relevante. ¿Puedes reformular tu pregunta?"
        return "\n".join(relevant_docs[:3])

    async def get_relevant_context(self, query: str, chat_history: List[Dict]) -> str:
        import asyncio

        try:
            weighted_history = self.weight_chat_history(chat_history)
            combined_query = query + " " + weighted_history

            async def vector_search():
                try:
                    return self.vectorstore.similarity_search(combined_query, k=10)
                except Exception as e:
                    logger.error(f"Búsqueda vectorial fallida: {str(e)}")
                    return []

            async def bm25l_search():
                try:
                    return self.bm25l_retriever.retrieve(combined_query, top_k=10)
                except Exception as e:
                    logger.error(f"Búsqueda BM25L fallida: {str(e)}")
                    return []

            vector_results, bm25l_results = await asyncio.gather(vector_search(), bm25l_search())

            if not vector_results and not bm25l_results:
                logger.warning("Ambas búsquedas fallaron. Usando búsqueda por palabras clave.")
                return self.fallback_keyword_search(combined_query)

            combined_results = []
            for doc in vector_results:
                heapq.heappush(combined_results, (-0.6, doc.page_content))

            for idx, score in bm25l_results:
                doc_content = self.documents[idx].page_content
                heapq.heappush(combined_results, (-0.3 * score, doc_content))

            tfidf_scores = self.tfidf_vectorizer.transform([combined_query]).toarray()[0]
            for idx, doc in enumerate(self.documents):
                doc_content = doc.page_content
                if any(doc_content == content for _, content in combined_results):
                    heapq.heappush(combined_results, (-0.1 * tfidf_scores[idx], doc_content))

            top_results = heapq.nsmallest(10, combined_results)
            docs_to_rerank = [doc for _, doc in top_results]
            original_scores = [-score for score, _ in top_results]

            reranked_docs = self.rerank_results(docs_to_rerank, combined_query, original_scores)

            return "\n".join(reranked_docs[:5])

        except Exception as e:
            logger.error(f"Error en get_relevant_context: {str(e)}")
            return self.fallback_keyword_search(query)
