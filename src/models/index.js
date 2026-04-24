import dotenv from "dotenv";
import { DataTypes, Sequelize } from "sequelize";

dotenv.config();

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.DB_PATH || "./student_competency.sqlite",
  logging: false,
});

const User = sequelize.define(
  "User",
  {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM("admin", "teacher"),
      allowNull: false,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "users",
  }
);

const Student = sequelize.define(
  "Student",
  {
    prn: { type: DataTypes.STRING, allowNull: false, unique: true },
    rollNumber: { type: DataTypes.STRING, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    branch: { type: DataTypes.STRING, allowNull: false },
    division: { type: DataTypes.STRING, allowNull: false },
    year: {
      type: DataTypes.ENUM("SE", "TE", "BE"),
      allowNull: false,
    },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    sscPercentage: { type: DataTypes.FLOAT, allowNull: false },
    hscPercentage: { type: DataTypes.FLOAT, allowNull: false },
    currentCgpa: { type: DataTypes.FLOAT, allowNull: false },
    backlogsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    overallAttendance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    aptitudeScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    mockInterviewScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    communicationScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    leetCodeSolved: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    codeChefRating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    codeChefStars: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    githubProfile: { type: DataTypes.STRING, allowNull: true },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
    updatedByUserId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "students",
  }
);

const Skill = sequelize.define(
  "Skill",
  {
    category: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    level: { type: DataTypes.STRING, allowNull: true },
    score: { type: DataTypes.FLOAT, allowNull: true },
  },
  {
    tableName: "skills",
  }
);

const Certification = sequelize.define(
  "Certification",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    platform: { type: DataTypes.STRING, allowNull: false },
    completedOn: { type: DataTypes.DATEONLY, allowNull: false },
    relevanceScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "certifications",
  }
);

const Project = sequelize.define(
  "Project",
  {
    title: { type: DataTypes.STRING, allowNull: false },
    techStack: { type: DataTypes.STRING, allowNull: false },
    complexity: {
      type: DataTypes.ENUM("Low", "Medium", "High"),
      allowNull: false,
    },
    githubLink: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "projects",
  }
);

const SemesterRecord = sequelize.define(
  "SemesterRecord",
  {
    semesterNumber: { type: DataTypes.INTEGER, allowNull: false },
    gpa: { type: DataTypes.FLOAT, allowNull: false },
  },
  {
    tableName: "semester_records",
  }
);

const AttendanceRecord = sequelize.define(
  "AttendanceRecord",
  {
    subjectName: { type: DataTypes.STRING, allowNull: false },
    attendancePercentage: { type: DataTypes.FLOAT, allowNull: false },
  },
  {
    tableName: "attendance_records",
  }
);

const Extracurricular = sequelize.define(
  "Extracurricular",
  {
    category: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    impactScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "extracurriculars",
  }
);

const Score = sequelize.define(
  "Score",
  {
    overallScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    academicsScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    skillsScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    projectsScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    certificationsScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    aptitudeCodingScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    extracurricularScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    readinessLevel: { type: DataTypes.STRING, allowNull: false, defaultValue: "Needs Significant Improvement" },
    trend: { type: DataTypes.STRING, allowNull: false, defaultValue: "Stable" },
    strengths: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    weaknesses: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    risks: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    suggestions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    skillGap: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    lastCalculatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "scores",
  }
);

User.hasMany(Student, {
  as: "createdStudents",
  foreignKey: "createdByUserId",
});
User.hasMany(Student, {
  as: "updatedStudents",
  foreignKey: "updatedByUserId",
});
Student.belongsTo(User, {
  as: "createdBy",
  foreignKey: "createdByUserId",
});
Student.belongsTo(User, {
  as: "updatedBy",
  foreignKey: "updatedByUserId",
});

Student.hasMany(Skill, { as: "skills", foreignKey: "studentId", onDelete: "CASCADE" });
Skill.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(Certification, {
  as: "certifications",
  foreignKey: "studentId",
  onDelete: "CASCADE",
});
Certification.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(Project, { as: "projects", foreignKey: "studentId", onDelete: "CASCADE" });
Project.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(SemesterRecord, {
  as: "semesterRecords",
  foreignKey: "studentId",
  onDelete: "CASCADE",
});
SemesterRecord.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(AttendanceRecord, {
  as: "attendanceRecords",
  foreignKey: "studentId",
  onDelete: "CASCADE",
});
AttendanceRecord.belongsTo(Student, { foreignKey: "studentId" });

Student.hasMany(Extracurricular, {
  as: "extracurriculars",
  foreignKey: "studentId",
  onDelete: "CASCADE",
});
Extracurricular.belongsTo(Student, { foreignKey: "studentId" });

Student.hasOne(Score, { as: "score", foreignKey: "studentId", onDelete: "CASCADE" });
Score.belongsTo(Student, { foreignKey: "studentId" });

const syncDatabase = async () => {
  await sequelize.sync();
};

export {
  sequelize,
  syncDatabase,
  User,
  Student,
  Skill,
  Certification,
  Project,
  SemesterRecord,
  AttendanceRecord,
  Extracurricular,
  Score,
};
