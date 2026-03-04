/**
 * useUserProfile — simple hook to manage the open/close state of the
 * UserProfileModal from anywhere inside the live stream pages.
 */

import { useCallback, useState } from "react";

export type ProfileViewType = "creator" | "viewer" | "opponent";

export interface ProfileState {
  open: boolean;
  userId: string;
  username?: string;
  viewType: ProfileViewType;
}

const CLOSED_STATE: ProfileState = {
  open: false,
  userId: "",
  username: undefined,
  viewType: "viewer",
};

export function useUserProfile() {
  const [profileState, setProfileState] = useState<ProfileState>(CLOSED_STATE);

  const openProfile = useCallback(
    (
      userId: string,
      username?: string,
      viewType: ProfileViewType = "viewer",
    ) => {
      if (!userId || userId === "system" || userId === "gift_system") return;
      setProfileState({ open: true, userId, username, viewType });
    },
    [],
  );

  const closeProfile = useCallback(() => {
    setProfileState(CLOSED_STATE);
  }, []);

  return { profileState, openProfile, closeProfile };
}
