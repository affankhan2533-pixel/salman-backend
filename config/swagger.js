const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Salman Hair Studio REST API Documentation',
    version: '1.0.0',
    description: 'Production-ready RESTful API for Salman Hair Studio (Kurla West, Mumbai)',
    contact: {
      name: 'Salman Hair Studio API Team',
      url: 'https://salmanhairstudio.com',
      email: 'info@salmanhairstudio.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
      cookieAuth: [],
    },
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'Server Health Check',
        responses: {
          200: { description: 'Server operational details' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Admin Login & Cookie Generation',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@salmanhairstudio.com' },
                  password: { type: 'string', example: 'admin123password' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'JWT Authentication Successful' } },
      },
    },
    '/api/services': {
      get: {
        summary: 'Get All Hair Studio Services',
        responses: { 200: { description: 'List of salon services' } },
      },
    },
    '/api/stylists': {
      get: {
        summary: 'Get All Stylists & Master Co-Owners',
        responses: { 200: { description: 'List of salon stylists' } },
      },
    },
    '/api/appointments': {
      post: {
        summary: 'Public Book Appointment Reservation',
        responses: { 201: { description: 'Appointment created successfully' } },
      },
      get: {
        summary: 'Admin Search & Filter Appointments',
        responses: { 200: { description: 'Paginated appointment records' } },
      },
    },
  },
};

module.exports = {
  swaggerUi,
  swaggerSpec,
};
