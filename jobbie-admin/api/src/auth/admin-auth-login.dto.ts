import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminAuthLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  /** Cloudflare Turnstile token when Supabase Auth CAPTCHA is enabled. */
  @IsOptional()
  @IsString()
  captcha_token?: string;
}
