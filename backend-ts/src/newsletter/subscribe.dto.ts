import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, Equals } from 'class-validator';

/** Body for POST /api/subscribe (public marketing form). */
export class SubscribeDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  /** GDPR: must be explicitly true to store personal data. */
  @IsBoolean()
  @Equals(true, { message: 'consent must be true' })
  consent!: boolean;
}
