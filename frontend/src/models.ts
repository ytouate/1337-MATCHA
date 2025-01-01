/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** Body_upload_file_api_upload_post */
export interface BodyUploadFileApiUploadPost {
  /**
   * File
   * @format binary
   */
  file: File;
}

/** Gender */
export enum Gender {
  Male = "Male",
  Female = "Female",
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** SignInData */
export interface SignInData {
  /** Login */
  login: string;
  /**
   * Password
   * @minLength 8
   */
  password: string;
}

/** SignupData */
export interface SignupData {
  /**
   * First Name
   * @minLength 3
   * @maxLength 28
   * @pattern ^[a-zA-Z]+(?: [a-zA-Z]+)*$
   */
  first_name: string;
  /**
   * Last Name
   * @minLength 3
   * @maxLength 28
   * @pattern ^[a-zA-Z]+(?: [a-zA-Z]+)*$
   */
  last_name: string;
  /**
   * Username
   * @minLength 3
   * @maxLength 28
   * @pattern ^[a-z][a-z0-9._]*$
   */
  username: string;
  /**
   * Email
   * @format email
   */
  email: string;
  /**
   * Password
   * @minLength 8
   */
  password: string;
  gender: Gender;
  /**
   * Birthdate
   * @format date
   */
  birthdate: string;
}

/** UserPut */
export interface UserPut {
  /** First Name */
  first_name: string;
  /** Last Name */
  last_name: string;
  /** Email */
  email: string;
  /** Bio */
  bio: string;
  gender: Gender;
  sexual_preference: Gender;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Is Verified */
  is_verified: boolean;
  /** Is Profile Completed */
  is_profile_completed: boolean;
}

/** UserUpdate */
export interface UserUpdate {
  /** First Name */
  first_name?: string | null;
  /** Last Name */
  last_name?: string | null;
  /** Email */
  email?: string | null;
  /** Bio */
  bio?: string | null;
  gender?: Gender | null;
  sexual_preference?: Gender | null;
  /** Latitude */
  latitude?: number | null;
  /** Longitude */
  longitude?: number | null;
  /** Is Verified */
  is_verified?: boolean | null;
  /** Is Profile Completed */
  is_profile_completed?: boolean | null;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, HeadersDefaults, ResponseType } from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || "" });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(params1: AxiosRequestConfig, params2?: AxiosRequestConfig): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method && this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === "object") {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title Matcha API
 * @version 1.0.0
 *
 * API for Matcha dating application
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * @description Create a new user account with username, email, and password
     *
     * @tags Authentication
     * @name SignupApiAuthSignupPost
     * @summary User Registration
     * @request POST:/api/auth/signup
     */
    signupApiAuthSignupPost: (data: SignupData, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/signup`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Verify user email using a verification token
     *
     * @tags Authentication
     * @name EmailVerificationApiAuthEmailVerificationGet
     * @summary Verify Email
     * @request GET:/api/auth/email-verification
     */
    emailVerificationApiAuthEmailVerificationGet: (
      query: {
        /** Token */
        token: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<any, void>({
        path: `/api/auth/email-verification`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description Authenticate user and return access and refresh tokens
     *
     * @tags Authentication
     * @name SigninApiAuthSigninPost
     * @summary User Login
     * @request POST:/api/auth/signin
     */
    signinApiAuthSigninPost: (data: SignInData, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/signin`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Send a password reset link to user's email
     *
     * @tags Authentication
     * @name ForgotPasswordApiAuthForgotPasswordPost
     * @summary Request Password Reset
     * @request POST:/api/auth/forgot-password
     */
    forgotPasswordApiAuthForgotPasswordPost: (data: object, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/forgot-password`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Validate a password reset token
     *
     * @tags Authentication
     * @name ValidateResetTokenApiAuthValidateResetTokenTokenGet
     * @summary Validate Password Reset Token
     * @request GET:/api/auth/validate-reset-token/{token}
     */
    validateResetTokenApiAuthValidateResetTokenTokenGet: (token: string, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/validate-reset-token/${token}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Reset user password using a valid reset token
     *
     * @tags Authentication
     * @name ResetPasswordApiAuthResetPasswordTokenPost
     * @summary Confirm Password Reset
     * @request POST:/api/auth/reset-password/{token}
     */
    resetPasswordApiAuthResetPasswordTokenPost: (token: string, data: object, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/reset-password/${token}`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve the current user's data
     *
     * @tags Authentication
     * @name GetMeApiAuthMeGet
     * @summary Get Current User
     * @request GET:/api/auth/me
     */
    getMeApiAuthMeGet: (params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/me`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Sign out the current user
     *
     * @tags Authentication
     * @name SignoutApiAuthSignoutPost
     * @summary Sign Out
     * @request POST:/api/auth/signout
     */
    signoutApiAuthSignoutPost: (params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/auth/signout`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Retrieve public profile information for a specific user
     *
     * @tags User Management
     * @name GetUserApiUsersUsernameGet
     * @summary Get User Profile
     * @request GET:/api/users/{username}
     */
    getUserApiUsersUsernameGet: (username: string, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/users/${username}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Update profile information for the authenticated user
     *
     * @tags User Management
     * @name PartialUpdateUserApiUsersUsernamePatch
     * @summary Update User Profile
     * @request PATCH:/api/users/{username}
     */
    partialUpdateUserApiUsersUsernamePatch: (username: string, data: UserUpdate, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/users/${username}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Replace profile information for the authenticated user
     *
     * @tags User Management
     * @name UpdateUserApiUsersUsernamePut
     * @summary Replace User Profile
     * @request PUT:/api/users/{username}
     */
    updateUserApiUsersUsernamePut: (username: string, data: UserPut, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/users/${username}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete the authenticated user's profile
     *
     * @tags User Management
     * @name DeleteUserApiUsersUsernameDelete
     * @summary Delete User Profile
     * @request DELETE:/api/users/{username}
     */
    deleteUserApiUsersUsernameDelete: (username: string, params: RequestParams = {}) =>
      this.request<any, void>({
        path: `/api/users/${username}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Upload a single image file with validation
     *
     * @tags File Upload
     * @name UploadFileApiUploadPost
     * @summary Upload Image
     * @request POST:/api/upload
     */
    uploadFileApiUploadPost: (data: BodyUploadFileApiUploadPost, params: RequestParams = {}) =>
      this.request<any, void | HTTPValidationError>({
        path: `/api/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),
  };
}
