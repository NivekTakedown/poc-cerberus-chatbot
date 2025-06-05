# Cerberus Chatbot - POC

A proof of concept for an intelligent chatbot system built with Django (backend) and React (frontend), designed to provide AI-powered conversational capabilities.

## Project Structure

```
poc-cerberus-chatbot/
├── cerberus-rag/          # Django backend with RAG capabilities
│   ├── manage.py
│   ├── requirements.txt
│   ├── cerberus_chatbot/  # Django project settings
│   ├── chatbot/           # Main chatbot application
│   └── data/              # Data files for RAG
├── cerberus-wa/           # React frontend web application
│   ├── package.json
│   ├── src/
│   └── public/
└── docker-compose.yml     # Docker orchestration
```

## Features

- **RAG-powered Chatbot**: Retrieval-Augmented Generation for intelligent responses
- **Real-time Chat Interface**: React-based responsive chat UI
- **WebSocket Support**: Real-time communication between frontend and backend
- **Dockerized Deployment**: Easy deployment with Docker Compose
- **API Integration**: RESTful API for chatbot interactions

## Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- Python 3.8+ (for local development)
- **Ollama**: Required for local LLM inference
  - Download and install from [https://ollama.ai/](https://ollama.ai/)
  - Ensure Ollama service is running before starting the application

## Quick Start with Docker

1. **Start Ollama service**
   ```bash
   # Start Ollama daemon (if not already running)
   ollama serve
   
   # In another terminal, pull required models (example)
   ollama pull llama2
   # or your preferred model
   ```

2. **Clone the repository**
   ```bash
   git clone git@github.com:NivekTakedown/poc-cerberus-chatbot.git
   cd poc-cerberus-chatbot
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Local Development

### Prerequisites Setup

1. **Install and start Ollama**
   ```bash
   # Download from https://ollama.ai/ and install
   
   # Start Ollama service
   ollama serve
   
   # Pull a model for chatbot use
   ollama pull llama2  # or your preferred model
   ```

### Backend (cerberus-rag)

1. **Navigate to the backend directory**
   ```bash
   cd cerberus-rag
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Start the development server**
   ```bash
   python manage.py runserver
   ```

### Frontend (cerberus-wa)

1. **Navigate to the frontend directory**
   ```bash
   cd cerberus-wa
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open http://localhost:3000 in your browser

## Configuration

### Environment Variables

#### Backend (cerberus-rag)
- Configure Django settings in [`cerberus_chatbot/settings.py`](cerberus-rag/cerberus_chatbot/settings.py)
- Database: SQLite (default) or configure PostgreSQL/MySQL

#### Frontend (cerberus-wa)
- Copy [`.env.example`](cerberus-wa/.env.example) to `.env`
- Configure API URL and other environment variables

## API Endpoints

- **Chat API**: `/chatbot/api/` - Main chatbot interaction endpoint
- **WebSocket**: Available for real-time communication

## Docker Configuration

The project uses Docker Compose for easy deployment:

- **webapp**: Django backend service (port 8000)
- **webui**: React frontend service (port 3000)
- **local-network**: Bridge network for service communication

## Architecture

### Backend (Django)
- **RAG Implementation**: Retrieval-Augmented Generation for context-aware responses
- **WebSocket Support**: Real-time communication via Django Channels
- **API Layer**: RESTful endpoints for frontend integration
- **Data Management**: SQLite database with chat history and user sessions

### Frontend (React)
- **CerberusChat Component**: Main chat interface
- **Real-time Updates**: WebSocket integration for live conversations
- **Responsive Design**: Mobile-friendly chat interface
- **API Integration**: HTTP client for backend communication

## Development Scripts

### Frontend (cerberus-wa)
- `npm start`: Start development server
- `npm test`: Run test suite
- `npm run build`: Build for production
- `npm run eject`: Eject from Create React App

### Backend (cerberus-rag)
- `daphne -b 0.0.0.0 -p 8000 cerberus_chatbot.asgi:application`: Start development server

## Deployment

### Docker Deployment
```bash
docker-compose up -d --build
```

