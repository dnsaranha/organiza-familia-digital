import { useState, useEffect, useCallback } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// The user must create a .env file with this variable
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

export const useOneSignal = () => {
  const { user } = useAuth();
  const [isOneSignalInitialized, setIsOneSignalInitialized] = useState(false);

  const initializeOneSignal = useCallback(async () => {
    if (isOneSignalInitialized || !ONESIGNAL_APP_ID) {
      if (!ONESIGNAL_APP_ID) {
        console.error("VITE_ONESIGNAL_APP_ID is not set in .env file.");
      }
      return;
    }
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
      });
      setIsOneSignalInitialized(true);
      console.log('OneSignal initialized.');
    } catch (error) {
      console.error('Error initializing OneSignal:', error);
    }
  }, [isOneSignalInitialized]);

  useEffect(() => {
    const setupAndSavePlayerId = async () => {
      if (isOneSignalInitialized && user) {
        try {
          // Wait for the subscription to be established
          await OneSignal.Notifications.requestPermission();
          const playerId = await OneSignal.User.getSubscriptionId();

          if (playerId) {
            console.log('OneSignal Player ID:', playerId);
            // Save the player ID to the user's profile
            const { error } = await supabase
              .from('profiles')
              .update({ onesignal_player_id: playerId })
              .eq('id', user.id);

            if (error) {
              console.error('Error saving OneSignal Player ID:', error);
            } else {
              console.log('OneSignal Player ID saved successfully.');
            }
          } else {
             // This can happen if the user denies permission
            console.log('Could not get OneSignal Player ID. User might have denied permissions.');
          }
        } catch (error) {
          console.error('Error getting or saving OneSignal Player ID:', error);
        }
      }
    };

    setupAndSavePlayerId();
  }, [isOneSignalInitialized, user]);

  return { initializeOneSignal };
};
