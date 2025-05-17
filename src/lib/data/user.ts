import { verifySession } from '@lib/session';
import { getUserById } from '@db/database';
import { userAgent } from 'next/server';
import { testIsEmail } from '../utils';

export const getUser = async () => {
  const session = await verifySession();
  
  if (!session) return null;
  
  const data = await getUserById(session.userId);
  
  if (!data) return null;
  
  const filteredUser = userDTO(data);

  return filteredUser;
}

function userDTO(user) {
  return {
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    auditTrail: canViewAudit(user.auditTrail, user.role),

  }
} 

function canViewAudit(auditTrail, role) {
  role = role.toLowerCase();
  return role === 'admin' ? auditTrail : null;
}

