import json
import asyncio
import logging
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.apps import apps
from .models import Conversation, Message, Feedback
from .services.chat_service import ChatService
from asgiref.sync import sync_to_async

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

# Importamos esta función en apps.py para ejecutarla al arrancar la aplicación

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
@require_http_methods(["POST"])
async def chat(request):
    """API endpoint para el chatbot."""
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

# También necesitamos hacer las operaciones de feedback asíncronas
@sync_to_async
def get_message_by_id(message_id):
    return Message.objects.get(id=message_id, role='assistant')

@sync_to_async
def create_feedback_record(message, rating):
    return Feedback.objects.create(
        message=message,
        rating=int(rating)
    )

@sync_to_async
def get_last_user_message(conversation):
    return conversation.messages.filter(role='user').last().content

@csrf_exempt
@require_http_methods(["POST"])
async def feedback(request):
    """API endpoint para guardar feedback de las respuestas."""
    try:
        data = json.loads(request.body)
        message_id = data.get('message_id')
        rating = data.get('rating')

        if not message_id or not rating or not (1 <= int(rating) <= 5):
            return JsonResponse({'error': 'Message ID and rating (1-5) are required'}, status=400)

        try:
            message = await get_message_by_id(message_id)
        except Message.DoesNotExist:
            return JsonResponse({'error': 'Message not found'}, status=404)

        # Guardar feedback
        feedback = await create_feedback_record(message, int(rating))

        # También guardar en el archivo para compatibilidad con el sistema original
        query = await get_last_user_message(message.conversation)
        chat_service.save_feedback(query, message.content, int(rating))

        return JsonResponse({'status': 'success', 'feedback_id': feedback.id})

    except Exception as e:
        logger.error(f"Error en feedback endpoint: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

# También hacemos asíncronas las vistas de listado de conversaciones
@sync_to_async
def get_conversations_for_user(user):
    return list(Conversation.objects.filter(user=user))

@sync_to_async
def get_conversations_for_session(session_id):
    return list(Conversation.objects.filter(session_id=session_id))

@require_http_methods(["GET"])
async def conversations(request):
    """API endpoint para obtener todas las conversaciones del usuario."""
    if request.user.is_authenticated:
        conversations_list = await get_conversations_for_user(request.user)
    else:
        conversations_list = await get_conversations_for_session(request.session.session_key or 'anonymous')

    data = [{
        'id': str(conv.id),
        'created_at': conv.created_at.isoformat(),
        'updated_at': conv.updated_at.isoformat(),
        'messages_count': conv.messages.count()
    } for conv in conversations_list]

    return JsonResponse({'conversations': data})

@sync_to_async
def get_conversation_with_messages(conversation_id, user=None, session_id=None):
    if user:
        conversation = Conversation.objects.get(id=conversation_id, user=user)
    else:
        conversation = Conversation.objects.get(id=conversation_id, session_id=session_id)

    messages = Message.objects.filter(conversation=conversation).order_by('created_at')
    return conversation, list(messages)

@require_http_methods(["GET"])
async def get_conversation(request, conversation_id):
    """API endpoint para obtener los mensajes de una conversación específica."""
    try:
        if request.user.is_authenticated:
            conversation, messages = await get_conversation_with_messages(
                conversation_id,
                user=request.user
            )
        else:
            conversation, messages = await get_conversation_with_messages(
                conversation_id,
                session_id=request.session.session_key or 'anonymous'
            )

        data = []
        for msg in messages:
            feedback_instance = await sync_to_async(lambda: msg.feedback.first())()
            feedback_rating = feedback_instance.rating if feedback_instance else None

            data.append({
                'id': str(msg.id),
                'role': msg.role,
                'content': msg.content,
                'created_at': msg.created_at.isoformat(),
                'feedback': feedback_rating
            })

        return JsonResponse({
            'conversation_id': str(conversation.id),
            'created_at': conversation.created_at.isoformat(),
            'messages': data
        })

    except Conversation.DoesNotExist:
        return JsonResponse({'error': 'Conversation not found'}, status=404)
    except Exception as e:
        logger.error(f"Error en get_conversation endpoint: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)
