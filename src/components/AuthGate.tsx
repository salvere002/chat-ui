import React, { useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import { configManager } from '../utils/config';

type Props = {
  children: React.ReactNode;
};

// AuthGate performs an initial auth check. While checking or when unauthenticated,
// it renders nothing (white page). On success, renders its children (the app).
const AuthGate: React.FC<Props> = ({ children }) => {
  const { status, bootstrap } = useAuthStore();
  const enabled = configManager.getAuthConfig().enabled;

  useEffect(() => {
    if (!enabled) return; // Skip auth when disabled
    // Kick off auth check once on mount
    bootstrap();
  }, [bootstrap, enabled]);

  if (!enabled) {
    // Auth disabled: always render app
    return <>{children}</>;
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  // White page on unauthenticated or while checking
  return null;
};

export default AuthGate;
