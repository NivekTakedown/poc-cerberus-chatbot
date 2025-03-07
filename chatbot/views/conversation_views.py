import logging
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from asgiref.sync import sync_to_async

from ..models import Conversation, Message

logger = logging.getLogger(__name__)

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

    # Define una función auxiliar para obtener el conteo de mensajes de forma segura
    @sync_to_async
    def get_messages_count(conversation):
        return conversation.messages.count()

    # Construye la respuesta usando operaciones asíncronas
    data = []
    for conv in conversations_list:
        count = await get_messages_count(conv)
        data.append({
            'id': str(conv.id),
            'created_at': conv.created_at.isoformat(),
            'updated_at': conv.updated_at.isoformat(),
            'messages_count': count
        })

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
