import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  AttendanceRecord,
  Certification,
  Extracurricular,
  Project,
  Score,
  SemesterRecord,
  Skill,
  Student,
} from "../models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scoringConfig = JSON.parse(
  readFileSync(path.resolve(__dirname, "../config/scoringConfig.json"), "utf-8")
);

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toRounded = (value) => Number(clamp(value).toFixed(2));

const getSkillScore = (skill) => {
  if (typeof skill?.score === "number" && Number.isFinite(skill.score)) {
    return clamp(skill.score);
  }

  if (skill?.level && scoringConfig.levelScores[skill.level]) {
    return scoringConfig.levelScores[skill.level];
  }

  return 0;
};

const getSkillMap = (skills) =>
  skills.reduce((map, skill) => {
    map[skill.name] = getSkillScore(skill);
    return map;
  }, {});

const calculateTrend = (semesterRecords) => {
  if (semesterRecords.length < 3) return "Stable";

  const ordered = [...semesterRecords].sort((a, b) => a.semesterNumber - b.semesterNumber);
  const lastThree = ordered.slice(-3).map((record) => record.gpa);

  if (lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2]) return "Improving";
  if (lastThree[0] > lastThree[1] && lastThree[1] > lastThree[2]) return "Declining";

  return "Stable";
};

const calculateAcademicScore = (student, semesterRecords, attendanceRecords) => {
  const schoolAverage = average([student.sscPercentage, student.hscPercentage]);
  const semesterAverage = average(semesterRecords.map((record) => record.gpa * 10));
  const subjectAttendanceAverage = average(
    attendanceRecords.map((record) => record.attendancePercentage)
  );

  const cgpaComponent = (student.currentCgpa / 10) * 45;
  const schoolComponent = (schoolAverage / 100) * 20;
  const semesterComponent = (semesterAverage / 100) * 15;
  const backlogPenalty = Math.min(student.backlogsCount, 5) * 4;
  const attendanceComponent =
    average([student.overallAttendance, subjectAttendanceAverage || student.overallAttendance]) *
    0.2;

  return clamp(cgpaComponent + schoolComponent + semesterComponent + attendanceComponent - backlogPenalty);
};

const calculateSkillsScore = (skills) => {
  const technicalSkills = skills.filter((skill) => skill.category === "technical");
  const languages = skills.filter((skill) => skill.category === "language");
  const coreSubjects = skills.filter((skill) => skill.category === "coreSubject");

  const technicalAverage = average(technicalSkills.map(getSkillScore));
  const languageBreadth = clamp((languages.length / 4) * 100);
  const languageAverage = average(languages.map(getSkillScore));
  const coreAverage = average(coreSubjects.map(getSkillScore));

  return clamp(technicalAverage * 0.55 + languageBreadth * 0.15 + languageAverage * 0.1 + coreAverage * 0.2);
};

const calculateProjectsScore = (projects) => {
  if (!projects.length) return 0;

  const complexityScore = average(
    projects.map((project) => scoringConfig.projectComplexityScores[project.complexity] || 0)
  );
  const projectCountScore = clamp((projects.length / 4) * 100);
  const githubCoverage = clamp(
    (projects.filter((project) => project.githubLink).length / projects.length) * 100
  );

  return clamp(complexityScore * 0.55 + projectCountScore * 0.25 + githubCoverage * 0.2);
};

const calculateCertificationScore = (certifications) => {
  if (!certifications.length) return 0;

  const relevanceAverage = average(certifications.map((item) => item.relevanceScore));
  const countScore = clamp((certifications.length / 3) * 100);

  return clamp(relevanceAverage * 0.65 + countScore * 0.35);
};

const calculateAptitudeCodingScore = (student, skills) => {
  const dsaSkill = skills.find((skill) => skill.name === "DSA");
  const dsaScore = getSkillScore(dsaSkill);
  const leetCodeScore = clamp((student.leetCodeSolved / 250) * 100);
  const codeChefScore = clamp((student.codeChefRating / 2200) * 100);
  const communicationScore = clamp(student.communicationScore);

  return clamp(
    student.aptitudeScore * 0.3 +
      dsaScore * 0.25 +
      leetCodeScore * 0.15 +
      codeChefScore * 0.1 +
      student.mockInterviewScore * 0.1 +
      communicationScore * 0.1
  );
};

const calculateExtracurricularScore = (extracurriculars) => {
  if (!extracurriculars.length) return 0;

  const impactAverage = average(extracurriculars.map((item) => item.impactScore));
  const breadthScore = clamp((new Set(extracurriculars.map((item) => item.category)).size / 4) * 100);
  const countScore = clamp((extracurriculars.length / 5) * 100);

  return clamp(impactAverage * 0.5 + breadthScore * 0.2 + countScore * 0.3);
};

const dedupe = (items) => [...new Set(items.filter(Boolean))];

const buildInsights = ({
  student,
  skills,
  projects,
  certifications,
  extracurriculars,
  semesterRecords,
  scores,
}) => {
  const thresholds = scoringConfig.thresholds;
  const skillMap = getSkillMap(skills);
  const strengths = [];
  const weaknesses = [];
  const risks = [];
  const suggestions = [];
  const skillGap = [];
  const trend = calculateTrend(semesterRecords);
  const projectCount = projects.length;
  const certificationCount = certifications.length;
  const hackathons = extracurriculars.filter((item) => item.category === "Hackathon").length;
  const languageCount = skills.filter((item) => item.category === "language").length;
  const backendSkill = skillMap["Backend Development"] || 0;
  const dsaScore = skillMap.DSA || 0;
  const hasHighComplexProject = projects.some((project) => project.complexity === "High");
  const hasGithubPortfolio = projects.some((project) => project.githubLink);

  if (dsaScore > thresholds.advancedDsaScore && projectCount > 2) {
    strengths.push("Strong problem-solving and project experience");
  }

  if (student.currentCgpa >= thresholds.strongCgpa) {
    strengths.push("Strong academic performer");
  }

  if (student.currentCgpa > thresholds.goodCgpa) {
    strengths.push("Strong academic performance");
  }

  if ((skills.find((skill) => skill.name === "DSA")?.level || "") === "Advanced") {
    strengths.push("Strong problem-solving ability");
  }

  if (languageCount >= thresholds.goodLanguageCount) {
    strengths.push("Good technical versatility");
  }

  if (projectCount >= thresholds.excellentProjects && hasHighComplexProject) {
    strengths.push("Excellent practical exposure");
  }

  if (certificationCount >= thresholds.industryAlignedCertifications) {
    strengths.push("Industry aligned certification profile");
  }

  if (student.leetCodeSolved > thresholds.strongLeetCode) {
    strengths.push("Strong coding profile");
  }

  if (student.overallAttendance > thresholds.highAttendance) {
    strengths.push("Good consistency and discipline");
  }

  if (student.backlogsCount === 0) {
    strengths.push("Clean academic record");
  }

  if (hackathons >= thresholds.competitiveExposureHackathons) {
    strengths.push("Good competitive exposure");
  }

  if (student.aptitudeScore < thresholds.lowAptitude) {
    weaknesses.push("Needs improvement in aptitude skills");
    risks.push("High Placement Risk");
  }

  if (certificationCount === 0) {
    weaknesses.push("Needs industry exposure");
    risks.push("Low Industry Exposure");
  }

  if (projectCount < thresholds.minimumProjects) {
    weaknesses.push("Insufficient practical exposure");
    risks.push("Low Practical Exposure");
  }

  if (projectCount === 0) {
    weaknesses.push("Critical practical exposure gap");
    risks.push("High Placement Risk");
  }

  if (backendSkill < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    weaknesses.push("Lacks system-level development skills");
    risks.push("Skill Gap in Backend Development");
    skillGap.push("Backend Development");
  }

  if (student.leetCodeSolved === 0 && student.codeChefRating === 0) {
    weaknesses.push("Weak problem-solving exposure");
  }

  if (student.overallAttendance < thresholds.lowAttendance) {
    weaknesses.push("Low attendance and discipline concern");
    risks.push("Discipline Concern");
  }

  if (student.backlogsCount > thresholds.highPlacementRiskBacklogs) {
    weaknesses.push("Multiple active backlogs impact placement readiness");
    risks.push("High Placement Risk");
  }

  if (trend === "Declining") {
    weaknesses.push("Academic consistency issue");
    risks.push("Inconsistent Academic Performance");
  }

  if (!hasGithubPortfolio && projectCount > 0) {
    weaknesses.push("Poor portfolio visibility");
  }

  if (student.communicationScore < thresholds.communicationConcern) {
    weaknesses.push("Communication needs structured practice");
  }

  if (student.currentCgpa < thresholds.riskCgpa) {
    risks.push("High Placement Risk");
    skillGap.push("Core Academics");
  }

  if (dsaScore < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    skillGap.push("DSA");
  }

  if ((skillMap["Frontend Development"] || 0) < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    skillGap.push("Frontend Development");
  }

  if ((skillMap.MERN || 0) < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    skillGap.push("MERN Stack Integration");
  }

  if ((skillMap.DBMS || 0) < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    skillGap.push("DBMS");
  }

  if ((skillMap["Operating Systems"] || 0) < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    skillGap.push("Operating Systems");
  }

  if ((skillMap["Computer Networks"] || 0) < scoringConfig.idealPlacementProfile.minimumSkillScore) {
    skillGap.push("Computer Networks");
  }

  if (certificationCount < scoringConfig.idealPlacementProfile.minimumCertifications) {
    skillGap.push("Industry Certifications");
  }

  if (projectCount < scoringConfig.idealPlacementProfile.minimumProjects) {
    skillGap.push("Project Depth");
  }

  if (student.leetCodeSolved < scoringConfig.idealPlacementProfile.minimumLeetCodeSolved) {
    skillGap.push("Coding Practice");
  }

  if (student.aptitudeScore < scoringConfig.idealPlacementProfile.minimumAptitude) {
    skillGap.push("Aptitude Readiness");
  }

  const overall = scores.overallScore;
  let readinessLevel = "Needs Significant Improvement";
  let categoryTag = "Needs Improvement";

  if (overall > scoringConfig.readinessThresholds.high) {
    readinessLevel = "Highly Placement Ready";
    categoryTag = "Placement Ready";
  } else if (overall >= scoringConfig.readinessThresholds.medium) {
    readinessLevel = "Moderately Ready";
    categoryTag = "High Potential but Unpolished";
  }

  weaknesses.forEach((weakness) => {
    const suggestion = scoringConfig.suggestionMap[weakness];
    if (suggestion) suggestions.push(suggestion);
  });

  if (trend === "Declining") {
    suggestions.push("Review semester trends and create a subject-wise recovery plan.");
  }

  if (scores.skillsScore < 65) {
    suggestions.push("Strengthen technical depth with backend, DSA, and core CS practice.");
  }

  if (scores.projectsScore < 60) {
    suggestions.push("Build a portfolio with at least one high-complexity full-stack project.");
  }

  if (scores.aptitudeCodingScore < 60) {
    suggestions.push("Create a weekly aptitude and mock interview routine for placement rounds.");
  }

  return {
    strengths: dedupe(strengths),
    weaknesses: dedupe(weaknesses),
    risks: dedupe(risks),
    suggestions: dedupe(suggestions),
    readinessLevel,
    trend,
    skillGap: dedupe([...skillGap, categoryTag]),
  };
};

const calculateCompetencySnapshot = (studentBundle) => {
  const student = studentBundle.Student || studentBundle;
  const skills = studentBundle.skills || [];
  const projects = studentBundle.projects || [];
  const certifications = studentBundle.certifications || [];
  const semesterRecords = studentBundle.semesterRecords || [];
  const attendanceRecords = studentBundle.attendanceRecords || [];
  const extracurriculars = studentBundle.extracurriculars || [];

  const academicsScore = calculateAcademicScore(student, semesterRecords, attendanceRecords);
  const skillsScore = calculateSkillsScore(skills);
  const projectsScore = calculateProjectsScore(projects);
  const certificationsScore = calculateCertificationScore(certifications);
  const aptitudeCodingScore = calculateAptitudeCodingScore(student, skills);
  const extracurricularScore = calculateExtracurricularScore(extracurriculars);

  const weightedScores = {
    academicsScore: toRounded(academicsScore),
    skillsScore: toRounded(skillsScore),
    projectsScore: toRounded(projectsScore),
    certificationsScore: toRounded(certificationsScore),
    aptitudeCodingScore: toRounded(aptitudeCodingScore),
    extracurricularScore: toRounded(extracurricularScore),
  };

  const overallScore = toRounded(
    (weightedScores.academicsScore * scoringConfig.weights.academics) / 100 +
      (weightedScores.skillsScore * scoringConfig.weights.skills) / 100 +
      (weightedScores.projectsScore * scoringConfig.weights.projects) / 100 +
      (weightedScores.certificationsScore * scoringConfig.weights.certifications) / 100 +
      (weightedScores.aptitudeCodingScore * scoringConfig.weights.aptitudeCoding) / 100 +
      (weightedScores.extracurricularScore * scoringConfig.weights.extracurricular) / 100
  );

  const insights = buildInsights({
    student,
    skills,
    projects,
    certifications,
    extracurriculars,
    semesterRecords,
    scores: {
      ...weightedScores,
      overallScore,
    },
  });

  return {
    overallScore,
    ...weightedScores,
    ...insights,
  };
};

const calculateAndPersistStudentScore = async (studentId) => {
  const studentBundle = await Student.findByPk(studentId, {
    include: [
      { model: Skill, as: "skills" },
      { model: Certification, as: "certifications" },
      { model: Project, as: "projects" },
      { model: SemesterRecord, as: "semesterRecords" },
      { model: AttendanceRecord, as: "attendanceRecords" },
      { model: Extracurricular, as: "extracurriculars" },
      { model: Score, as: "score" },
    ],
  });

  if (!studentBundle) {
    throw new Error("Student not found for competency calculation.");
  }

  const snapshot = calculateCompetencySnapshot(studentBundle);
  const existingScore = studentBundle.score;

  if (existingScore) {
    await existingScore.update({
      ...snapshot,
      lastCalculatedAt: new Date(),
    });
  } else {
    await Score.create({
      studentId,
      ...snapshot,
      lastCalculatedAt: new Date(),
    });
  }

  return snapshot;
};

export {
  calculateCompetencySnapshot,
  calculateAndPersistStudentScore,
  scoringConfig,
};
