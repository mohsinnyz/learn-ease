# 📘 Learn-Ease: AI-Powered Learning Portal

**Learn-Ease** is your intelligent study companion. It allows students to upload textbooks and automatically generate rich study content such as summaries, notes, flashcards, quizzes, and performance-based recommendations using advanced AI models.

---

## 🗂️ Project Structure

```

LEARN-EASE-FYP/
├── backend/                 # FastAPI backend
│   ├── core/               # App configuration and utilities
│   ├── models/             # Database and Pydantic models
│   ├── routers/            # API endpoints
│   ├── services/           # Core logic and integrations (ML models, RAG, etc.)
│   ├── **pycache**/        # Python cache
│   ├── venv/               # Virtual environment
│   ├── main.py             # Entry point (FastAPI app)
│   └── requirements.txt    # Backend dependencies
│
├── frontend/               # Next.js frontend
│   ├── .next/              # Compiled Next.js build files
│   ├── node\_modules/       # Dependencies
│   ├── public/             # Static assets
│   └── src/                # Frontend components and pages
│
├── user-book-files/        # Uploaded user textbooks
│
├── .gitignore
├── README.md               # Project documentation
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS setup
├── tsconfig.json           # TypeScript config
├── package.json            # Frontend dependencies
├── postcss.config.mjs
└── eslint config files

````

---

## 🚀 Features

### 📚 Course Companion
- Upload PDF textbooks
- Automatic text extraction
- AI-powered summaries and glossaries

### 📝 Study Material Generator
- **Study Notes**: Structured notes using fine-tuned LLaMA 3
- **Flashcards**: Auto-generated key concepts
- **Download Options** for offline study

### 🧠 Quiz Generator & Evaluator
- MCQ and short-answer quiz generation
- Quiz attempt interface with instant feedback
- Semantic answer evaluation using SBERT + cosine similarity

### 💬 AI Mentor
- Context-aware chatbot trained on uploaded book data
- LLaMA 3 integration via Hugging Face Inference API

### 📊 Progress Tracker
- Visual performance analysis using Matplotlib / Seaborn
- Weak concept detection and improvement suggestions

### 🎯 Personalized Recommendations
- TensorFlow-based recommender system
- Adaptive learning suggestions

### 👨‍🏫 Collaborative Learning (Planned)
- Forum-based Q&A
- Group creation and interaction

---

## 🧠 Tech Stack

### Backend
- **FastAPI** for APIs
- **Python** for business logic and ML integration
- **Sentence-BERT, T5, LLaMA 3** for various NLP tasks
- **MongoDB** (or other DB) for data storage

### Frontend
- **Next.js + TypeScript**
- **Tailwind CSS** for UI styling
- **Axios** for API calls

### AI & Model Tools
- Hugging Face Transformers
- Google Colab (model fine-tuning)
- TensorFlow Recommender

---

## ⚙️ Getting Started

### Prerequisites
- Node.js & npm
- Python 3.10+
- MongoDB (if using)
- Git

---

### 🔧 Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate (Windows)
pip install -r requirements.txt
uvicorn main:app --reload
````

---

### 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📈 Model Training (Optional)

> Colab Notebooks (Not included here)

* `T5_booksum_train.ipynb`
* `BERT_mcq_generator.ipynb`
* `flashcard_llama_integration.ipynb`

---

## 🌐 Environment Variables

Create a `.env` file in the `backend/` folder and include:

```
HUGGINGFACE_API_KEY=your_hf_key
MONGO_URI=your_mongodb_uri
...
```

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developed By

* **Mohsin Niaz** – AI Engineer & Full-Stack Developer
* \[Talal Amjad]

