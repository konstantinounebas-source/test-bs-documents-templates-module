import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

// Helper to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Custom hook to check if current user has access to a specific page
 * @param {string} pageKey - The unique identifier for the page (e.g., 'Templates', 'MyWorkday')
 * @param {string} redirectTo - Page to redirect to if no access (default: 'Welcome')
 * @param {boolean} skipRedirect - If true, don't redirect on no access (just return the state)
 * @returns {Object} { hasAccess: boolean, isLoading: boolean, accessLevel: string|null }
 */
export function usePageAccess(pageKey, redirectTo = 'Welcome', skipRedirect = false) {
  const [hasAccess, setHasAccess] = useState(null); // null = loading, true/false = result
  const [isLoading, setIsLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState(null); // 'full_access', 'view_only', 'no_access'
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      // Add a small, randomized delay to prevent all page access checks from firing simultaneously
      await delay(Math.random() * 200 + 100); 

      try {
        const currentUser = await base44.auth.me();
        
        // Everyone has access to the Welcome page to prevent redirect loops.
        if (pageKey === 'Welcome') {
          setHasAccess(true);
          setAccessLevel('full_access');
          setIsLoading(false);
          return;
        }

        // If no pageKey provided, allow access (for backwards compatibility)
        if (!pageKey) {
          setHasAccess(true);
          setAccessLevel('full_access');
          setIsLoading(false);
          return;
        }

        // If user is admin and has no access profile, allow full access to everything
        if (currentUser?.role === 'admin' && !currentUser.access_profile_id) {
          setHasAccess(true);
          setAccessLevel('full_access');
          setIsLoading(false);
          return;
        }

        // If user has an access profile, check specific permissions
        if (currentUser.access_profile_id) {
          const pagePermissions = await base44.entities.PagePermission.filter({ 
            access_profile_id: currentUser.access_profile_id,
            page_key: pageKey 
          });
          
          if (pagePermissions.length > 0) {
            const permission = pagePermissions[0];
            const userAccessLevel = permission.access_level;
            
            if (userAccessLevel === 'no_access') {
              setHasAccess(false);
              setAccessLevel('no_access');
              // Only redirect if skipRedirect is false
              if (!skipRedirect) {
                navigate(createPageUrl(redirectTo), { replace: true });
              }
            } else {
              setHasAccess(true);
              setAccessLevel(userAccessLevel);
            }
          } else {
            // No specific permission found - default to no access
            setHasAccess(false);
            setAccessLevel('no_access');
            if (!skipRedirect) {
              navigate(createPageUrl(redirectTo), { replace: true });
            }
          }
        } else {
          // User has no access profile - default to no access
          setHasAccess(false);
          setAccessLevel('no_access');
          if (!skipRedirect) {
            navigate(createPageUrl(redirectTo), { replace: true });
          }
        }
        
      } catch (error) {
        console.error("Failed to check page access:", error);
        // On error, deny access as safety measure but don't redirect
        // This prevents redirect loops when there are temporary network issues
        setHasAccess(false);
        setAccessLevel('no_access');
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, [pageKey, redirectTo, navigate, skipRedirect]);

  return { hasAccess, isLoading, accessLevel };
}