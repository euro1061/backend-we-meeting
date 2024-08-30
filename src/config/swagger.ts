import { ElysiaSwaggerConfig } from "@elysiajs/swagger";

export const swaggerConfig: ElysiaSwaggerConfig = {
    path: '/swagger',
    provider: 'swagger-ui',
    documentation: {
      info: {
        title: 'Meeting Room Booking API',
        version: '1.0.0',
        description: 'API documentation for the Meeting Room Booking System'
      },
      tags: [
        { name: 'Rooms', description: 'Room management endpoints' },
        { name: 'Authentication', description: 'Authentication management endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          Room: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              description: { type: 'string' },
              capacity: { type: 'integer' },
              imageUrl: { type: 'string', nullable: true }
            }
          }
        }
      }
    }
  }