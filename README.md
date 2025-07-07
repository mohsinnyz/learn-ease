# 📘 Learn-Ease: AI-Powered Learning Companion

Learn-Ease is a smart educational platform designed to help students simplify and streamline their study process. By leveraging state-of-the-art Natural Language Processing (NLP) models and modern web technologies, Learn-Ease enables students to upload textbooks and automatically generate study resources like summaries, flashcards, quizzes, and personalized recommendations.

---

## 🚀 Features

### 📚 Course Companion
- Upload textbooks in PDF format
- Automatic text extraction
- AI-generated **chapter-wise summaries** and **glossaries**

### ✏️ Study Material Generation
- **Study Notes**: Generate concise, structured notes using fine-tuned LLaMA 3 models
- **Flashcards**: Instant flashcard creation for revision
- **Export Options**: Save and download study materials in multiple formats

### 🧠 Quiz Generation & Evaluation
- **MCQs & Short Answers** from textbook content
- Attempt quizzes within the platform
- **AI-based Evaluation** using Sentence-BERT and Cosine Similarity for short answers

### ❓ Question & Answer Generation
- Open-ended question generation with AI-suggested answers

### 📊 Progress Tracking
- Track quiz performance
- Visualize strengths and weaknesses
- Trend analysis using Matplotlib/Seaborn

### 🎯 Personalized Recommendations
- Identify weak areas
- Get tailored study suggestions powered by **TensorFlow Recommender**

### 🤖 AI Mentor
- Smart chatbot using **LLaMA 3** to answer context-based book queries

### 👨‍🏫 Collaborative Learning
- Create or join study groups
- Post questions and answers in forums
- Real-time discussions and group notifications

---

## 🛠️ Tech Stack

### Frontend
- React.js (with Tailwind CSS)
- Component-based architecture

### Backend
- Node.js / Express.js
- REST APIs

### AI & ML Models
- 📄 Summarization: Fine-tuned T5-base on BookSum dataset
- 🧠 Flashcard Generation: LLaMA 3 via Hugging Face Inference API
- 🧪 MCQ Generation: BERT trained on RACE/SciQ datasets
- 📌 QA Evaluation: Sentence-BERT with Cosine Similarity
- 🎯 Recommender System: TensorFlow Recommender
- 🤖 Chatbot: LLaMA 3 model (context-aware)

### Other Tools
- MongoDB (Database)
- Hugging Face Transformers
- Google Colab (Model Training)
- GitHub (Version Control)

---

## 📂 Project Structure

```

Learn-Ease/
│
├── frontend/              # React frontend
│   └── src/components/    # React components like FlashcardPopup, QuizUI, etc.
│
├── backend/               # Node.js API backend
│   └── routes/            # API routes for quiz, summary, flashcards, etc.
│
├── models/                # ML models for generation tasks
│   ├── summarizer/        # T5 fine-tuned summarizer
│   ├── mcq\_generator/     # BERT-based MCQ generator
│   └── flashcard\_bot/     # Flashcard LLaMA API logic
│
├── notebooks/             # Colab notebooks for training
│   └── T5\_booksum\_train.ipynb
│
└── README.md              # Project documentation

````

---

## 📈 Future Enhancements
- Voice-enabled AI mentor
- Offline support for flashcards and notes
- Integration with LMS platforms like Moodle or Google Classroom
- Adaptive learning based on real-time performance

---

## 💡 How to Run the Project

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/learn-ease.git
cd learn-ease
````

### 2. Start the Backend Server

```bash
cd backend
npm install
npm start
```

### 3. Start the Frontend App

```bash
cd frontend
npm install
npm run dev
```

---

## 🤝 Contributors

* \[Your Name] – Project Lead & AI Developer
* \[Collaborators (if any)] – Role

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

