import { Request, Response } from 'express';
import UserService from '../services/userServices';
import jwt from 'jsonwebtoken';
import  User, {  Agent, IAgent, IOwner, IUser, Owner, IAdmin, ISuperAgent,SuperAgent, Admin  }  from "../models/User";
import { hashPassword } from '../utils/auth';

export class AuthController {
  static async signUpUser(req: Request, res: Response): Promise<void> {
    try {
      const { token } = await UserService.createUser(req.body);
      res.status(201).json({
        message: "Signup successful! Please verify your email with the OTP sent.",
        redirect: 'verify-otp',
        token,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async signUpOwner(req: Request, res: Response): Promise<void> {
    try {
      const { token } = await UserService.createOwner(req.body);
      res.status(201).json({
        message: "Signup successful! Please verify your email with the OTP sent.",
        redirect: 'verify-otp',
        token,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async signUpAgent(req: Request, res: Response): Promise<void> {
    try {
      const referralCode = req.params.referralCode;
      console.log("referralCode is here :", referralCode)
      const { token } = await UserService.createAgent(req.body, referralCode);
      res.status(201).json({
        message: "Signup successful! Please verify your email with the OTP sent.",
        redirect: 'verify-otp',
        token,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async signUpSuperAgent(req: Request, res: Response): Promise<void> {
    try {
      const { token } = await UserService.createSuperAgent(req.body);
      res.status(201).json({
        message: "Signup successful! Please verify your email with the OTP sent.",
        redirect: 'verify-otp',
        token,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async signUpAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { token } = await UserService.createAdmin(req.body);
      res.status(201).json({
        message: "Signup successful! Please verify your email with the OTP sent.",
        redirect: 'verify-otp',
        token,
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }
  
  static async signIn(req: Request, res: Response): Promise<void> {
    try {
      console.log(req.body);
      const result = await UserService.validatePassword(req.body.email, req.body.password, req.body.role);
      if (result) {
        const { token, user } = result;
        if (user.redirect) {
          res.status(200).json({
            message: "OTP not verified. Redirecting to OTP verification.",
            redirect: 'verify-otp',
            token,
          });
        } else {
          res.status(200).json({ message: "Authentication successful", token, user });
        }
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await UserService.forgotPassword(email);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { newPassword } = req.body;
      const userId = req.currentUser?.id!;     
      const result = await UserService.resetPassword(userId, newPassword);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async generateOTP(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.currentUser?.id!;
      await UserService.generateOTP(userId);
      res.status(201).json({ message: 'OTP sent successfully' });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  static async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { otp, token, role } = req.body;
      console.log("role", role)
      const decoded = jwt.verify(token, process.env.OTP_JWT_SECRET as string) as { id: string };
      console.log("decoded", decoded)
      const verified = await UserService.verifyOTP(decoded.id, otp, role);
      console.log("verified", verified)
      if (verified) {
        const user = await UserService.findUserById(decoded.id, role);
        console.log("user", user)
        const authToken = UserService.generateToken(decoded.id, user!.email, user!.role);
        res.status(200).json({ 
          message: 'OTP verified successfully',
          token: authToken,
          id: decoded.id
        });
      } else {
        res.status(400).json({ message: 'Invalid or expired OTP' });
      }
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  // New methods for Google authentication

  static async completeGoogleProfile(req: Request, res: Response): Promise<void> {
    try {
      const { phone, role } = req.body;
      console.log("bodyy", req.body);
      
      if (!req.currentUser || !req.currentUser.id) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }
      
      if (!phone) {
        res.status(400).json({ 
          success: false, 
          message: 'Phone number is required' 
        });
        return;
      }
      
      const tempUser = await User.findById(req.currentUser.id);
      console.log("tempUser", tempUser);
      if (!tempUser) {
        res.status(404).json({ success: false, message: "Temp user not found" });
        return;
      }
      
      const baseData = {
        googleId: tempUser.googleId,
        email: tempUser.email,
        name: tempUser.name,
        phone,
        password: tempUser.password, // random one from earlier
        isVerified: true,
        role,
      };
      
      let finalUser;
      switch (role) {
        case 'agent':
          finalUser = new Agent({
            ...baseData,
            commissionRate: 0,
            isVerifiedByAdmin: 'requested',
          });
          break;
        case 'owner':
          finalUser = new Owner({
            ...baseData,
            yachts: [],
          });
          break;
        case 'super-agent':
          finalUser = new SuperAgent({
            ...baseData,
            referralCode: `${tempUser.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8)}`
          });
          break;
        case 'admin':
          finalUser = new Admin({ ...baseData });
          break;
        default:
          finalUser = new User({ ...baseData });
      }

      await User.findByIdAndDelete(tempUser._id); // Clean up temp user
      await finalUser.save();
      
      const token = UserService.generateToken(finalUser._id.toString(), finalUser.email, finalUser.role);
      
      
 
      res.status(200).json({
        success: true,
        message: 'Profile completed successfully',
        token,
        user: {
          id: finalUser._id,
          name: finalUser.name,
          email: finalUser.email,
          role: finalUser.role,
          phone: finalUser.phone
        }
      });
    } catch (error) {
      console.error('Error completing Google profile:', error);
      res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  static async checkGoogleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        res.status(400).json({ 
          success: false, 
          message: 'Email is required' 
        });
        return;
      }
      
      // Check if the user exists and has a Google ID
      const user = await User.findOne({ email });
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        hasGoogleAuth: !!user.googleId,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error checking Google auth:', error);
      res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }

  static async linkGoogleAccount(req: Request, res: Response): Promise<void> {
    try {
      if (!req.currentUser || !req.currentUser.id) {
        res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
        return;
      }
      
      const { googleId } = req.body;
      
      if (!googleId) {
        res.status(400).json({ 
          success: false, 
          message: 'Google ID is required' 
        });
        return;
      }
      
      // Update user with Google ID
      const user = await User.findByIdAndUpdate(
        req.currentUser.id,
        { googleId },
        { new: true }
      );
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Google account linked successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hasGoogleAuth: true
        }
      });
    } catch (error) {
      console.error('Error linking Google account:', error);
      res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  }
}

// import { Request, Response } from 'express';
// import UserService from '../services/userServices';
// import jwt from 'jsonwebtoken';


// export class AuthController {
//   static async signUpUser(req: Request, res: Response): Promise<void> {
//     try {
//       const { token } = await UserService.createUser(req.body);
//       res.status(201).json({
//         message: "Signup successful! Please verify your email with the OTP sent.",
//         redirect: 'verify-otp',
//         token,
//       });
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async signUpOwner(req: Request, res: Response): Promise<void> {
//     try {
//       const { token } = await UserService.createOwner(req.body);
//       res.status(201).json({
//         message: "Signup successful! Please verify your email with the OTP sent.",
//         redirect: 'verify-otp',
//         token,
//       });
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async signUpAgent(req: Request, res: Response): Promise<void> {
//     try {
//       const referralCode = req.params.referralCode;
//       console.log("referralCode is here :", referralCode)
//       const { token } = await UserService.createAgent(req.body,referralCode);
//       res.status(201).json({
//         message: "Signup successful! Please verify your email with the OTP sent.",
//         redirect: 'verify-otp',
//         token,
//       });
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async signUpSuperAgent(req: Request, res: Response): Promise<void> {
//     try {
//       const { token } = await UserService.createSuperAgent(req.body);
//       res.status(201).json({
//         message: "Signup successful! Please verify your email with the OTP sent.",
//         redirect: 'verify-otp',
//         token,
//       });
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async signUpAdmin(req: Request, res: Response): Promise<void> {
//     try {
//       const { token } = await UserService.createAdmin(req.body);
//       res.status(201).json({
//         message: "Signup successful! Please verify your email with the OTP sent.",
//         redirect: 'verify-otp',
//         token,
//       });
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }
//   static async signIn(req: Request, res: Response): Promise<void> {
//     try {
//       console.log(req.body);
//       const result = await UserService.validatePassword(req.body.email, req.body.password, req.body.role);
//       if (result) {
//         const { token, user } = result;
//         if (user.redirect) {
//           res.status(200).json({
//             message: "OTP not verified. Redirecting to OTP verification.",
//             redirect: 'verify-otp',
//             token,
//         });
//         } else {
//           res.status(200).json({ message: "Authentication successful", token, user });
//         }
//       } else {
//         res.status(401).json({ message: "Invalid credentials" });
//       }
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async forgotPassword(req: Request, res: Response): Promise<void> {
//     try {
//       const { email } = req.body;
//       const result = await UserService.forgotPassword(email);
//       res.status(200).json(result);
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async resetPassword(req: Request, res: Response): Promise<void> {
//     try {
//       const { newPassword } = req.body;
//       const userId = req.currentUser?.id!;     
//       const result = await UserService.resetPassword(userId,newPassword);
//       res.status(200).json(result);
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async generateOTP(req: Request, res: Response): Promise<void> {
//     try {
//       const userId = req.currentUser?.id!;
//       await UserService.generateOTP(userId);
//       res.status(201).json({ message: 'OTP sent successfully' });
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }

//   static async verifyOTP(req: Request, res: Response): Promise<void> {
//     try {
//       const { otp, token, role } = req.body;
//       console.log("role", role)
//       const decoded = jwt.verify(token, process.env.OTP_JWT_SECRET as string) as { id: string };
//       console.log("decoded", decoded)
//       const verified = await UserService.verifyOTP(decoded.id, otp, role);
//       console.log("verified", verified)
//       if (verified) {
//         const user = await UserService.findUserById(decoded.id,role);
//         console.log("user", user)
//         const authToken = UserService.generateToken(decoded.id, user!.email, user!.role);
//         res.status(200).json({ 
//           message: 'OTP verified successfully',
//           token: authToken ,
//           id: decoded.id
//         });
//       } else {
//         res.status(400).json({ message: 'Invalid or expired OTP' });
//       }
//     } catch (error) {
//       res.status(500).json({ message: (error as Error).message });
//     }
//   }
// }
