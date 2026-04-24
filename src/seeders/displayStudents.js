import {
  Skill,
  Student,
  Score,
  syncDatabase,
} from "../models/index.js";

const displayStudents = async () => {
  await syncDatabase();

  const allStudents = await Student.findAll({
    include: [
      { model: Skill, as: "skills" },
      { model: Score, as: "score" }
    ],
    order: [["createdAt", "ASC"]]
  });

  if (allStudents.length === 0) {
    console.log("No students found in the database.");
    process.exit(0);
  }

  console.log("\n" + "=".repeat(100));
  console.log("📊 STUDENT DATASET SUMMARY");
  console.log("=".repeat(100) + "\n");

  allStudents.forEach((student, idx) => {
    const score = student.score;
    console.log(`${idx + 1}. ${student.fullName}`);
    console.log(`   ├─ PRN: ${student.prn} | Roll: ${student.rollNumber} | Division: ${student.division} | Year: ${student.year}`);
    console.log(`   ├─ Email: ${student.email} | Phone: ${student.phoneNumber}`);
    console.log(`   ├─ CGPA: ${student.currentCgpa} | Attendance: ${student.overallAttendance}%`);
    console.log(`   ├─ SSC: ${student.sscPercentage}% | HSC: ${student.hscPercentage}%`);
    console.log(`   ├─ Backlogs: ${student.backlogsCount} | Aptitude: ${student.aptitudeScore}`);
    console.log(`   ├─ Mock Interview: ${student.mockInterviewScore} | Communication: ${student.communicationScore}`);
    console.log(`   ├─ LeetCode: ${student.leetCodeSolved} problems | CodeChef: ${student.codeChefRating} rating`);
    if (student.skills && student.skills.length > 0) {
      const skillNames = student.skills.map(s => `${s.name}(${s.level})`).join(", ");
      console.log(`   ├─ Skills: ${skillNames}`);
    }
    if (score) {
      console.log(`   └─ 📈 Overall Score: ${score.overallScore?.toFixed(2)} | Readiness: ${score.readinessLevel}`);
    }
    console.log("");
  });

  console.log("=".repeat(100));
  console.log(`✅ Total Students: ${allStudents.length}`);
  console.log("=".repeat(100) + "\n");
};

displayStudents()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
