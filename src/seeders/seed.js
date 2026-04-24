import bcrypt from "bcryptjs";
import {
  AttendanceRecord,
  Certification,
  Extracurricular,
  Project,
  SemesterRecord,
  Skill,
  Student,
  User,
  syncDatabase,
} from "../models/index.js";
import { calculateAndPersistStudentScore } from "../services/competencyEngine.js";

const createStudentBundle = async (teacherId, studentPayload) => {
  const student = await Student.create({
    ...studentPayload.student,
    createdByUserId: teacherId,
    updatedByUserId: teacherId,
  });

  await Promise.all([
    Skill.bulkCreate(studentPayload.skills.map((item) => ({ ...item, studentId: student.id }))),
    Certification.bulkCreate(
      studentPayload.certifications.map((item) => ({ ...item, studentId: student.id }))
    ),
    Project.bulkCreate(studentPayload.projects.map((item) => ({ ...item, studentId: student.id }))),
    SemesterRecord.bulkCreate(
      studentPayload.semesterRecords.map((item) => ({ ...item, studentId: student.id }))
    ),
    AttendanceRecord.bulkCreate(
      studentPayload.attendanceRecords.map((item) => ({ ...item, studentId: student.id }))
    ),
    Extracurricular.bulkCreate(
      studentPayload.extracurriculars.map((item) => ({ ...item, studentId: student.id }))
    ),
  ]);

  await calculateAndPersistStudentScore(student.id);
};

const seedDefaultData = async () => {
  const adminPasswordHash = await bcrypt.hash("admin@123", 10);

  await User.findOrCreate({
    where: { username: "admin_123" },
    defaults: {
      passwordHash: adminPasswordHash,
      role: "admin",
      branch: null,
    },
  });

  const [teacher] = await User.findOrCreate({
    where: { username: "teacher_cse" },
    defaults: {
      passwordHash: await bcrypt.hash("teacher@123", 10),
      role: "teacher",
      branch: "CSE",
    },
  });

  const studentCount = await Student.count();

  if (studentCount > 0) {
    return;
  }

  const seedStudents = [
    {
      student: {
        prn: "2024CSE001",
        rollNumber: "CSE-01",
        fullName: "Aarav Kulkarni",
        branch: "CSE",
        division: "A",
        year: "BE",
        email: "aarav.kulkarni@example.com",
        phoneNumber: "9876543210",
        sscPercentage: 91,
        hscPercentage: 88,
        currentCgpa: 8.8,
        backlogsCount: 0,
        overallAttendance: 90,
        aptitudeScore: 78,
        mockInterviewScore: 74,
        communicationScore: 81,
        leetCodeSolved: 245,
        codeChefRating: 1800,
        codeChefStars: 4,
        githubProfile: "https://github.com/aaravkulkarni",
      },
      skills: [
        { category: "technical", name: "DSA", level: "Advanced", score: 88 },
        { category: "technical", name: "Frontend Development", level: "Advanced", score: 86 },
        { category: "technical", name: "Backend Development", level: "Intermediate", score: 76 },
        { category: "technical", name: "MERN", level: "Intermediate", score: 74 },
        { category: "language", name: "JavaScript", level: "Advanced", score: 85 },
        { category: "language", name: "Python", level: "Intermediate", score: 78 },
        { category: "language", name: "Java", level: "Intermediate", score: 76 },
        { category: "coreSubject", name: "DBMS", level: "Advanced", score: 84 },
        { category: "coreSubject", name: "Operating Systems", level: "Intermediate", score: 75 },
        { category: "coreSubject", name: "Computer Networks", level: "Intermediate", score: 72 }
      ],
      certifications: [
        {
          title: "Full Stack Web Development",
          platform: "Coursera",
          completedOn: "2025-05-18",
          relevanceScore: 85,
        },
        {
          title: "Data Structures in C++",
          platform: "NPTEL",
          completedOn: "2025-10-11",
          relevanceScore: 82,
        }
      ],
      projects: [
        {
          title: "Campus Placement Tracker",
          techStack: "React, Node.js, SQLite",
          complexity: "High",
          githubLink: "https://github.com/aaravkulkarni/placement-tracker",
          description: "A placement portal for student profile and interview status tracking.",
        },
        {
          title: "Smart Attendance System",
          techStack: "MERN, Face Recognition",
          complexity: "Medium",
          githubLink: "https://github.com/aaravkulkarni/smart-attendance",
          description: "An attendance system with analytics and attendance insights.",
        },
        {
          title: "Coding Contest Analyzer",
          techStack: "React, Express, Chart.js",
          complexity: "Medium",
          githubLink: "https://github.com/aaravkulkarni/coding-analyzer",
          description: "Dashboard for coding-platform performance and practice trends.",
        }
      ],
      semesterRecords: [
        { semesterNumber: 3, gpa: 8.2 },
        { semesterNumber: 4, gpa: 8.5 },
        { semesterNumber: 5, gpa: 8.6 },
        { semesterNumber: 6, gpa: 8.8 }
      ],
      attendanceRecords: [
        { subjectName: "DBMS", attendancePercentage: 92 },
        { subjectName: "Operating Systems", attendancePercentage: 88 },
        { subjectName: "Computer Networks", attendancePercentage: 90 }
      ],
      extracurriculars: [
        {
          category: "Hackathon",
          title: "Smart India Hackathon Internal",
          impactScore: 84,
          description: "Finalist at college-level smart solutions event.",
        },
        {
          category: "Club",
          title: "Coding Club Lead",
          impactScore: 80,
          description: "Led weekly DSA practice sessions.",
        }
      ],
    },
    {
      student: {
        prn: "2024CSE002",
        rollNumber: "CSE-02",
        fullName: "Riya Shah",
        branch: "CSE",
        division: "A",
        year: "BE",
        email: "riya.shah@example.com",
        phoneNumber: "9876501234",
        sscPercentage: 84,
        hscPercentage: 79,
        currentCgpa: 7.1,
        backlogsCount: 1,
        overallAttendance: 76,
        aptitudeScore: 58,
        mockInterviewScore: 61,
        communicationScore: 69,
        leetCodeSolved: 96,
        codeChefRating: 1450,
        codeChefStars: 2,
        githubProfile: "https://github.com/riyashah",
      },
      skills: [
        { category: "technical", name: "DSA", level: "Intermediate", score: 68 },
        { category: "technical", name: "Frontend Development", level: "Advanced", score: 82 },
        { category: "technical", name: "Backend Development", level: "Beginner", score: 48 },
        { category: "technical", name: "MERN", level: "Intermediate", score: 63 },
        { category: "language", name: "JavaScript", level: "Advanced", score: 83 },
        { category: "language", name: "C++", level: "Intermediate", score: 70 },
        { category: "coreSubject", name: "DBMS", level: "Intermediate", score: 72 },
        { category: "coreSubject", name: "Operating Systems", level: "Intermediate", score: 68 },
        { category: "coreSubject", name: "Computer Networks", level: "Beginner", score: 54 }
      ],
      certifications: [
        {
          title: "React Developer Basics",
          platform: "Udemy",
          completedOn: "2025-07-02",
          relevanceScore: 72,
        }
      ],
      projects: [
        {
          title: "Department Event Portal",
          techStack: "React, Firebase",
          complexity: "Medium",
          githubLink: "https://github.com/riyashah/event-portal",
          description: "Event management and RSVP portal for college clubs.",
        }
      ],
      semesterRecords: [
        { semesterNumber: 3, gpa: 7.4 },
        { semesterNumber: 4, gpa: 7.2 },
        { semesterNumber: 5, gpa: 7.0 },
        { semesterNumber: 6, gpa: 7.1 }
      ],
      attendanceRecords: [
        { subjectName: "DBMS", attendancePercentage: 74 },
        { subjectName: "Operating Systems", attendancePercentage: 78 },
        { subjectName: "Computer Networks", attendancePercentage: 75 }
      ],
      extracurriculars: [
        {
          category: "Club",
          title: "Design Club Member",
          impactScore: 62,
          description: "Participated in UI design workshops and designathons.",
        }
      ],
    },
  ];

  for (const studentPayload of seedStudents) {
    await createStudentBundle(teacher.id, studentPayload);
  }
};

if (process.argv[1]?.endsWith("seed.js")) {
  syncDatabase()
    .then(() => seedDefaultData())
    .then(() => {
      console.log("Seed data created successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed data creation failed:", error);
      process.exit(1);
    });
}

export { seedDefaultData };
