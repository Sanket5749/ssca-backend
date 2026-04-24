import jwt from "jsonwebtoken";
import { User, Student } from "../models/index.js";

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "smart-student-competency-secret");
    let user;

    if (decoded.role === "student") {
      const student = await Student.findByPk(decoded.userId);
      if (student) {
        user = {
          id: student.id,
          username: student.fullName,
          role: "student",
          branch: student.branch
        };
      }
    } else {
      user = await User.findByPk(decoded.userId, {
        attributes: ["id", "username", "role", "branch"],
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Authenticated user no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const authorizeRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission for this action." });
    }

    next();
  };

export { authenticateToken, authorizeRoles };
