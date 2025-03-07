import json
import asyncio
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from asgiref.sync import sync_to_async

from ..models import Conversation, Message
from ..services.chat_service import ChatService

logger = logging.getLogger(__name__)

# Obtiene la instancia del servicio de chat
chat_service = ChatService.get_instance()

# Esta función se ejecutará al cargar la vista por primera vez
async def initialize_chat_service():
    if not await chat_service.initialize():
        logger.error("No se pudo inicializar el servicio de chat durante el arranque")
    else:
        logger.info("Servicio de chat inicializado correctamente durante el arranque")

# Ejecutamos la inicialización en el arranque (en modo asíncrono para no bloquear)
def init_chat_service():
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(initialize_chat_service())
    except Exception as e:
        logger.error(f"Error en la inicialización del chat service: {str(e)}")

def index(request):
    """Vista para la página principal de la interfaz del chatbot."""
    return render(request, 'chatbot/index.html')

# Convertimos operaciones de base de datos a async
@sync_to_async
def get_conversation_by_id(conversation_id):
    return Conversation.objects.get(id=conversation_id)

@sync_to_async
def create_conversation(user=None, session_id=None):
    return Conversation.objects.create(user=user, session_id=session_id)

@sync_to_async
def get_messages_for_conversation(conversation):
    messages = Message.objects.filter(conversation=conversation).order_by('created_at')
    return list(messages)

@sync_to_async
def create_message(conversation, role, content):
    return Message.objects.create(
        conversation=conversation,
        role=role,
        content=content
    )

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])  # Añadir OPTIONS
async def chat(request):
    """API endpoint para el chatbot."""
    # Para manejar las solicitudes OPTIONS (preflight CORS)
    if request.method == "OPTIONS":
        response = JsonResponse({})
        return response

    try:
        data = json.loads(request.body)
        query = data.get('query', '')
        conversation_id = data.get('conversation_id')

        if not query:
            return JsonResponse({'error': 'Query is required'}, status=400)

        # Obtener o crear una conversación
        if conversation_id:
            try:
                conversation = await get_conversation_by_id(conversation_id)
            except Conversation.DoesNotExist:
                return JsonResponse({'error': 'Conversation not found'}, status=404)
        else:
            # Crear nueva conversación
            conversation = await create_conversation(
                user=request.user if request.user.is_authenticated else None,
                session_id=request.session.session_key or 'anonymous'
            )

        # Obtener historial de mensajes para el contexto
        messages = await get_messages_for_conversation(conversation)
        chat_history = [{'role': msg.role, 'content': msg.content} for msg in messages]

        # Guardar el mensaje del usuario
        user_message = await create_message(
            conversation=conversation,
            role='user',
            content=query
        )

        # Procesar la consulta
        response_data = await chat_service.process_query(query, chat_history)

        if 'error' in response_data:
            # Guardar mensaje de error como sistema
            error_message = await create_message(
                conversation=conversation,
                role='system',
                content=response_data.get('fallback_response', response_data['error'])
            )
            return JsonResponse(response_data, status=500)

        # Guardar la respuesta del asistente
        assistant_message = await create_message(
            conversation=conversation,
            role='assistant',
            content=response_data['response']
        )

        return JsonResponse({
            'id': str(assistant_message.id),
            'conversation_id': str(conversation.id),
            'response': response_data['response'],
            'timestamp': assistant_message.created_at.isoformat()
        })

    except Exception as e:
        logger.error(f"Error en chat endpoint: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)
