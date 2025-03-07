import json
import logging
import asyncio
import os
from typing import Dict, List, Optional, Any
from django.conf import settings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain.memory import ConversationSummaryBufferMemory

from .document_loader import DocumentLoader
from .retrieval import RetrievalService
from .llm_service import LLMService

logger = logging.getLogger(__name__)

class ChatService:
    _instance = None
    _initialized = False

    @classmethod
    def get_instance(cls, pdf_files=None):
        """Implementación Singleton para asegurar una sola instancia del servicio"""
        if cls._instance is None:
            if pdf_files is None:
                # Path por defecto para los PDFs
                base_dir = settings.BASE_DIR
                pdf_files = [os.path.join(base_dir, 'data', 'Resolucion1498.pdf')]

                # Verificar que el archivo exista
                for pdf_file in pdf_files:
                    if not os.path.exists(pdf_file):
                        logger.error(f"Archivo PDF no encontrado: {pdf_file}")

            cls._instance = cls(pdf_files)
        return cls._instance

    def __init__(self, pdf_files: List[str]):
        self.pdf_files = pdf_files
        self.document_loader = None
        self.retrieval_service = None
        self.llm_service = None
        self.documents = None
        self.chain = None
        self.memory = None

    async def initialize(self):
        """Inicializa todos los servicios necesarios para el chatbot"""
        if ChatService._initialized:
            return True

        try:
            logger.info("Iniciando carga de documentos...")
            # Cargar documentos
            self.document_loader = DocumentLoader(self.pdf_files)
            self.documents = self.document_loader.load_documents()
            if not self.documents:
                logger.error("No se pudieron cargar documentos")
                return False
            logger.info(f"Documentos cargados: {len(self.documents)} fragmentos")

            # Inicializar servicios
            logger.info("Iniciando servicios de recuperación...")
            self.retrieval_service = RetrievalService(self.documents)
            if not self.retrieval_service.initialize():
                logger.error("Error al inicializar el servicio de recuperación")
                return False
            logger.info("Servicio de recuperación inicializado")

            # Inicializar LLM
            logger.info("Iniciando servicio LLM...")
            self.llm_service = LLMService()
            if not self.llm_service.initialize():
                logger.error("Error al inicializar el servicio LLM")
                return False
            logger.info("Servicio LLM inicializado")

            # Configurar el chain de LangChain
            logger.info("Configurando chain de LangChain...")
            self._setup_chain()
            logger.info("Chain configurado correctamente")

            ChatService._initialized = True
            logger.info("Servicio de chat inicializado correctamente")
            return True
        except Exception as e:
            logger.error(f"Error inicializando servicio de chat: {str(e)}")
            return False

    def _setup_chain(self):
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Eres un asistente útil. Usa el siguiente contexto para responder la pregunta, prestando mucha atención a los detalles de la pregunta, pensando paso a paso y dando una respuesta completa."),
            ("human", "Contexto: {context}"),
            ("human", "Historial de chat: {chat_history}"),
            ("human", "Pregunta: {question}")
        ])

        self.memory = ConversationSummaryBufferMemory(
            llm=self.llm_service.llm,
            max_token_limit=50,
            input_key="question",
            memory_key="chat_history",
            return_messages=True
        )

        self.chain = (
            {
                "context": RunnablePassthrough(),
                "question": RunnablePassthrough(),
                "chat_history": lambda x: self.memory.load_memory_variables({})["chat_history"]
            }
            | prompt
            | self.llm_service.llm
        )

    async def process_query(self, query: str, chat_history: List[Dict] = None) -> Dict[str, Any]:
        if not ChatService._initialized:
            success = await self.initialize()
            if not success:
                return {"error": "No se pudo inicializar el servicio de chat"}

        if chat_history is None:
            chat_history = []

        try:
            logger.info(f"Procesando consulta: {query}")
            context = await self.retrieval_service.get_relevant_context(query, chat_history)
            logger.info("Contexto recuperado correctamente")

            response = self.chain.invoke({"context": context, "question": query})
            logger.info("Respuesta generada correctamente")

            self.memory.save_context({"question": query}, {"output": response})

            return {
                "query": query,
                "response": response,
                "context": context
            }

        except Exception as e:
            logger.error(f"Error procesando consulta: {str(e)}")
            fallback = self.retrieval_service.fallback_keyword_search(query)
            return {
                "error": "Error al procesar la consulta",
                "fallback_response": f"Lo siento, encontré un error al procesar tu consulta. Esto es lo que encontré basado en una búsqueda por palabras clave: {fallback}"
            }

    def save_feedback(self, query: str, answer: str, feedback: int):
        feedback_data = {
            "query": query,
            "answer": answer,
            "feedback": feedback
        }
        feedback_file = os.path.join(settings.BASE_DIR, "feedback_log.json")
        with open(feedback_file, "a") as f:
            json.dump(feedback_data, f)
            f.write("\n")
