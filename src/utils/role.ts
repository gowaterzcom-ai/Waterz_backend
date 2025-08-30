import  User, {  Agent, Owner, SuperAgent, Admin  }  from "../models/User";

export function findRoleById(role: string) {
    switch (role) {
      case 'agent':
        return Agent;
      case 'owner':
        return Owner;
      case 'super-agent':
        return SuperAgent;
      case 'admin':
        return Admin;
      }
      return User;
  }