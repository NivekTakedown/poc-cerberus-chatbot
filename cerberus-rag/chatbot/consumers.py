import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Conversation, Message
from .services.chat_service import ChatService

chat_service = ChatService.get_instance()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        self.session_id = self.scope.get('session', {}).get('session_key', 'anonymous')
        self.conversation_id = self.scope['url_route']['kwargs'].get('conversation_id')

        if self.conversation_id:
            # Join the specific conversation group
            self.room_group_name = f'chat_{self.conversation_id}'
        else:
            # Create a new unique ID for this connection
            self.room_group_name = f'chat_{uuid.uuid4()}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send initial message to client if new conversation
        if not self.conversation_id:
            await self.send(text_data=json.dumps({
                'type': 'system_message',
                'message': 'Hola, soy Cerberus, tu asistente digital. ¿En qué puedo ayudarte hoy?'
            }))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')

        if message_type == 'chat_message':
            query = text_data_json.get('message')
            conversation_id = text_data_json.get('conversation_id')

            # Handle the message
            await self.process_message(query, conversation_id)
        elif message_type == 'feedback':
            await self.process_feedback(
                text_data_json.get('message_id'),
                text_data_json.get('rating')
            )

    async def process_message(self, query, conversation_id):
        # Acknowledge receipt of the message
        await self.send(text_data=json.dumps({
            'type': 'system_message',
            'message': 'Procesando tu consulta...',
            'temp_id': str(uuid.uuid4())  # Temporary ID for the loading message
        }))

        # Get or create conversation
        conversation = None
        if conversation_id:
            try:
                conversation = await sync_to_async(Conversation.objects.get)(id=conversation_id)
            except Conversation.DoesNotExist:
                pass

        if not conversation:
            conversation = await sync_to_async(Conversation.objects.create)(
                user=self.user if self.user.is_authenticated else None,
                session_id=self.session_id
            )
            self.conversation_id = str(conversation.id)

        # Save user message
        user_message = await sync_to_async(Message.objects.create)(
            conversation=conversation,
            role='user',
            content=query
        )

        # Get chat history
        messages = await sync_to_async(list)(Message.objects.filter(conversation=conversation).order_by('created_at'))
        chat_history = [{'role': msg.role, 'content': msg.content} for msg in messages]

        # Process query with streaming
        await self.stream_response(query, chat_history, conversation)

    async def stream_response(self, query, chat_history, conversation):
        response_text = ""
        # Create placeholder for the assistant message
        assistant_message = await sync_to_async(Message.objects.create)(
            conversation=conversation,
            role='assistant',
            content=""  # Empty content initially
        )

        # Get streaming response
        async for token in chat_service.stream_query(query, chat_history):
            response_text += token
            # Send the token to the WebSocket
            await self.send(text_data=json.dumps({
                'type': 'streaming_token',
                'token': token,
                'message_id': str(assistant_message.id)
            }))

        # Update the message with the complete response
        assistant_message.content = response_text
        await sync_to_async(assistant_message.save)()

        # Send complete message notification
        await self.send(text_data=json.dumps({
            'type': 'message_complete',
            'message_id': str(assistant_message.id),
            'conversation_id': str(conversation.id),
            'full_message': response_text
        }))

    async def process_feedback(self, message_id, rating):
        from .models import Feedback

        if not message_id or not rating or not (1 <= int(rating) <= 5):
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Message ID and rating (1-5) are required'
            }))
            return

        try:
            message = await sync_to_async(Message.objects.get)(id=message_id, role='assistant')
            feedback_obj = await sync_to_async(Feedback.objects.create)(
                message=message,
                rating=int(rating)
            )

            # Get the last user message
            last_user_message = await sync_to_async(lambda: message.conversation.messages.filter(role='user').last())()
            query = last_user_message.content if last_user_message else ""

            # Save feedback
            await chat_service.save_feedback_async(query, message.content, int(rating))

            await self.send(text_data=json.dumps({
                'type': 'feedback_received',
                'message_id': message_id,
                'rating': rating
            }))

        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing feedback: {str(e)}'
            }))
