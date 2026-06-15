import { getAuthentication } from "./generated/authentication/authentication";
import { getFileUpload } from "./generated/file-upload/file-upload";
import { getInterests } from "./generated/interests/interests";
import { getLocation } from "./generated/location/location";
import { getNotifications } from "./generated/notifications/notifications";
import { getSocial } from "./generated/social/social";
import { getUserManagement } from "./generated/user-management/user-management";

export const authApi = getAuthentication();
export const usersApi = getUserManagement();
export const suggestionsApi = usersApi;
export const socialApi = getSocial();
export const notificationsApi = getNotifications();
export const uploadApi = getFileUpload();
export const interestsApi = getInterests();
export const locationApi = getLocation();

export { AXIOS_INSTANCE } from "./mutator/custom-instance";
export type { ErrorType } from "./mutator/custom-instance";
export * from "./model";
