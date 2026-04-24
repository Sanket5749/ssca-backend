import {
  analyzeSkillGap,
  chatWithCareerBot,
  generateMockQuestion,
  getInterviewFeedback,
} from "../services/aiService.js";
import { Student, Skill } from "../models/index.js";

/**
 * POST /api/ai/gap-analysis
 * Analyze skill gap between student profile and job description
 */
export const gapAnalysis = async (req, res) => {
  try {
    const { studentId, jobDescription } = req.body;

    if (!studentId || !jobDescription) {
      return res.status(400).json({
        error: "studentId and jobDescription are required",
      });
    }

    const student = await Student.findByPk(studentId, {
      include: [
        { model: Skill, as: "skills" },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const analysis = await analyzeSkillGap(jobDescription, student);

    res.json({
      success: true,
      studentId,
      analysis,
      analyzedAt: new Date(),
    });
  } catch (error) {
    console.error("Gap Analysis Error:", error);
    res.status(500).json({
      error: "Gap analysis failed",
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/mock-question
 * Generate a mock interview question based on student's weak areas
 */
export const mockQuestion = async (req, res) => {
  try {
    const { studentId, category } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const student = await Student.findByPk(studentId, {
      include: [
        { model: Skill, as: "skills" },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const question = await generateMockQuestion(student, category);

    res.json({
      success: true,
      studentId,
      question,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Mock Question Error:", error);
    res.status(500).json({
      error: "Failed to generate question",
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/answer-feedback
 * Get feedback on a student's interview answer
 */
export const answerFeedback = async (req, res) => {
  try {
    const { studentId, question, answer } = req.body;

    if (!studentId || !question || !answer) {
      return res.status(400).json({
        error: "studentId, question, and answer are required",
      });
    }

    const student = await Student.findByPk(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const feedback = await getInterviewFeedback(question, answer, student);

    res.json({
      success: true,
      studentId,
      feedback,
      processedAt: new Date(),
    });
  } catch (error) {
    console.error("Answer Feedback Error:", error);
    res.status(500).json({
      error: "Failed to generate feedback",
      message: error.message,
    });
  }
};

/**
 * POST /api/ai/chat
 * Chat with CareerBot
 */
export const chat = async (req, res) => {
  try {
    const { studentId, message, conversationHistory } = req.body;

    if (!studentId || !message) {
      return res.status(400).json({
        error: "studentId and message are required",
      });
    }

    const student = await Student.findByPk(studentId, {
      include: [
        { model: Skill, as: "skills" },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const response = await chatWithCareerBot(
      message,
      student,
      conversationHistory || []
    );

    res.json({
      success: true,
      studentId,
      message,
      response: response.response,
      timestamp: response.timestamp,
    });
  } catch (error) {
    console.error("ChatBot Error:", error);
    res.status(500).json({
      error: "ChatBot failed to respond",
      message: error.message,
    });
  }
};

export default {
  gapAnalysis,
  mockQuestion,
  answerFeedback,
  chat,
};
