from django.urls import path
from .views import chat_views, conversation_views, feedback_views

app_name = 'chatbot'

urlpatterns = [
    path('', chat_views.index, name='index'),
    path('api/chat/', chat_views.chat, name='chat_api'),
    path('api/feedback/', feedback_views.feedback, name='feedback_api'),
    path('api/conversations/', conversation_views.conversations, name='conversations_api'),
    path('api/conversations/<uuid:conversation_id>/', conversation_views.get_conversation, name='get_conversation_api'),
]
