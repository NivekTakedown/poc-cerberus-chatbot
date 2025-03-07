from django.urls import path
from . import views

app_name = 'chatbot'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/chat/', views.chat, name='chat_api'),
    path('api/feedback/', views.feedback, name='feedback_api'),
    path('api/conversations/', views.conversations, name='conversations_api'),
    path('api/conversations/<uuid:conversation_id>/', views.get_conversation, name='get_conversation_api'),
]
