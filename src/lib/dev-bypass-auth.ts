// TEMP local-dev flag. Set to false (or delete this file and its imports)
// before pushing to the production GitLab branch — login/middleware must
// go back to the real cookie gate.
import type { UserProfile } from "@/lib/api";

export const DEV_BYPASS_AUTH = true;

export const DEV_BYPASS_USER: UserProfile = {
  id: "dev-bypass",
  email: "dev@local",
  name: "Dev User",
  picture: "",
  email_verified: true,
  role: "user",
  kyc_status: "none",
};
