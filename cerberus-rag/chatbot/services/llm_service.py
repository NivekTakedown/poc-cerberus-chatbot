import os
import logging
import time
import subprocess
from langchain_ollama import OllamaLLM
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self, model_name="llama3.2", temperature=0.0):
        self.model_name = model_name
        self.temperature = temperature
        self.llm = None

    def _check_ollama_running(self):
        """Verifica si Ollama está corriendo y disponible"""
        try:
            import requests
            response = requests.get("http://localhost:11434/api/version", timeout=5)
            return response.status_code == 200
        except:
            return False

    def _check_model_available(self):
        """Verifica si el modelo requerido está disponible en Ollama"""
        try:
            import requests
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get("models", [])
                return any(model["name"] == self.model_name for model in models)
            return False
        except:
            return False

    def _start_ollama(self):
        """Intenta iniciar Ollama si no está en ejecución"""
        logger.info("Intentando iniciar Ollama...")
        try:
            subprocess.Popen(["ollama", "serve"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE)
            # Esperar a que Ollama se inicie
            for _ in range(10):
                time.sleep(1)
                if self._check_ollama_running():
                    logger.info("Ollama iniciado correctamente")
                    return True
            return False
        except Exception as e:
            logger.error(f"Error al iniciar Ollama: {str(e)}")
            return False

    def _pull_model(self):
        """Intenta descargar el modelo si no está disponible"""
        logger.info(f"Descargando modelo {self.model_name}...")
        try:
            process = subprocess.Popen(
                ["ollama", "pull", self.model_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate()
            if process.returncode == 0:
                logger.info(f"Modelo {self.model_name} descargado correctamente")
                return True
            else:
                logger.error(f"Error al descargar modelo: {stderr}")
                return False
        except Exception as e:
            logger.error(f"Error al descargar modelo: {str(e)}")
            return False

    def initialize(self):
        try:
            logger.info(f"Inicializando modelo LLM: {self.model_name}")

            # Verificar si Ollama está corriendo
            if not self._check_ollama_running():
                logger.warning("Ollama no está corriendo. Intentando iniciarlo...")
                if not self._start_ollama():
                    logger.error("No se pudo iniciar Ollama. Asegúrate de que esté instalado.")
                    return False

            # Verificar si el modelo está disponible
            if not self._check_model_available():
                logger.warning(f"Modelo {self.model_name} no encontrado. Intentando descargarlo...")
                if not self._pull_model():
                    logger.error(f"No se pudo descargar el modelo {self.model_name}")
                    return False

            # Configurar el modelo
            self.llm = OllamaLLM(
                model=self.model_name,
                temperature=self.temperature,
                streaming=True,  # Make sure streaming is enabled
                base_url="http://localhost:11434"
            )

            # Realizar una prueba rápida para verificar que funcione
            try:
                test_response = self.llm.invoke("Hola, ¿puedes responder brevemente para probar la conexión?")
                logger.info(f"Test de modelo exitoso: {test_response[:20]}...")
            except Exception as e:
                logger.error(f"Error en prueba del modelo: {str(e)}")
                return False

            logger.info("Modelo LLM inicializado correctamente")
            return True
        except Exception as e:
            logger.error(f"Error inicializando modelo LLM: {str(e)}")
            return False
