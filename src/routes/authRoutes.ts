import express from "express";
import { AuthController } from "../controllers/authControllers";
import authenticateToken from "../middleware/authMiddleware";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/User";

const router = express.Router();

// Regular authentication routes
router.post("/signup/customer", AuthController.signUpUser);
router.post("/signup/owner", AuthController.signUpOwner);
router.post("/signup/agent/:referralCode?", AuthController.signUpAgent);
router.post("/signup/super-agent", AuthController.signUpSuperAgent);
router.post("/signup/admin", AuthController.signUpAdmin);
router.post('/signin', AuthController.signIn);
router.post('/generate-otp', AuthController.generateOTP);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Google OAuth Routes
// router.get(
//   "/google",
//   passport.authenticate("google", {
//     scope: ["profile", "email"]
//   })
// );

router.get("/google", (req, res, next) => {
  // @ts-ignore
  console.log("Full request URL:", req.originalUrl);
  const redirectUri = req.query.redirect_uri as string || "https://www.wavezgoa.com";

  console.log("redirect url", req.query.redirect_uri);
  // Store redirectUri in Google OAuth `state`
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: redirectUri
  })(req, res, next);
});

// Google callback route with enhanced error handling and role-based redirects
// router.get(
//   "/google/callback",
//   passport.authenticate("google", { 
//     failureRedirect: "/auth/google/failed",
//     session: false,
//   }),
//   async (req, res) => {
//     try {
//       const user = req.user as any;
//       const redirectUri = req.query.redirect_uri as string || "https://www.wavezgoa.com";
//       console.log("redirect url", redirectUri)
//       // Check if phone is missing
//       if (!user.phone) {
//         const tempToken = jwt.sign(
//           { id: user._id, needsProfileUpdate: true },
//           process.env.JWT_SECRET!,
//           { expiresIn: "1h" }
//         );

//         // // 👇 Detect frontend origin from request referer or fallback based on user email domain
//         // const referer = req.headers.referer || "";
//         // let redirectDomain = 'https://www.wavezgoa.com'; // default

//         // if (referer.includes("agent")) {
//         //   redirectDomain = "https://www.agent.wavezgoa.com";
//         // } else if (referer.includes("owner")) {
//         //   redirectDomain = "https://www.owner.wavezgoa.com";
//         // } else if (referer.includes("superagent")) {
//         //   redirectDomain = "https://www.superagent.wavezgoa.com";
//         // } else if (referer.includes("admin")) {
//         //   redirectDomain = "https://www.admin.wavezgoa.com";
//         // }

//         console.log(`Redirecting to ${redirectUri}/complete-profile`);

//         return res.redirect(`${redirectUri}/complete-profile?token=${tempToken}`);
//       }

//       // Generate auth token
//       const token = jwt.sign(
//         { id: user._id, email: user.email, role: user.role },
//         process.env.JWT_SECRET!,
//         { expiresIn: "7d" }
//       );

//       // Determine destination for auth-callback
//       let redirectUrl = 'https://www.wavezgoa.com'; // default
//       switch (user.role) {
//         case 'agent':
//           redirectUrl = 'https://www.agent.wavezgoa.com';
//           break;
//         case 'owner':
//           redirectUrl = 'https://www.owner.wavezgoa.com';
//           break;
//         case 'super-agent':
//           redirectUrl = 'https://www.superagent.wavezgoa.com';
//           break;
//         case 'admin':
//           redirectUrl = 'https://www.admin.wavezgoa.com';
//           break;
//         default:
//           redirectUrl = 'https://www.wavezgoa.com';
//       }

//       return res.redirect(`${redirectUrl}/auth-callback?token=${token}`);
//     } catch (error) {
//       console.error('Google auth callback error:', error);
//       res.redirect('/auth/google/failed');
//     }
//   }
// );

router.get(
  "/google/callback",
  passport.authenticate("google", { 
    failureRedirect: "/auth/google/failed",
    session: false,
  }),
  async (req, res) => {
    try {
      const user = req.user as any;
      
      // Extract redirectUri from state parameter
      const state = req.query.state as string;
      console.log("state", state);
      const redirectUri = state || "https://www.wavezgoa.com";
      
      console.log("redirect url from state", redirectUri);
      
      // Rest of your code remains the same
      if (!user.phone) {
        const tempToken = jwt.sign(
          { id: user._id, needsProfileUpdate: true },
          process.env.JWT_SECRET!,
          { expiresIn: "1h" }
        );

        console.log(`Redirecting to ${redirectUri}/complete-profile`);
        return res.redirect(`${redirectUri}/complete-profile?token=${tempToken}`);
      }

      // Generate auth token
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      // Use the redirectUri from state instead of role-based routing
      return res.redirect(`${redirectUri}/auth-callback?token=${token}`);
    } catch (error) {
      console.error('Google auth callback error:', error);
      res.redirect('/auth/google/failed');
    }
  }
);

// Failed Google auth route
router.get("/google/failed", (req, res) => {
  res.status(401).json({ success: false, message: "Google authentication failed" });
});

// Logout route
router.get("/logout", (req, res) => {
  req.logout((err: any) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ message: "Logged out successfully" });
  });
});

router.post('/complete-profile', authenticateToken, AuthController.completeGoogleProfile)

export default router;


// import express from "express";
// import { AuthController } from "../controllers/authControllers";
// import authenticateToken from "../middleware/authMiddleware";
// import passport from "passport";
// import jwt from "jsonwebtoken"


// const router = express.Router();
// // Redirect user to Google login
// router.get(
//     "/google",
//     passport.authenticate("google", { scope: ["profile", "email"] })
//   )
// // Google callback route
// router.get(
//     "/google/callback",
//     passport.authenticate("google", { failureRedirect: "/login" }),
//     (req, res) => {
//       const user = req.user as any
  
//       // Generate JWT token
//       const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET!, {
//         expiresIn: "7d"
//       })
  
//       // Send token as response (or redirect)
//       res.redirect(`http://localhost:3000/dashboard?token=${token}`)
//     }
//   )
// // Logout
// router.get("/logout", (req, res) => {
//     req.logout(err => {
//       if (err) return res.status(500).json({ error: "Logout failed" })
//       res.json({ message: "Logged out successfully" })
//     })
//   })
  
// router.post("/signup/customer",  AuthController.signUpUser);
// router.post("/signup/owner",  AuthController.signUpOwner);
// router.post("/signup/agent/:referralCode?", AuthController.signUpAgent);
// router.post("/signup/super-agent", AuthController.signUpSuperAgent);
// router.post("/signup/admin", AuthController.signUpAdmin);
// router.post('/signin', AuthController.signIn);
// router.post('/generate-otp', AuthController.generateOTP);
// router.post('/verify-otp', AuthController.verifyOTP);
// router.post('/forgot-password', AuthController.forgotPassword);
// router.post('/reset-password', AuthController.resetPassword);

// export default router;


