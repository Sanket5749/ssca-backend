import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { sequelize } from "../models/index.js";
import {
  AttendanceRecord,
  Certification,
  Extracurricular,
  Project,
  Score,
  SemesterRecord,
  Skill,
  Student,
  User,
} from "../models/index.js";
import {
  calculateAndPersistStudentScore,
  calculateCompetencySnapshot,
  scoringConfig,
} from "../services/competencyEngine.js";

const includeStudentRelations = [
  { model: Skill, as: "skills" },
  { model: Certification, as: "certifications" },
  { model: Project, as: "projects" },
  { model: SemesterRecord, as: "semesterRecords" },
  { model: AttendanceRecord, as: "attendanceRecords" },
  { model: Extracurricular, as: "extracurriculars" },
  { model: Score, as: "score" },
];

const createToken = (user) =>
  jwt.sign(
    { userId: user.id, role: user.role, branch: user.branch || null },
    process.env.JWT_SECRET || "smart-student-competency-secret",
    { expiresIn: "10h" }
  );

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  branch: user.branch,
});

const parseArray = (value) => (Array.isArray(value) ? value : []);

const validateStudentPayload = (payload) => {
  const requiredFields = [
    "prn",
    "rollNumber",
    "fullName",
    "branch",
    "division",
    "year",
    "email",
    "phoneNumber",
  ];

  for (const field of requiredFields) {
    if (!payload[field]) {
      return `${field} is required.`;
    }
  }

  if (!["SE", "TE", "BE"].includes(payload.year)) {
    return "Year must be one of SE, TE, or BE.";
  }

  return null;
};

const replaceStudentAssociations = async (studentId, payload, transaction) => {
  await Promise.all([
    Skill.destroy({ where: { studentId }, transaction }),
    Certification.destroy({ where: { studentId }, transaction }),
    Project.destroy({ where: { studentId }, transaction }),
    SemesterRecord.destroy({ where: { studentId }, transaction }),
    AttendanceRecord.destroy({ where: { studentId }, transaction }),
    Extracurricular.destroy({ where: { studentId }, transaction }),
  ]);

  const skills = parseArray(payload.skills)
    .filter((item) => item?.name)
    .map((item) => ({
      studentId,
      category: item.category || "technical",
      name: item.name,
      level: item.level || null,
      score: item.score ?? null,
    }));

  const certifications = parseArray(payload.certifications)
    .filter((item) => item?.title)
    .map((item) => ({
      studentId,
      title: item.title,
      platform: item.platform || "Unknown",
      completedOn: item.completedOn || new Date().toISOString().slice(0, 10),
      relevanceScore: Number(item.relevanceScore || 0),
    }));

  const projects = parseArray(payload.projects)
    .filter((item) => item?.title)
    .map((item) => ({
      studentId,
      title: item.title,
      techStack: item.techStack || "Not specified",
      complexity: item.complexity || "Low",
      githubLink: item.githubLink || null,
      description: item.description || "No description provided",
    }));

  const semesterRecords = parseArray(payload.semesterRecords)
    .filter((item) => item?.semesterNumber)
    .map((item) => ({
      studentId,
      semesterNumber: Number(item.semesterNumber),
      gpa: Number(item.gpa || 0),
    }));

  const attendanceRecords = parseArray(payload.attendanceRecords)
    .filter((item) => item?.subjectName)
    .map((item) => ({
      studentId,
      subjectName: item.subjectName,
      attendancePercentage: Number(item.attendancePercentage || 0),
    }));

  const extracurriculars = parseArray(payload.extracurriculars)
    .filter((item) => item?.title)
    .map((item) => ({
      studentId,
      category: item.category || "Club",
      title: item.title,
      impactScore: Number(item.impactScore || 0),
      description: item.description || null,
    }));

  await Promise.all([
    skills.length ? Skill.bulkCreate(skills, { transaction }) : Promise.resolve(),
    certifications.length ? Certification.bulkCreate(certifications, { transaction }) : Promise.resolve(),
    projects.length ? Project.bulkCreate(projects, { transaction }) : Promise.resolve(),
    semesterRecords.length ? SemesterRecord.bulkCreate(semesterRecords, { transaction }) : Promise.resolve(),
    attendanceRecords.length ? AttendanceRecord.bulkCreate(attendanceRecords, { transaction }) : Promise.resolve(),
    extracurriculars.length ? Extracurricular.bulkCreate(extracurriculars, { transaction }) : Promise.resolve(),
  ]);
};

const serializeStudent = (student) => {
  const json = student.toJSON();
  return {
    ...json,
    score: json.score || calculateCompetencySnapshot(json),
  };
};

const filterStudentsByUser = (students, user) =>
  user.role === "teacher" ? students.filter((student) => student.branch === user.branch) : students;

const getDashboardPayload = async (user, branchOverride) => {
  const where = {};

  if (user.role === "teacher") {
    where.branch = user.branch;
  } else if (branchOverride) {
    where.branch = branchOverride;
  }

  const students = await Student.findAll({
    where,
    include: includeStudentRelations,
  });

  const hydratedStudents = students.map((student) => serializeStudent(student));
  const totalStudents = hydratedStudents.length;
  const averageCompetencyScore = totalStudents
    ? Number(
        (
          hydratedStudents.reduce((sum, student) => sum + Number(student.score.overallScore || 0), 0) /
          totalStudents
        ).toFixed(2)
      )
    : 0;

  const readinessDistribution = hydratedStudents.reduce(
    (acc, student) => {
      acc[student.score.readinessLevel] = (acc[student.score.readinessLevel] || 0) + 1;
      return acc;
    },
    {
      "Highly Placement Ready": 0,
      "Moderately Ready": 0,
      "Needs Significant Improvement": 0,
    }
  );

  const branchComparison = Object.values(
    hydratedStudents.reduce((acc, student) => {
      const branch = student.branch;
      if (!acc[branch]) {
        acc[branch] = { branch, totalStudents: 0, totalScore: 0 };
      }

      acc[branch].totalStudents += 1;
      acc[branch].totalScore += Number(student.score.overallScore || 0);
      return acc;
    }, {})
  ).map((item) => ({
    branch: item.branch,
    totalStudents: item.totalStudents,
    averageScore: Number((item.totalScore / item.totalStudents).toFixed(2)),
  }));

  const topPerformers = [...hydratedStudents]
    .sort((a, b) => Number(b.score.overallScore || 0) - Number(a.score.overallScore || 0))
    .slice(0, 5)
    .map((student) => ({
      id: student.id,
      fullName: student.fullName,
      branch: student.branch,
      overallScore: student.score.overallScore,
      readinessLevel: student.score.readinessLevel,
    }));

  const skillDistribution = hydratedStudents.reduce((acc, student) => {
    student.skills.forEach((skill) => {
      const label = skill.name;
      if (!acc[label]) {
        acc[label] = { name: label, total: 0, totalScore: 0 };
      }

      acc[label].total += 1;
      acc[label].totalScore += skill.score || 0;
    });
    return acc;
  }, {});

  const weakAreas = hydratedStudents
    .flatMap((student) => student.score.weaknesses || [])
    .reduce((acc, weakness) => {
      acc[weakness] = (acc[weakness] || 0) + 1;
      return acc;
    }, {});

  const leaderboard = [...hydratedStudents]
    .sort((a, b) => Number(b.score.overallScore || 0) - Number(a.score.overallScore || 0))
    .slice(0, 10)
    .map((student, index) => ({
      rank: index + 1,
      id: student.id,
      fullName: student.fullName,
      branch: student.branch,
      year: student.year,
      overallScore: student.score.overallScore,
      readinessLevel: student.score.readinessLevel,
    }));

  return {
    metrics: {
      totalStudents,
      averageCompetencyScore,
      readinessDistribution,
      branchesCovered: new Set(hydratedStudents.map((student) => student.branch)).size,
    },
    branchComparison,
    topPerformers,
    skillDistribution: Object.values(skillDistribution).map((item) => ({
      name: item.name,
      averageScore: item.total ? Number((item.totalScore / item.total).toFixed(2)) : 0,
      coverage: item.total,
    })),
    weakAreas: Object.entries(weakAreas)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    leaderboard,
    weights: scoringConfig.weights,
    students: hydratedStudents,
  };
};

const login = async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  if (role === "student") {
    const student = await Student.findOne({ where: { fullName: username, prn: password } });
    if (!student) {
      return res.status(401).json({ message: "Invalid student credentials." });
    }
    const token = jwt.sign(
      { userId: student.id, role: "student", branch: student.branch },
      process.env.JWT_SECRET || "smart-student-competency-secret",
      { expiresIn: "10h" }
    );
    return res.json({
      token,
      user: { id: student.id, username: student.fullName, role: "student", branch: student.branch },
    });
  }

  const user = await User.findOne({ where: { username } });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json({
    token: createToken(user),
    user: sanitizeUser(user),
  });
};

const me = async (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
};

const createTeacher = async (req, res) => {
  const { username, password, branch } = req.body;

  if (!username || !password || !branch) {
    return res.status(400).json({ message: "Username, password, and branch are required." });
  }

  const existingUser = await User.findOne({ where: { username } });

  if (existingUser) {
    return res.status(409).json({ message: "Username already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await User.create({
    username,
    passwordHash,
    branch,
    role: "teacher",
  });

  return res.status(201).json({ teacher: sanitizeUser(teacher) });
};

const listTeachers = async (_req, res) => {
  const teachers = await User.findAll({
    where: { role: "teacher" },
    attributes: ["id", "username", "role", "branch", "createdAt"],
    order: [["createdAt", "DESC"]],
  });

  return res.json({ teachers });
};

const listStudents = async (req, res) => {
  const {
    search = "",
    branch,
    readinessLevel,
    year,
    sortBy = "fullName",
    sortOrder = "asc",
  } = req.query;

  const where = {};

  if (req.user.role === "teacher") {
    where.branch = req.user.branch;
  } else if (branch) {
    where.branch = branch;
  }

  if (year) {
    where.year = year;
  }

  if (search) {
    where[Op.or] = [
      { fullName: { [Op.like]: `%${search}%` } },
      { prn: { [Op.like]: `%${search}%` } },
      { rollNumber: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
  }

  const students = await Student.findAll({
    where,
    include: includeStudentRelations,
  });

  let hydrated = filterStudentsByUser(students.map((student) => serializeStudent(student)), req.user);

  if (readinessLevel) {
    hydrated = hydrated.filter((student) => student.score.readinessLevel === readinessLevel);
  }

  hydrated.sort((first, second) => {
    const direction = sortOrder === "desc" ? -1 : 1;

    if (sortBy === "overallScore") {
      return (Number(first.score.overallScore) - Number(second.score.overallScore)) * direction;
    }

    return String(first[sortBy] || "")
      .localeCompare(String(second[sortBy] || "")) *
      direction;
  });

  return res.json({ students: hydrated });
};

const getStudent = async (req, res) => {
  const student = await Student.findByPk(req.params.id, {
    include: includeStudentRelations,
  });

  if (!student) {
    return res.status(404).json({ message: "Student not found." });
  }

  if (req.user.role === "teacher" && student.branch !== req.user.branch) {
    return res.status(403).json({ message: "You can only access students from your branch." });
  }

  return res.json({ student: serializeStudent(student) });
};

const upsertStudent = async (req, res, action = "create") => {
  const payload = req.body;
  const validationError = validateStudentPayload(payload);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only teachers and admins can modify student data." });
  }

  if (req.user.role === "teacher" && payload.branch !== req.user.branch) {
    return res.status(403).json({ message: "Teachers can only manage students from their assigned branch." });
  }

  const transaction = await sequelize.transaction();

  try {
    let student;

    if (action === "create") {
      student = await Student.create(
        {
          prn: payload.prn,
          rollNumber: payload.rollNumber,
          fullName: payload.fullName,
          branch: payload.branch,
          division: payload.division,
          year: payload.year,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
          sscPercentage: Number(payload.sscPercentage || 0),
          hscPercentage: Number(payload.hscPercentage || 0),
          currentCgpa: Number(payload.currentCgpa || 0),
          backlogsCount: Number(payload.backlogsCount || 0),
          overallAttendance: Number(payload.overallAttendance || 0),
          aptitudeScore: Number(payload.aptitudeScore || 0),
          mockInterviewScore: Number(payload.mockInterviewScore || 0),
          communicationScore: Number(payload.communicationScore || 0),
          leetCodeSolved: Number(payload.leetCodeSolved || 0),
          codeChefRating: Number(payload.codeChefRating || 0),
          codeChefStars: Number(payload.codeChefStars || 0),
          githubProfile: payload.githubProfile || null,
          createdByUserId: req.user.id,
          updatedByUserId: req.user.id,
        },
        { transaction }
      );
    } else {
      student = await Student.findByPk(req.params.id, { transaction });

      if (!student) {
        await transaction.rollback();
        return res.status(404).json({ message: "Student not found." });
      }

      if (student.branch !== req.user.branch) {
        await transaction.rollback();
        return res.status(403).json({ message: "Teachers can only modify students from their assigned branch." });
      }

      await student.update(
        {
          prn: payload.prn,
          rollNumber: payload.rollNumber,
          fullName: payload.fullName,
          branch: payload.branch,
          division: payload.division,
          year: payload.year,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
          sscPercentage: Number(payload.sscPercentage || 0),
          hscPercentage: Number(payload.hscPercentage || 0),
          currentCgpa: Number(payload.currentCgpa || 0),
          backlogsCount: Number(payload.backlogsCount || 0),
          overallAttendance: Number(payload.overallAttendance || 0),
          aptitudeScore: Number(payload.aptitudeScore || 0),
          mockInterviewScore: Number(payload.mockInterviewScore || 0),
          communicationScore: Number(payload.communicationScore || 0),
          leetCodeSolved: Number(payload.leetCodeSolved || 0),
          codeChefRating: Number(payload.codeChefRating || 0),
          codeChefStars: Number(payload.codeChefStars || 0),
          githubProfile: payload.githubProfile || null,
          updatedByUserId: req.user.id,
        },
        { transaction }
      );
    }

    await replaceStudentAssociations(student.id, payload, transaction);
    await transaction.commit();
    await calculateAndPersistStudentScore(student.id);

    const refreshedStudent = await Student.findByPk(student.id, {
      include: includeStudentRelations,
    });

    return res.status(action === "create" ? 201 : 200).json({
      student: serializeStudent(refreshedStudent),
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Unable to save student record.",
      detail: error.message,
    });
  }
};

const createStudent = async (req, res) => upsertStudent(req, res, "create");

const updateStudent = async (req, res) => upsertStudent(req, res, "update");

const deleteStudent = async (req, res) => {
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only teachers and admins can delete student data." });
  }

  const student = await Student.findByPk(req.params.id);

  if (!student) {
    return res.status(404).json({ message: "Student not found." });
  }

  if (req.user.role === "teacher" && student.branch !== req.user.branch) {
    return res.status(403).json({ message: "Teachers can only delete students from their own branch." });
  }

  await student.destroy();
  return res.json({ message: "Student deleted successfully." });
};

const dashboardOverview = async (req, res) => {
  const branch = req.user.role === "admin" ? req.query.branch : undefined;
  const payload = await getDashboardPayload(req.user, branch);
  return res.json(payload);
};

const leaderboard = async (req, res) => {
  const payload = await getDashboardPayload(req.user);
  return res.json({ leaderboard: payload.leaderboard });
};

const config = async (_req, res) => {
  return res.json({
    branches: ["CSE", "IT", "EXTC", "MECH", "ELECTRICAL", "AIDS"],
    weights: scoringConfig.weights,
    readinessLevels: [
      "Highly Placement Ready",
      "Moderately Ready",
      "Needs Significant Improvement",
    ],
    roles: ["admin", "teacher"],
  });
};

export {
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
};
