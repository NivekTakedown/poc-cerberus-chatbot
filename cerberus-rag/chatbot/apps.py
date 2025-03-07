from django.apps import AppConfig
import threading
import logging

logger = logging.getLogger(__name__)

class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatbot'

    def ready(self):
        """Este método se ejecuta cuando la aplicación Django arranca"""
        # Evitamos iniciar el servicio durante las migraciones
        import sys
        if 'makemigrations' not in sys.argv and 'migrate' not in sys.argv:
            logger.info("Iniciando servicio de chatbot...")
            # Iniciar el servicio en un hilo separado para no bloquear el arranque
            from .views.chat_views import init_chat_service
            init_thread = threading.Thread(target=init_chat_service)
            init_thread.daemon = True
            init_thread.start()
