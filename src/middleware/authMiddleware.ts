import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
  id: string;
  email: string;
  role?: string;
  needsProfileUpdate?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  console.log("here is req.header('Authorization')", req.header('Authorization'));
  
  // Check for Bearer token in Authorization header
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ message: 'Unauthorized - No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
    console.log("here is decoded id:", decoded);
    
    // Check if this is a token with needsProfileUpdate flag (from Google auth)
    if (decoded.needsProfileUpdate) {
      req.currentUser = {
        id: decoded.id,
        email: decoded.email || '',
        needsProfileUpdate: true
      };
      return next();
    }
    
    // Set user info in request object
    req.currentUser = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(403).json({ message: 'Invalid Token' });
  }
};

const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.currentUser) {
    res.status(401).json({ message: 'Unauthorized - Authentication required' });
    return;
  }
  
  // If user needs to complete their profile, don't let them access protected resources yet
  if (req.currentUser.needsProfileUpdate) {
    res.status(403).json({ 
      message: 'Profile update required',
      requiresProfileUpdate: true
    });
    return;
  }
  
  next();
};

const authenticateOwner = (req: Request, res: Response, next: NextFunction): void => {

  if (!req.currentUser) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  if (req.currentUser.role !== 'owner') {
    res.status(403).json({ message: 'Forbidden - Owner access required' });
    return;
  }
  next();
};

const authenticateAgent = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.currentUser) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  if (req.currentUser.role !== 'agent') {
    res.status(403).json({ message: 'Forbidden - Agent access required' });
    return;
  }
  next();
};

const authenticateSuperAgent = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.currentUser) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  if (req.currentUser.role !== 'super-agent') {
    res.status(403).json({ message: 'Forbidden - Super Agent access required' });
    return;
  }
  next();
};

const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.currentUser) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  
  if (req.currentUser.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden - Admin access required' });
    return;
  }
  next();
};

// New middleware that can check for multiple roles at once
const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    if (!roles.includes(req.currentUser.role || '')) {
      res.status(403).json({ 
        message: `Forbidden - Required roles: ${roles.join(', ')}`
      });
      return;
    }
    
    next();
  };
};

export { 
  authenticateUser, 
  authenticateOwner, 
  authenticateSuperAgent, 
  authenticateAgent, 
  authenticateAdmin,
  authorizeRoles 
};

export default authenticateToken;

// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';

// interface UserPayload {
//   id: string;
//   email: string;
// }

// declare global {
//   namespace Express {
//       interface Request {
//           currentUser?: any;
//       }
//   }
// }

// const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
//   console.log("here is req.header('Authorization')",req.header('Authorization'));
//   const token = req.header('Authorization')?.split(' ')[1];
//   if (!token) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
//     console.log("here is decoded id :",decoded);
//     req.currentUser = decoded;
//     next();
//   } catch (err) {
//     res.status(403).json({ message: 'Invalid Token' });
//   }
// };

// const authenticateUser  = (req: Request, res: Response, next: NextFunction): void => {
//   if (!req.currentUser) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }
//   next();
// }

// const authenticateOwner =  (req: Request, res: Response, next: NextFunction): void => {
//   console.log("here is req.currentUser",req.currentUser);
//   if (req.currentUser?.role !== 'owner') {
//     res.status(403).json({ message: 'Forbidden' });
//     return;
//   }
//   next();
// }

// const authenticateAgent = (req: Request, res: Response, next: NextFunction): void => {
//   if (req.currentUser?.role !== 'agent') {
//     res.status(403).json({ message: 'Forbidden' });
//     return;
//   }
//   next();
// }

// const authenticateSuperAgent = (req: Request, res: Response, next: NextFunction): void => {
//   if (req.currentUser?.role !== 'super-agent') {
//     res.status(403).json({ message: 'Forbidden' });
//     return;
//   }
//   next();
// }

// const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
//   if (req.currentUser?.role !== 'admin') {
//     res.status(403).json({ message: 'Forbidden' });
//     return;
//   }
//   next();
// }

// export { authenticateUser, authenticateOwner,authenticateSuperAgent,authenticateAgent,authenticateAdmin };
// export default authenticateToken;