
# Learn-Ease: Intelligent AI Learning Ecosystem

![Status](https://img.shields.io/badge/Status-MVP%20Ready-success)
![Python](https://img.shields.io/badge/Backend-FastAPI-009688)
![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![AI](https://img.shields.io/badge/AI-Hybrid%20Architecture-blueviolet)

**Learn-Ease** is an enterprise-grade, AI-driven educational platform designed to solve information overload. By leveraging a **Hybrid AI Architecture** (Custom Fine-Tuned Models + LLMs), it transforms static educational content into an interactive, personalized, and measurable learning experience.

> **Value Proposition:** We bridge the gap between passive reading and active retention through RAG-based mentorship, semantic evaluation, and automated content generation.

---

## **🎯 The Problem & Solution**

**The Problem:** Students and professionals struggle to retain information from dense textbooks. Traditional learning management systems (LMS) are static and lack personalized feedback.

**The Solution:** Learn-Ease automates the study process:
* **Instant Content Synthesis:** Summaries, Notes, and Flashcards generated in seconds.
* **Active Recall:** Automated Quizzes with semantic grading (grading based on meaning, not just keywords).
* **24/7 Mentorship:** A RAG-Chatbot that answers questions strictly from the provided material (Zero Hallucination).

---

## **🛠 Core Modules & Features**

### **1. AI Content Generation Engine**
| Feature | Tech Stack | Utility |
| :--- | :--- | :--- |
| **Smart Summarization** | **HuggingFace (Custom)** | Extracts high-value concepts from dense text. |
| **Deep Notes & Flashcards** | **Google Gemini** | Creates structured study materials for active recall. |
| **Glossary Generation** | **SpaCy + PyDictionary** | Auto-detects jargon and provides definitions. |

### **2. Intelligent Assessment System**
- **Semantic Grading:** Uses **all-MiniLM-L6-v2** embeddings to grade user answers based on vector similarity ($\frac{\sum CosineSimilarity}{N}$).
- **Feedback Loop:** Provides detailed explanations for incorrect answers, driving continuous improvement.

### **3. Personalized Learning Path**
- **RAG Chatbot:** Retrieves context from **FAISS Vector Stores** to provide book-specific answers using **Groq LLaMA-3**.
- **AI Recommendations:** Analyzes quiz performance to suggest specific topics for revision.

### **4. Collaborative Suite**
- **Real-Time Communication:** Socket-based group messaging and forums.
- **Progress Analytics:** Visualizes learning trends using **Seaborn** and **Matplotlib**.

---

## **📐 System Architecture**

The platform is built on a scalable, modular architecture designed for high availability.

```mermaid
flowchart TD
    User[User / Student] -->|Interacts| Frontend[Next.js Client]
    Frontend -->|API / WebSocket| Backend[FastAPI Server]
    
    subgraph Data_Layer
    Backend -->|User Data| Mongo[MongoDB]
    Backend -->|Vector Embeddings| FAISS[FAISS Store]
    end
    
    subgraph AI_Engine
    Backend -->|Inference| HF[Custom HF Models]
    Backend -->|Reasoning| Groq[Groq LLaMA-3]
    Backend -->|Generation| Gemini[Google Gemini]
    end
    
    FAISS -->|Context Retrieval| Groq
````

-----

## **💻 Technical Stack**

  * **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts.
  * **Backend:** FastAPI (Python), WebSocket, Pydantic.
  * **Database:** MongoDB (NoSQL), FAISS (Vector DB).
  * **AI/ML:** LangChain, Sentence-Transformers, PyTorch.
  * **Infrastructure:** Modular architecture ready for containerization (Docker).

-----

## **🚀 Future Roadmap**

We are currently in the **MVP (Minimum Viable Product)** phase. Our development roadmap includes:

  * **Phase 1 (Current):** Core AI modules, RAG pipeline, and User Management.
  * **Phase 2:** Mobile Application (React Native) and Offline Mode.
  * **Phase 3:** Institution Dashboard for Professors/Teachers to track class analytics.
  * **Phase 4:** Monetization integration (Freemium model for advanced AI features).

-----

## **📂 Repository Structure**

```text
Learn-Ease/
├── backend/                             # Python FastAPI Microservice
│   ├── core/                            # Core Infrastructure
│   │   ├── config.py                    # Environment & App Config
│   │   ├── db.py                        # MongoDB Connection Handler
│   │   ├── security.py                  # JWT Auth & Hashing
│   │   └── websocket_manager.py         # Socket.IO Manager for Real-time Chat
│   ├── models/                          # Pydantic Schemas (Data Validation)
│   │   ├── ai_schemas.py                # LLM Request/Response models
│   │   ├── quiz_schemas.py              # Quiz Generation & Grading models
│   │   ├── user_schemas.py              # Auth & Profile models
│   │   └── ... (book, chat, forum, progress schemas)
│   ├── routers/                         # API Controllers (REST Endpoints)
│   │   ├── ai_router.py                 # RAG & Content Generation Endpoints
│   │   ├── auth_router.py               # Login/Signup Routes
│   │   ├── chat_router.py               # RAG Chatbot Routes
│   │   └── ... (books, forum, study_groups routes)
│   ├── services/                        # Business Logic Layer
│   │   ├── ai_service.py                # LLM Integration (Gemini/Groq/HF)
│   │   ├── vector_service.py            # FAISS Indexing & Retrieval Logic
│   │   ├── quiz_service.py              # Semantic Evaluation Algorithms
│   │   └── ... (user, chat, notification services)
│   └── user-book-files/                 # Local Data Lake
│       ├── books/                       # Raw PDF Storage
│       ├── extracted-texts/             # Processed Text Chunks
│       └── vector-stores/               # Serialized FAISS Indices (.faiss/.pkl)
│
├── frontend/                            # Next.js 14 Client (App Router)
│   ├── src/
│   │   ├── app/                         # Pages & Routing
│   │   │   ├── (auth)/                  # Authentication Group
│   │   │   ├── books/[bookId]/          # Dynamic Book Pages
│   │   │   │   └── quiz/                # Quiz Interface
│   │   │   ├── dashboard/               # Student Analytics Dashboard
│   │   │   ├── forum/[threadID]/        # Discussion Threads
│   │   │   ├── messages/                # Real-time Chat Interface
│   │   │   └── progress/                # Visual Analytics Page
│   │   ├── components/                  # UI Design System
│   │   │   ├── BookMentorChat.tsx       # RAG Chat Interface
│   │   │   ├── ProgressLineChart.tsx    # Recharts Analytics
│   │   │   ├── ForumThreadCard.tsx      # Community Components
│   │   │   └── ... (Modals, Badges, Inputs)
│   │   ├── lib/                         # Utilities (Date parsing, Formatting)
│   │   └── services/                    # API Client (Axios Wrappers)
│   └── public/                          # Static Assets
│
├── requirements.txt                     # Backend Dependencies
├── package.json                         # Frontend Dependencies
```

-----

## **📩 Contact & Inquiries**

This project is currently under active development. For investment opportunities, technical inquiries, or demo requests, please contact:

**[Your Name]**

  * **Role:** Lead Developer / Founder
  * **Email:** [Your Email]
  * **LinkedIn:** [Your LinkedIn Profile]

-----

*© 2025 Learn-Ease. All Rights Reserved. Proprietary Software.*

```