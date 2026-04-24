import bcrypt from "bcryptjs";
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
  syncDatabase,
} from "../models/index.js";
import { calculateAndPersistStudentScore } from "../services/competencyEngine.js";

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Arjun", "Rohan", "Nikhil", "Rahul",
  "Priya", "Ananya", "Diya", "Shreya", "Pooja", "Neha", "Kavya"
];

const lastNames = [
  "Kulkarni", "Shah", "Patel", "Joshi", "Singh", "Verma", "Kumar",
  "Desai", "Nair", "Gupta", "Yadav", "Iyer", "Rao", "Menon"
];

const skills = [
  { name: "DSA", category: "technical" },
  { name: "Frontend Development", category: "technical" },
  { name: "Backend Development", category: "technical" },
  { name: "MERN", category: "technical" },
  { name: "JavaScript", category: "language" },
  { name: "Python", category: "language" },
  { name: "Java", category: "language" },
  { name: "C++", category: "language" },
  { name: "DBMS", category: "coreSubject" },
  { name: "Operating Systems", category: "coreSubject" },
  { name: "Computer Networks", category: "coreSubject" }
];

const certifications = [
  { title: "Full Stack Web Development", platform: "Coursera" },
  { title: "Data Structures Mastery", platform: "NPTEL" },
  { title: "React Developer", platform: "Udemy" },
  { title: "AWS Cloud Practitioner", platform: "A Cloud Guru" },
  { title: "Python for Data Science", platform: "Coursera" }
];

const projects = [
  { title: "E-Commerce Platform", techStack: "MERN" },
  { title: "Todo Application", techStack: "React + Firebase" },
  { title: "Chat Application", techStack: "Node.js + Socket.io" },
  { title: "Weather App", techStack: "React + API" },
  { title: "Blog Portal", techStack: "Express + MongoDB" }
];

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(1);
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomElements = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
};

const generateRandomStudent = (index) => ({
  prn: `2024CSE${String(index + 3).padStart(3, '0')}`,
  rollNumber: `CSE-${String(index + 3).padStart(2, '0')}`,
  fullName: `${randomElement(firstNames)} ${randomElement(lastNames)}`,
  branch: "CSE",
  division: randomElement(["A", "B", "C"]),
  year: randomElement(["SE", "TE", "BE"]),
  email: `student${index + 3}@example.com`,
  phoneNumber: `9${random(100000000, 999999999)}`,
  sscPercentage: randomFloat(60, 95),
  hscPercentage: randomFloat(60, 95),
  currentCgpa: randomFloat(5.5, 9.5),
  backlogsCount: random(0, 3),
  overallAttendance: random(70, 95),
  aptitudeScore: random(40, 95),
  mockInterviewScore: random(40, 95),
  communicationScore: random(40, 95),
  leetCodeSolved: random(50, 500),
  codeChefRating: random(800, 2500),
  codeChefStars: random(0, 5),
  githubProfile: `https://github.com/student${index + 3}`,
});

const generateRandomSkills = () => {
  return randomElements(skills, random(5, 10)).map(skill => ({
    ...skill,
    level: randomElement(["Beginner", "Intermediate", "Advanced"]),
    score: random(40, 95)
  }));
};

const generateRandomCertifications = () => {
  return randomElements(certifications, random(1, 3)).map(cert => ({
    ...cert,
    completedOn: new Date(Date.now() - random(0, 365) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    relevanceScore: random(60, 95)
  }));
};

const generateRandomProjects = () => {
  return randomElements(projects, random(1, 4)).map(proj => ({
    ...proj,
    complexity: randomElement(["Low", "Medium", "High"]),
    githubLink: `https://github.com/student${random(1, 1000)}/project${random(1, 100)}`,
    description: `A ${proj.techStack} project showcasing development skills.`
  }));
};

const generateRandomSemesterRecords = () => {
  return [3, 4, 5, 6].map(sem => ({
    semesterNumber: sem,
    gpa: randomFloat(5.5, 9.5)
  }));
};

const generateRandomAttendanceRecords = () => {
  return [
    { subjectName: "DBMS", attendancePercentage: random(70, 95) },
    { subjectName: "Operating Systems", attendancePercentage: random(70, 95) },
    { subjectName: "Computer Networks", attendancePercentage: random(70, 95) }
  ];
};

const generateRandomExtracurriculars = () => {
  return randomElements([
    { category: "Hackathon", title: "Smart India Hackathon", description: "Finalist at hackathon" },
    { category: "Club", title: "Coding Club", description: "Active member of coding club" },
    { category: "Competition", title: "Programming Contest", description: "Top 10 in regional contest" },
    { category: "Workshop", title: "Tech Workshop", description: "Attended advanced tech workshop" }
  ], random(1, 3)).map(extra => ({
    ...extra,
    impactScore: random(60, 90)
  }));
};

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
  return student;
};

const addRandomStudents = async () => {
  await syncDatabase();

  const teacher = await User.findOne({
    where: { role: "teacher" }
  });

  if (!teacher) {
    console.error("No teacher found in database!");
    return;
  }

  console.log("\n📚 Generating 5 random students...\n");

  const newStudents = [];
  for (let i = 0; i < 5; i++) {
    const studentPayload = {
      student: generateRandomStudent(i),
      skills: generateRandomSkills(),
      certifications: generateRandomCertifications(),
      projects: generateRandomProjects(),
      semesterRecords: generateRandomSemesterRecords(),
      attendanceRecords: generateRandomAttendanceRecords(),
      extracurriculars: generateRandomExtracurriculars()
    };

    const student = await createStudentBundle(teacher.id, studentPayload);
    newStudents.push(student);
    console.log(`✅ Created: ${student.fullName} (${student.prn})`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 STUDENT DATASET SUMMARY");
  console.log("=".repeat(80) + "\n");

  const allStudents = await Student.findAll({
    include: [
      { model: Skill, as: "skills" },
      { model: Score, as: "score" }
    ],
    order: [["createdAt", "DESC"]]
  });

  allStudents.forEach((student, idx) => {
    const score = student.score;
    console.log(`${idx + 1}. ${student.fullName}`);
    console.log(`   PRN: ${student.prn} | Roll: ${student.rollNumber} | Division: ${student.division}`);
    console.log(`   CGPA: ${student.currentCgpa} | Attendance: ${student.overallAttendance}%`);
    console.log(`   Backlogs: ${student.backlogsCount} | Aptitude: ${student.aptitudeScore}`);
    console.log(`   LeetCode: ${student.leetCodeSolved} | CodeChef Rating: ${student.codeChefRating}`);
    if (score) {
      console.log(`   📈 Overall Score: ${score.overallScore?.toFixed(2)}`);
    }
    console.log(`   Skills: ${student.skills?.map(s => s.name).join(", ")}`);
    console.log("");
  });

  console.log("=".repeat(80));
  console.log(`Total Students: ${allStudents.length}`);
  console.log("=".repeat(80) + "\n");
};

addRandomStudents()
  .then(() => {
    console.log("✅ Random students added successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error adding students:", error.message);
    process.exit(1);
  });
