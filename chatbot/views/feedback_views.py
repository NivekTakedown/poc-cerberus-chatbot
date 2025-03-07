import json
import asyncio
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from asgiref.sync import sync_to_async

from ..models import Message, Feedback
from ..services.chat_service import ChatService

logger = logging.getLogger(__name__)
chat_service = ChatService.get_instance()

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
    last_user_message = conversation.messages.filter(role='user').last()
    if last_user_message:
        return last_user_message.content
    return ""

@sync_to_async
def save_feedback_to_file(query, answer, rating):
    # Envolvemos la función síncrona de chat_service con sync_to_async
    return chat_service.save_feedback(query, answer, rating)

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

        # Guardar feedback en la base de datos
        feedback_obj = await create_feedback_record(message, int(rating))

        # Obtener la última consulta del usuario de forma segura
        query = await get_last_user_message(message.conversation)

        # Usar nuestra función envuelta en sync_to_async
        await save_feedback_to_file(query, message.content, int(rating))

        return JsonResponse({'status': 'success', 'feedback_id': str(feedback_obj.id)})

    except Exception as e:
        logger.error(f"Error en feedback endpoint: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)
