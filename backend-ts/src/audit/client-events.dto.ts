import { ArrayMaxSize, IsArray } from 'class-validator';

/** Client telemetry batch (see ClientTelemetryController). */
export class ClientEventsIngestDto {
  @IsArray()
  @ArrayMaxSize(200)
  events!: unknown[];
}
