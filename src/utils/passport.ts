import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { Request } from 'express';
import  User, {  Agent, IAgent, IOwner, IUser, Owner, IAdmin, ISuperAgent,SuperAgent, Admin  }  from "../models/User";
import { hashPassword } from './auth';
import crypto from 'crypto';

// Serialize user instance to the session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = 
        await Agent.findById(id) ||
        await Owner.findById(id) ||
        await SuperAgent.findById(id) ||
        await Admin.findById(id) ||
        await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// console.log("Google OAuth configuration:", {
//     clientID: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...", // Show just first few chars for security
//     callbackURL: process.env.GOOGLE_CALLBACK_URL,
//     redirectPath: "/auth/google/callback"
//   });

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
            passReqToCallback: true,
        },
        async (
            req: Request,
            accessToken: string,
            refreshToken: string,
            profile: Profile,
            done: (err: any, user?: any) => void
        ) => {
            try {
                // Check if user exists based on googleId
                // console.log("profile", profile);
                // console.log("req", req)
                let user = 
                await Agent.findOne({ googleId: profile.id }) ||
                await Owner.findOne({ googleId: profile.id }) ||
                await SuperAgent.findOne({ googleId: profile.id }) ||
                await Admin.findOne({ googleId: profile.id }) ||
                await User.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // If user doesn't exist by googleId, try to find by email
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
                
                if (email) {
                    user = 
                    await Agent.findOne({ email }) ||
                    await Owner.findOne({ email }) ||
                    await SuperAgent.findOne({ email }) ||
                    await Admin.findOne({ email }) ||
                    await User.findOne({ email });
                    
                    if (user) {
                        // If user exists with this email, update with googleId
                        user.googleId = profile.id;
                        await user.save();
                        return done(null, user);
                    }
                }

                // If user doesn't exist, create a new user
                // Generate a random password for Google users 
                // (since password is required in your schema)
                const randomPassword = crypto.randomBytes(16).toString('hex');
                const hashedPassword = await hashPassword(randomPassword);
                
                // Create new user
                const newUser = new User({
                    googleId: profile.id,
                    name: profile.displayName || (profile.name ? `${profile.name.givenName} ${profile.name.familyName}` : 'User'),
                    email: email,
                    password: hashedPassword, // Set a random password
                    role: 'customer', // Default role
                    phone: '', // Set empty as it's required but not provided by Google
                    isVerified: true // Auto-verify Google accounts
                });

                await newUser.save();
                return done(null, newUser);
            } catch (error) {
                return done(error, null);
            }
        }
    )
);

export default passport;