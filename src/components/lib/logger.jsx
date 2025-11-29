import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';

export const logAction = async (action) => {
  try {
    const user = await User.me();
    await AuditLog.create({
      ...action,
      user_email: user.email,
    });
  } catch (error) {
    // Fail silently if user is not logged in or logging fails
    console.warn("Failed to log action:", error);
  }
};