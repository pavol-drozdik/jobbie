import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyCaptchaDto {
  @IsString()
  @MinLength(1)
  token!: string;
}

export class LoginStatusDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  captcha_token?: string;
}

export class SignupEmailStatusDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  captcha_token?: string;
}

export class LoginAttemptDto {
  @IsEmail()
  email!: string;

  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  captcha_token?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class SessionReportDto {
  @IsIn(['login_success', 'logout'])
  kind!: 'login_success' | 'logout';

  @IsOptional()
  @IsBoolean()
  /** Client preference at login; JWT TTL remains Supabase project settings. Audit-only. */
  remember_me?: boolean;

  @IsOptional()
  @IsString()
  device_id?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}

export class SessionHeartbeatDto {
  @IsString()
  @MinLength(4)
  deviceId!: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
