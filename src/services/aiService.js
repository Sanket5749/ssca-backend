import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CAREERBOT_SYSTEM_PROMPT = `You are "CareerBot," an expert Technical Recruiter and Career Coach specializing in the MERN stack and DSA.

Your expertise:
- MERN Stack (MongoDB, Express, React, Node.js)
- Data Structures and Algorithms (DSA)
- Placement preparation
- Interview coaching
- Skill gap analysis

TASK 1: GAP ANALYSIS
When a user provides a Job Description (JD) and their Skill Profile, analyze the "Delta."
1. Identify "Matched Skills" (High confidence match - skills they have that the JD requires)
2. Identify "Missing Skills" (Critical gaps - skills required by JD but missing from profile)
3. Provide a 4-week roadmap to bridge the gap using specific project ideas
4. Calculate a "Compatibility Score" (0-100%)

Output Format for Gap Analysis:
\`\`\`json
{
  "compatibilityScore": 75,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "roadmap": {
    "week1": "Description of week 1 focus",
    "week2": "Description of week 2 focus",
    "week3": "Description of week 3 focus",
    "week4": "Description of week 4 focus"
  },
  "projectIdeas": ["project1", "project2"]
}
\`\`\`

TASK 2: DYNAMIC QUESTIONING (Mock Interview)
If the user asks for a "Random Question" or "Practice," look at their lowest competency score and generate a high-quality technical interview question.
- Focus on weak areas from their profile
- Start with medium difficulty, increase based on their answers
- Ask follow-up questions
- Provide constructive feedback

Output Format for Questions:
\`\`\`json
{
  "question": "The question text",
  "difficulty": "Medium",
  "category": "DSA/Frontend/Backend",
  "hints": ["hint1", "hint2"],
  "expectedAnswer": "Brief explanation of expected answer"
}
\`\`\`

General Guidelines:
- Keep responses concise and encouraging
- Use Markdown for bolding and lists
- Be supportive and motivating
- Provide actionable advice
- Use LaTeX format for complex algorithms: \`$code$\` for inline, \`$$code$$\` for blocks`;

/**
 * Gap Analysis using Gemini AI
 */
export const analyzeSkillGap = async (jobDescription, studentProfile) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `${CAREERBOT_SYSTEM_PROMPT}

ANALYZE THIS:
Job Description:
${jobDescription}

Student Profile:
- Name: ${studentProfile.fullName}
- CGPA: ${studentProfile.currentCgpa}
- Current Skills: ${studentProfile.skills?.map(s => s.name).join(", ") || "N/A"}
- LeetCode Problems Solved: ${studentProfile.leetCodeSolved}
- CodeChef Rating: ${studentProfile.codeChefRating}
- Projects Completed: ${studentProfile.projects?.length || 0}
- Certifications: ${studentProfile.certifications?.map(c => c.title).join(", ") || "N/A"}

Perform a detailed gap analysis and provide the output in the specified JSON format.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      message: responseText,
      compatibilityScore: 50,
      matchedSkills: [],
      missingSkills: [],
    };
  } catch (error) {
    console.error("Gap Analysis Error:", error.message);
    throw new Error(`Gap Analysis failed: ${error.message}`);
  }
};

/**
 * Generate Mock Interview Question based on weak areas
 */
export const generateMockQuestion = async (studentProfile, category = null) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Identify weakest area
    let focusArea = category || "DSA";
    if (studentProfile.skills && studentProfile.skills.length > 0) {
      const weakestSkill = studentProfile.skills.reduce((prev, current) =>
        (prev.score || 0) < (current.score || 0) ? prev : current
      );
      focusArea = weakestSkill.name || "DSA";
    }

    const prompt = `${CAREERBOT_SYSTEM_PROMPT}

Generate a mock interview question for a student with this profile:
- Name: ${studentProfile.fullName}
- CGPA: ${studentProfile.currentCgpa}
- Skills: ${studentProfile.skills?.map(s => s.name).join(", ") || "N/A"}
- Focus Area (Weakest): ${focusArea}
- LeetCode Problems: ${studentProfile.leetCodeSolved}

Generate ONE technical interview question in the specified JSON format focusing on their weak area (${focusArea}).
Make it realistic and challenging but fair for a placement interview.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      question: responseText,
      difficulty: "Medium",
      category: focusArea,
    };
  } catch (error) {
    console.error("Question Generation Error:", error.message);
    throw new Error(`Question generation failed: ${error.message}`);
  }
};

/**
 * Get AI Feedback on Interview Answer
 */
export const getInterviewFeedback = async (question, studentAnswer, studentProfile) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `${CAREERBOT_SYSTEM_PROMPT}

As an expert interviewer, evaluate this student's answer:

Question: ${question}
Student's Answer: ${studentAnswer}
Student Profile: ${studentProfile.fullName} (CGPA: ${studentProfile.currentCgpa})

Provide:
1. Score (0-10)
2. What they did well
3. Areas for improvement
4. Correct answer/approach (if applicable)
5. Follow-up question to deepen understanding

Keep response encouraging and constructive. Use Markdown formatting.`;

    const result = await model.generateContent(prompt);
    return {
      feedback: result.response.text(),
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Feedback Generation Error:", error.message);
    throw new Error(`Feedback generation failed: ${error.message}`);
  }
};

/**
 * General CareerBot Chat
 */
export const chatWithCareerBot = async (message, studentProfile, conversationHistory = []) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    let prompt = `${CAREERBOT_SYSTEM_PROMPT}

Student Context:
- Name: ${studentProfile.fullName}
- CGPA: ${studentProfile.currentCgpa}
- Skills: ${studentProfile.skills?.map(s => s.name).join(", ") || "N/A"}

Previous Messages:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n")}

Student Message: ${message}

Respond as CareerBot, keeping responses concise, encouraging, and actionable.`;

    const result = await model.generateContent(prompt);
    return {
      response: result.response.text(),
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("ChatBot Error:", error.message);
    throw new Error(`ChatBot response failed: ${error.message}`);
  }
};

export default {
  analyzeSkillGap,
  generateMockQuestion,
  getInterviewFeedback,
  chatWithCareerBot,
};
