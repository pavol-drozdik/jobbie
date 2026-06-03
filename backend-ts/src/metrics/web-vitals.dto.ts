import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WebVitalMetricDto {
  @IsString()
  @MaxLength(32)
  name!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  navigationType?: string;
}

export class WebVitalsBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  path?: string;

  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => WebVitalMetricDto)
  metrics!: WebVitalMetricDto[];
}
