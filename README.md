# Human-in-the-Loop Workflow Engine

A full-stack workflow management system with human approval gates, real-time status tracking, and executable workflow steps.

## Tech Stack

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- dotenv for configuration

**Frontend:**
- React 19
- Tailwind CSS 3
- Responsive UI with status badges and logs

## Project Structure

```
backend/
├── controllers/     # API endpoint handlers
├── models/          # MongoDB schemas
├── routes/          # API route definitions
├── services/        # Service layer (planner, executor)
├── tools/           # Tool registry and implementations
├── executor/        # Workflow execution logic
├── planner/         # Workflow planning logic
└── index.js         # Express server entry point

frontend/
├── src/
│   ├── App.js       # Main React component
│   ├── App.css      # Tailwind directives
│   ├── index.css    # Global styles
│   └── index.js     # React entry point
├── package.json     # Dependencies
└── tailwind.config.js # Tailwind configuration
```

## Setup & Installation

### Prerequisites
- Node.js 18+ installed
- MongoDB running (local or Atlas)
- npm or yarn package manager

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in backend folder:
```env
DBURI=mongodb://localhost:27017/workflow-engine
PORT=3000
```

Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:3000`

### Frontend Setup

```bash
cd frontend
npm install
```

Start the frontend dev server:
```bash
npm start
```

Frontend will run on `http://localhost:3000` (or next available port like 3001). The proxy in `package.json` forwards API calls to backend.

> **Note:** If you prefer direct API calls without proxy, set `REACT_APP_API_BASE=http://localhost:3000` before running.

## Features

### Create Workflow
1. Enter a User ID and workflow prompt
2. Backend plans the workflow steps
3. Workflow enters `waiting_approval` state

### Review Workflow
- **Status Badge:** Visual indicator (yellow=waiting, blue=processing, green=completed, red=failed)
- **Steps List:** Each step shows tool type, input parameters, and status
- **Activity Logs:** Timestamp-based log entries with color-coded severity (info, warning, error, success)
- **Manual Refresh:** Update workflow status on demand

### Approve & Execute
- Click **Approve & Execute** to execute the workflow steps
- Backend processes steps sequentially
- Logs update in real-time
- Frontend auto-polls every 3 seconds while `processing`

### Rephrase Steps (Optional)
- While workflow is `waiting_approval`, modify steps with rephrase prompt
- Triggers re-planning with new context

### Reject Workflow
- Cancel workflow and set status to `rejected`
- All changes discarded

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workflow` | Create new workflow |
| GET | `/api/workflow/:id` | Fetch workflow details with logs |
| POST | `/api/workflow/:id/rephrase` | Rephrase workflow steps |
| POST | `/api/workflow/:id/approve` | Approve and execute workflow |
| POST | `/api/workflow/:id/reject` | Reject workflow |

## Styling

The frontend uses **Tailwind CSS v3** with:
- Gradient backgrounds (slate tones)
- Color-coded status badges (yellow, blue, green, red)
- Responsive grid layout (mobile-first)
- Smooth transitions and hover effects
- Scrollable log panels

## Running Both Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm start
```

Then open browser to `http://localhost:3000` (or wherever frontend started).

## Workflow States

- **created** → Initial state after creation
- **waiting_approval** → Ready for user review/approval
- **processing** → Executing workflow steps
- **completed** → All steps executed successfully
- **failed** → Execution error occurred
- **rejected** → User rejected the workflow

## Configuration

### MongoDB Connection
Edit `.env` in backend folder:
```env
DBURI=mongodb+srv://user:pass@cluster.mongodb.net/workflow-engine
```

### Backend Port
```env
PORT=5000  # or any port
```

### Frontend API Base
```bash
export REACT_APP_API_BASE=http://api.example.com
npm start
```

## Development Notes

- Frontend automatically proxies `/api/*` calls to backend during development
- Workflow logs persist in MongoDB
- Each workflow has unique ID (MongoDB ObjectId)
- Auto-refresh stops once workflow exits `processing` state
- Buttons are disabled when workflow is not in valid state for that action

---

**Ready to go!** Start both servers and create your first workflow. 🚀
