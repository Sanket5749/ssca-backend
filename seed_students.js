const { sequelize } = require('./src/models');
const { Student, SemesterRecord, AttendanceRecord, Skill, Certification, Project, Extracurricular, Score } = require('./src/models');

const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharva", "Ananya", "Myra", "Diya", "Riya", "Kavya", "Sneha", "Priya", "Neha", "Pooja", "Shruti", "Rohan", "Vikram", "Siddharth", "Rahul", "Karan", "Nikhil", "Amit", "Raj", "Sanjay", "Ravi", "Anjali", "Swati", "Divya", "Megha", "Priyanka", "Deepa", "Sonal", "Nidhi", "Gaurav", "Saurabh", "Ashish", "Manish", "Pankaj", "Vikas", "Anand", "Suresh", "Ramesh", "Mukesh"];
const lastNames = ["Sharma", "Patel", "Singh", "Kumar", "Desai", "Joshi", "Verma", "Gupta", "Iyer", "Reddy", "Nair", "Menon", "Pillai", "Chauhan", "Rajput", "Rao", "Das", "Bose", "Ghosh", "Dutta", "Mehta", "Shah", "Trivedi", "Pandey", "Mishra", "Dubey", "Tiwari", "Yadav", "Choudhary", "Thakur"];

const branches = ["CSE", "IT", "EXTC", "MECH", "ELECTRICAL", "AIDS"];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  try {
    await sequelize.sync();

    // Clear existing students
    await Student.destroy({ where: {} });

    console.log("Creating 100 random Indian students...");

    for (let i = 0; i < 100; i++) {
      const prn = String(241106001 + i);
      const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
      
      const sscPercentage = getRandomInt(60, 98);
      const hscPercentage = getRandomInt(60, 98);
      const currentCgpa = (getRandomInt(600, 990) / 100).toFixed(2);
      const backlogsCount = getRandomInt(0, 3);
      const overallAttendance = getRandomInt(60, 100);
      const aptitudeScore = getRandomInt(40, 95);
      const mockInterviewScore = getRandomInt(40, 95);
      const communicationScore = getRandomInt(50, 95);

      const branch = getRandomElement(branches);

      const student = await Student.create({
        prn,
        rollNumber: String(100 + i),
        fullName: name,
        branch,
        division: getRandomElement(["A", "B", "C"]),
        year: getRandomElement(["SE", "TE", "BE"]),
        email: `${name.replace(' ', '.').toLowerCase()}@example.com`,
        phoneNumber: `9${getRandomInt(100000000, 999999999)}`,
        sscPercentage,
        hscPercentage,
        currentCgpa: parseFloat(currentCgpa),
        backlogsCount,
        overallAttendance,
        aptitudeScore,
        mockInterviewScore,
        communicationScore,
        leetCodeSolved: getRandomInt(0, 300),
        codeChefRating: getRandomInt(1000, 2000),
        codeChefStars: getRandomInt(1, 4),
        githubProfile: `https://github.com/${name.replace(' ', '').toLowerCase()}`,
        createdByUserId: null
      });

      // Calculate mock score
      const academicsScore = (parseFloat(currentCgpa) / 10) * 100 * 0.4 + (sscPercentage * 0.1) + (hscPercentage * 0.1) + (overallAttendance * 0.4);
      const technicalScore = getRandomInt(40, 95);
      const placementScore = (aptitudeScore * 0.3 + mockInterviewScore * 0.4 + communicationScore * 0.3);
      const totalScore = (academicsScore * 0.3) + (technicalScore * 0.4) + (placementScore * 0.3);

      let readinessLevel = "Needs Significant Improvement";
      if (totalScore >= 80) readinessLevel = "Highly Placement Ready";
      else if (totalScore >= 60) readinessLevel = "Moderately Ready";

      await Score.create({
        studentId: student.id,
        academicsScore: academicsScore.toFixed(2),
        technicalScore: technicalScore.toFixed(2),
        placementReadinessScore: placementScore.toFixed(2),
        extracurricularScore: getRandomInt(40, 90).toFixed(2),
        overallScore: totalScore.toFixed(2),
        readinessLevel: readinessLevel
      });

      // Add a dummy skill
      await Skill.create({
        studentId: student.id,
        category: "technical",
        name: getRandomElement(["React", "Node.js", "Python", "Java", "C++", "DSA"]),
        level: getRandomElement(["Beginner", "Intermediate", "Advanced"]),
        score: getRandomInt(40, 100)
      });
    }

    console.log("Seeding complete! 100 students created.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
