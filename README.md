## Dossier

#### Author: Phoebee Lin
#### Institution: Art Center Graphic Design Department

---

## Stack

- **Frontend**: React + TypeScript (Vite), port `3000`
- **Backend**: Python + FastAPI, port `8000`

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- Python 3.11+

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:3000

---

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at http://localhost:8000  
Interactive docs at http://localhost:8000/docs

---

## Project Structure

```
dossier/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── backend/           # FastAPI app
    ├── routers/
    │   └── projects.py
    ├── main.py
    └── requirements.txt
```


# Frontend
cd frontend && npm run dev

# Backend (separate terminal)
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000


# Database
alembic revision --autogenerate -m "describe your change"
alembic upgrade head