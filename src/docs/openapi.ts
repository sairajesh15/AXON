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
		securitySchemes?: Record<string, unknown>;
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
				description:
					"Processes a user message and returns the chatbot's response. Requires a valid session token.",
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
										description:
											"Optional session ID for keeping track of the conversation context",
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
		"/api/attendance/history/{studentId}": {
			get: {
				tags: ["Attendance"],
				summary: "Get student attendance history",
				description:
					"Retrieves attendance records for a student, ordered by date descending. Supports pagination and filtering by subject.",
				operationId: "getAttendanceHistory",
				parameters: [
					{
						name: "studentId",
						in: "path",
						required: true,
						description: "The ID of the student or User ID associated with the student",
						schema: {
							type: "string",
						},
					},
					{
						name: "subjectId",
						in: "query",
						required: false,
						description: "Optional filter by subject ID",
						schema: {
							type: "string",
						},
					},
					{
						name: "limit",
						in: "query",
						required: false,
						description: "The number of records to return (default 50)",
						schema: {
							type: "integer",
							default: 50,
						},
					},
					{
						name: "offset",
						in: "query",
						required: false,
						description: "The number of records to skip (default 0)",
						schema: {
							type: "integer",
							default: 0,
						},
					},
				],
				responses: {
					"200": {
						description: "Successfully retrieved attendance history.",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												$ref: "#/components/schemas/AttendanceHistoryRecord",
											},
										},
										count: {
											type: "integer",
											description: "Total number of records matching the filter criteria",
											example: 259,
										},
									},
								},
							},
						},
					},
					"400": {
						description: "Bad Request (e.g., Invalid studentId, query parameter validation error)",
					},
					"404": {
						description: "Student not found",
					},
					"500": {
						description: "Internal server error",
					},
				},
			},
		},
		"/api/attendance/trends/{studentId}": {
			get: {
				tags: ["Attendance"],
				summary: "Get student attendance trends",
				description:
					"Retrieves attendance percentage trends grouped into weekly buckets (Monday-start) for the most recent 12 weeks.",
				operationId: "getAttendanceTrends",
				parameters: [
					{
						name: "studentId",
						in: "path",
						required: true,
						description: "The ID of the student or User ID associated with the student",
						schema: {
							type: "string",
						},
					},
					{
						name: "subjectId",
						in: "query",
						required: false,
						description: "The ID of a specific subject to filter trends for",
						schema: {
							type: "string",
						},
					},
				],
				responses: {
					"200": {
						description: "Successfully retrieved attendance trends.",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												$ref: "#/components/schemas/AttendanceTrendItem",
											},
										},
									},
								},
							},
						},
					},
					"400": {
						description: "Bad Request (e.g., Invalid studentId format, student profile not found)",
					},
					"500": {
						description: "Internal server error",
					},
				},
			},
		},
		"/api/attendance/forecast/{studentId}": {
			get: {
				tags: ["Attendance"],
				summary: "Get student attendance forecast",
				description:
					"Retrieves the current, projected, and best-case attendance forecasts for a student.",
				operationId: "getAttendanceForecast",
				parameters: [
					{
						name: "studentId",
						in: "path",
						required: true,
						description: "The ID of the student or User ID associated with the student",
						schema: {
							type: "string",
						},
					},
				],
				responses: {
					"200": {
						description: "Successfully retrieved attendance forecast.",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											$ref: "#/components/schemas/AttendanceForecast",
										},
									},
								},
							},
						},
					},
					"400": {
						description: "Bad Request (e.g., Invalid studentId format, student profile not found)",
					},
					"500": {
						description: "Internal server error",
					},
				},
			},
		},
		"/api/attendance/recover/{studentId}": {
			post: {
				tags: ["Attendance"],
				summary: "Simulate attendance recovery planner",
				description:
					"Simulates missing subsequent classes in a subject and calculates the minimum consecutive classes needed to recover to 75% and 80% attendance.",
				operationId: "postAttendanceRecover",
				parameters: [
					{
						name: "studentId",
						in: "path",
						required: true,
						description: "The ID of the student or User ID associated with the student",
						schema: {
							type: "string",
						},
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["subjectId", "simulatedMissedClasses"],
								properties: {
									subjectId: {
										type: "string",
										description: "The ID of the subject to simulate",
										example: "subj_123456",
									},
									simulatedMissedClasses: {
										type: "integer",
										description: "The number of classes to simulate missing",
										example: 3,
									},
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Successfully simulated recovery plan.",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											$ref: "#/components/schemas/AttendanceRecoveryResponse",
										},
									},
								},
							},
						},
					},
					"400": {
						description: "Bad Request (e.g., Invalid format, subject summary not found)",
					},
					"500": {
						description: "Internal server error",
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
			AttendanceHistoryRecord: {
				type: "object",
				required: ["id", "date", "subjectId", "subjectCode", "subjectName", "status", "markedBy"],
				properties: {
					id: {
						type: "string",
						example: "rec_123456",
					},
					date: {
						type: "string",
						format: "date-time",
						example: "2026-06-19T00:00:00.000Z",
					},
					subjectId: {
						type: "string",
						example: "subj_123456",
					},
					subjectCode: {
						type: "string",
						example: "CSE209",
					},
					subjectName: {
						type: "string",
						example: "Database Management Systems",
					},
					status: {
						type: "string",
						enum: ["PRESENT", "ABSENT", "LATE"],
						example: "PRESENT",
					},
					markedBy: {
						type: "string",
						example: "system",
					},
				},
			},
			AttendanceTrendItem: {
				type: "object",
				required: ["label", "weekStart", "percentage", "attended", "total"],
				properties: {
					label: {
						type: "string",
						example: "Jun 16",
					},
					weekStart: {
						type: "string",
						format: "date",
						example: "2026-06-16",
					},
					percentage: {
						type: "number",
						format: "float",
						example: 74.5,
					},
					attended: {
						type: "integer",
						example: 19,
					},
					total: {
						type: "integer",
						example: 28,
					},
				},
			},
			AttendanceForecast: {
				type: "object",
				required: ["current", "projected", "bestCase"],
				properties: {
					current: {
						type: "number",
						format: "float",
						example: 73.4,
					},
					projected: {
						type: "number",
						format: "float",
						example: 77.8,
					},
					bestCase: {
						type: "number",
						format: "float",
						example: 85.2,
					},
				},
			},
			AttendanceRecoveryResponse: {
				type: "object",
				required: [
					"currentPercentage",
					"simulatedPercentage",
					"simulatedRiskTier",
					"classesNeededFor75",
					"classesNeededFor80",
				],
				properties: {
					currentPercentage: {
						type: "number",
						format: "float",
						example: 61.3,
					},
					simulatedPercentage: {
						type: "number",
						format: "float",
						example: 57.8,
					},
					simulatedRiskTier: {
						type: "string",
						enum: ["SAFE", "EARLY_WARNING", "DETENTION_RISK", "CRITICAL"],
						example: "CRITICAL",
					},
					classesNeededFor75: {
						type: "integer",
						example: 11,
					},
					classesNeededFor80: {
						type: "integer",
						example: 21,
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
