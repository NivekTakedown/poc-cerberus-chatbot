import os
import logging
from typing import List
from langchain.schema import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

class DocumentLoader:
    def __init__(self, pdf_files: List[str], chunk_size: int = 1000, chunk_overlap: int = 200):
        self.pdf_files = pdf_files
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def load_documents(self) -> List[Document]:
        all_docs = []
        for pdf_file in self.pdf_files:
            all_docs.extend(self._load_pdf(pdf_file))
        return all_docs

    def _load_pdf(self, pdf_file: str) -> List[Document]:
        try:
            logger.info(f"Cargando archivo PDF: {pdf_file}")
            loader = PyPDFLoader(pdf_file)
            data = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )
            docs = text_splitter.split_documents(data)
            logger.info(f"Cargado exitosamente {pdf_file}")
            return docs
        except Exception as e:
            logger.error(f"Error cargando {pdf_file}: {str(e)}")
            return []
