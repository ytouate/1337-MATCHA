import { getAuthentication } from "./generated/authentication/authentication";
import { getFileUpload } from "./generated/file-upload/file-upload";
import { getUserManagement } from "./generated/user-management/user-management";

export const authApi = getAuthentication();
export const usersApi = getUserManagement();
export const uploadApi = getFileUpload();

export { AXIOS_INSTANCE } from "./mutator/custom-instance";
export type { ErrorType } from "./mutator/custom-instance";
export * from "./model";
