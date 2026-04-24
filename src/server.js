import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import {
  config,
  createStudent,
  createTeacher,
  dashboardOverview,
  deleteStudent,
  getStudent,
  leaderboard,
  listStudents,
  listTeachers,
  login,
  me,
  updateStudent,
} from "./controllers/appController.js";
import { gapAnalysis, mockQuestion, answerFeedback, chat } from "./controllers/aiController.js";
import { authenticateToken, authorizeRoles } from "./middleware/auth.js";
import { syncDatabase } from "./models/index.js";
import { seedDefaultData } from "./seeders/seed.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "https://ssca-frontend.vercel.app", "http://localhost:5173"].filter(Boolean),
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Smart Student Competency Analysis API" });
});

app.post("/api/auth/login", login);
app.get("/api/auth/me", authenticateToken, me);

app.get("/api/config", authenticateToken, config);

app.get("/api/teachers", authenticateToken, authorizeRoles("admin"), listTeachers);
app.post("/api/teachers", authenticateToken, authorizeRoles("admin"), createTeacher);

app.get("/api/students", authenticateToken, listStudents);
app.get("/api/students/:id", authenticateToken, getStudent);
app.post("/api/students", authenticateToken, authorizeRoles("teacher"), createStudent);
app.put("/api/students/:id", authenticateToken, authorizeRoles("teacher"), updateStudent);
app.delete("/api/students/:id", authenticateToken, authorizeRoles("teacher"), deleteStudent);

app.get("/api/dashboard/overview", authenticateToken, dashboardOverview);
app.get("/api/dashboard/leaderboard", authenticateToken, leaderboard);

// AI Features Routes
app.post("/api/ai/gap-analysis", authenticateToken, gapAnalysis);
app.post("/api/ai/mock-question", authenticateToken, mockQuestion);
app.post("/api/ai/answer-feedback", authenticateToken, answerFeedback);
app.post("/api/ai/chat", authenticateToken, chat);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: "An unexpected server error occurred.",
    detail: error.message,
  });
});

const startServer = async () => {
  await syncDatabase();
  await seedDefaultData();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});

export default app;
