import { env } from "../config/env";

type OpenApiSchema = Record<string, unknown>;

interface OpenApiDocument {
	openapi: string;
	info: {
		title: string;
		description: string;
		version: string;
	};
	servers: Array<{
		url: string;
		description: string;
	}>;
	tags: Array<{
		name: string;
		description: string;
	}>;
	paths: Record<string, unknown>;
	components: {
		schemas: Record<string, OpenApiSchema>;
	};
}

export const openApiDocument: OpenApiDocument = {
	openapi: "3.1.0",
	info: {
		title: "Attendance Risk Predictor API",
		description: "OpenAPI documentation for the backend API.",
		version: "1.0.0",
	},
	servers: [
		{
			url: env.BETTER_AUTH_URL,
			description: `${env.NODE_ENV} server`,
		},
	],
	tags: [
		{
			name: "Health",
			description: "Service and dependency health checks.",
		},
	],
	paths: {
		"/api/health": {
			get: {
				tags: ["Health"],
				summary: "Get API health",
				description: "Returns application uptime, environment, and database status.",
				operationId: "getHealth",
				responses: {
					"200": {
						description: "Health check completed.",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/HealthResponse",
								},
							},
						},
					},
				},
			},
		},
		"/api/chat": {
			post: {
				tags: ["Chat"],
				summary: "Send a message to the AI Attendance Chatbot",
				description: "Processes a user message and returns the chatbot's response. Requires a valid session token.",
				operationId: "postChat",
				security: [
					{
						bearerAuth: [],
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["message"],
								properties: {
									message: {
										type: "string",
										description: "The user's message to the chatbot",
										example: "What is my current attendance?",
									},
									sessionId: {
										type: "string",
										description: "Optional session ID for keeping track of the conversation context",
										example: "sess_123456",
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Successfully processed the chat message.",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "object",
											description: "The response data from the chatbot",
										},
									},
								},
							},
						},
					},
					"400": {
						description: "Bad Request (e.g., Student profile not found)",
					},
					"401": {
						description: "Unauthorized (Missing or invalid token)",
					},
				},
			},
		},
	},
	components: {
		schemas: {
			HealthResponse: {
				type: "object",
				required: ["success", "status", "timestamp", "environment", "uptime", "services"],
				properties: {
					success: {
						type: "boolean",
						examples: [true],
					},
					status: {
						type: "string",
						enum: ["healthy", "degraded"],
					},
					timestamp: {
						type: "string",
						format: "date-time",
					},
					environment: {
						type: "string",
						enum: ["development", "production", "test"],
					},
					uptime: {
						type: "integer",
						minimum: 0,
					},
					services: {
						type: "object",
						required: ["database"],
						properties: {
							database: {
								type: "string",
								enum: ["healthy", "unhealthy"],
							},
						},
					},
				},
			},
			ErrorResponse: {
				type: "object",
				required: ["success", "message"],
				properties: {
					success: {
						type: "boolean",
						examples: [false],
					},
					message: {
						type: "string",
					},
				},
			},
		},
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT", // Or whichever format the token is
				description: "Enter your session token (without 'Bearer ' prefix).",
			},
		},
	},
};
