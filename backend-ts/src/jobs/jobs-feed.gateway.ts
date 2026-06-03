import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import type { JobPublishedSocketPayload } from './jobs.dto';
import { buildSocketIoCorsOrigin } from '../common/http-cors.util';

/**
 * Public namespace for live job listings (no JWT). Used by the home page “latest jobs” column.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/jobs-feed',
  cors: { origin: buildSocketIoCorsOrigin(), credentials: true },
  path: '/socket.io',
})
export class JobsFeedGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(JobsFeedGateway.name);

  handleConnection(client: Socket): void {
    void client.join('public');
    this.logger.verbose(`jobs-feed connected ${client.id}`);
  }

  emitJobPublished(payload: JobPublishedSocketPayload): void {
    this.server.to('public').emit('job_published', payload);
  }
}
