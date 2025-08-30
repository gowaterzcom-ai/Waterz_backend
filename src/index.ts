import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mongoose from "mongoose";
import helmet from "helmet";
import bodyParser from 'body-parser';
import passport from "passport"
import { customerRoutes, ownerRoutes, authRoutes, queryRoutes, paymentRoutes, adminRoutes, superAgentRoutes, agentRoutes } from "./routes";
import session from 'express-session';
import "./utils/passport" // Make sure this imports your updated passport config
import cleanupJob from "../src/utils/cleanupJob";

dotenv.config()
const app = express();
app.use(express.json());
app.use(bodyParser.json());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://www.gowaterz.com',
  'http://www.wavezgoa.com',
  'https://www.wavezgoa.com',
  'https://www.gowaterz.com',
  'https://www.agent.wavezgoa.com',
  'https://www.agent.gowaterz.com',
  'https://www.admin.wavezgoa.com',
  'https://www.admin.gowaterz.com',
  'https://www.superagent.wavezgoa.com',
  'https://www.superagent.gowaterz.com',
  'https://www.owner.wavezgoa.com',
  'https://www.owner.gowaterz.com'
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
};

// Apply CORS with options
app.use(cors(corsOptions));
app.use(helmet({
  // For Google OAuth redirects to work properly
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Session configuration - needed for Google OAuth
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

app.get("/test", (req, res) => {
  res.send("Hello World from backend");
});

// Routes
app.use("/auth", authRoutes);
app.use("/customer", customerRoutes);
app.use("/owner", ownerRoutes);
app.use("/agent", agentRoutes);
app.use("/superagent", superAgentRoutes);
app.use("/admin", adminRoutes);
app.use("/query", queryRoutes);
app.use("/payment", paymentRoutes);

const connectDatabase = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || "";
    await mongoose.connect(MONGO_URI);
    console.log("Successfully connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDatabase();
cleanupJob.start();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on ==> http://localhost:${PORT}`);
});


// import express from "express"
// import cors from "cors"
// import dotenv from "dotenv"
// import mongoose from "mongoose";
// import helmet from "helmet";
// import bodyParser from 'body-parser';
// import passport from "passport"
// import { customerRoutes,ownerRoutes, authRoutes,queryRoutes,paymentRoutes, adminRoutes, superAgentRoutes, agentRoutes }  from "./routes";
// import "./config/passport" 
// import session from 'express-session';
// import PassportSetup from "./utils/passport";


// dotenv.config()
// const app = express();
// app.use(express.json());
// app.use(bodyParser.json());
// const allowedOrigins = [
//   'http://localhost:5173',
//   'http://localhost:5174',
//   'http://www.wavezgoa.com',
//   'https://www.wavezgoa.com',
//   'https://www.agent.wavezgoa.com',
//   'https://www.admin.wavezgoa.com',
//   'https://www.superagent.wavezgoa.com',
//   'https://www.owner.wavezgoa.com'
// ];
// const corsOptions = {
//   origin: allowedOrigins,
//   credentials: true, // Allow credentials
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
//   allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
// };

// // Apply CORS with options
// app.use(cors(corsOptions));
// app.use(helmet());
// // app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // Rate limiting
// app.use(express.urlencoded({ extended: true }));
// app.use(
//   session({
//     secret: process.env.JWT_SECRET!,
//     resave: false,
//     saveUninitialized: false
//   })
// )
// app.use(passport.initialize())
// app.use(passport.session())


// app.get("/test", (req, res) => {
//   res.send("Hello World from backend");
// })

// app.use("/auth", authRoutes);
// app.use("/customer", customerRoutes);
// app.use("/owner", ownerRoutes);
// app.use("/agent",agentRoutes);
// app.use("/superagent",superAgentRoutes);
// app.use("/admin",adminRoutes);
// app.use("/query",queryRoutes)
// app.use("/payment",paymentRoutes) 

// const connectDatabase = async () => {
//   try {
//     const MONGO_URI = process.env.MONGO_URI || "";
//     await mongoose.connect(MONGO_URI);
//     console.log("Successfully connected to MongoDB");
//   } catch (error) {
//     console.error("MongoDB connection error:", error);
//     process.exit(1);
//   }
// };

// connectDatabase();

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`Server running on ==> http://localhost:${PORT}`);
// });

// // Optimisation can be happend by populating bookings by Agent instead of Searching for all Booking and then finiding booking for Agent with superAgent.
