# 🎯 Attendance predictor Agent - Backend

A scalable, secure, and type-safe backend powering the Skill Gap Detection Agent platform. The backend handles authentication, user management, assessments, skill analysis, recommendations, and AI-driven workflows while following modern backend engineering practices.

---

## 🚀 Tech Stack

### Core

* Node.js — JavaScript runtime
* Express.js — Web framework
* TypeScript — Type-safe backend development

### Database

* PostgreSQL — Relational database
* Prisma ORM — Type-safe database access and migrations

### Authentication

* Better Auth — Authentication and session management

### Code Quality

* Biome — Formatting, linting, and code quality enforcement

---

## 🎯 About the Project

The Skill Gap Detection Agent analyzes user profiles, assessments, learning progress, and career goals to identify competency gaps and generate actionable learning recommendations.

The backend is responsible for:

* Authentication & Authorization
* User Management
* Skill Gap Analysis
* Assessment Management
* Recommendation Engine
* AI Agent Integration
* Database Management
* API Delivery

---

## 🚀 Installation

### Prerequisites

* Node.js v20+
* PostgreSQL
* pnpm

### Setup

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the project:

```bash
cd skill-gap-detection-agent-backend
```

Install dependencies:

```bash
pnpm install
```

Create environment variables:

```bash
cp .env.example .env
```

Generate Prisma Client:

```bash
pnpm prisma generate
```

Run migrations:

```bash
pnpm prisma migrate dev
```

Start the development server:

```bash
pnpm dev
```

API will be available at:

```txt
http://localhost:3000
```

---

## 🔐 Environment Variables

Example configuration:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL="postgresql://username:password@localhost:5432/skill-gap-db"

BETTER_AUTH_SECRET="your-secret"

BETTER_AUTH_URL="http://localhost:3000"
```

---

## 📜 Available Scripts

```bash
pnpm dev                 # Start development server
pnpm build               # Build application
pnpm start               # Run production build

pnpm prisma generate     # Generate Prisma Client
pnpm prisma migrate dev  # Run migrations
pnpm prisma studio       # Open Prisma Studio

pnpm lint                # Run lint checks
pnpm format              # Format code
pnpm check               # Run Biome checks
pnpm check:fix           # Automatically fix issues
```

---

## 🏗️ Architecture

The backend follows a **Feature-Based Architecture**.

Each feature owns its:

* Routes
* Controllers
* Services
* Schemas
* Types
* Database Queries
* Utilities
* Constants

This keeps business logic isolated and allows teams to scale features independently.

### Rule of Thumb

Before creating a file in a root-level directory, ask:

> Will this be used by multiple features?

If yes → place it in a shared/global directory.

If no → keep it inside the feature.

---

## 📂 Project Structure

```txt
src
│
├── config/                 # Application configuration
├── constants/              # Shared constants
├── middleware/             # Global middleware
├── providers/              # Shared providers
├── schemas/                # Shared schemas
├── services/               # Shared services
├── types/                  # Shared types
├── utils/                  # Shared utilities
│
├── features/
│   │
│   ├── authentication/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── users/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── ...
│   │
│   ├── assessments/
│   ├── skill-gap-analysis/
│   ├── recommendations/
│   └── ai-agents/
│
├── database/
│   ├── prisma.ts
│   └── index.ts
│
├── app.ts
├── server.ts
└── ...
│
prisma/
├── schema.prisma
└── migrations/
```

---

## 📁 Folder Responsibilities

| Folder     | Responsibility                              |
| ---------- | ------------------------------------------- |
| features   | Feature-specific business logic             |
| middleware | Global middleware                           |
| providers  | Shared providers                            |
| types      | Shared TypeScript types                     |
| schemas    | Shared validation schemas                   |
| services   | Shared services                             |
| utils      | Shared utility functions                    |
| constants  | Application-wide constants                  |
| config     | Environment and application configuration   |
| database   | Prisma configuration and database utilities |

---

## 🔄 Request Flow

```txt
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Prisma ORM
   ↓
PostgreSQL
   ↓
Response
```

---

## 🔐 Authentication Strategy

Authentication is powered by Better Auth.

Features include:

* Email & Password Authentication
* Session Management
* Secure Cookie Handling
* OAuth Support
* Protected Routes
* Role-Based Access Control
* User Session Validation

Authentication-related logic should remain inside:

```txt
features/authentication/
```

---

## 🗄️ Database Strategy

All database operations must be performed through Prisma.

### Database Flow

```txt
Schema
   ↓
Migration
   ↓
Database
   ↓
Prisma Client
   ↓
Service Layer
```

### Rules

✅ Use Prisma Client

✅ Keep queries inside services

❌ Avoid database access inside controllers

❌ Avoid raw SQL unless absolutely necessary

---

## 📝 Validation Rules

All incoming requests must be validated.

Use Zod schemas for:

* Request Body
* Query Parameters
* Route Parameters

Example:

```ts
const createAssessmentSchema = z.object({
  title: z.string(),
  description: z.string(),
});
```

Controllers should never trust incoming data.

---

## 📐 Development Guidelines

### File Naming

Use **kebab-case** for all files and folders.

✅ Good

```txt
skill-analysis-service.ts
create-assessment-schema.ts
auth-controller.ts
```

❌ Bad

```txt
SkillAnalysisService.ts
CreateAssessmentSchema.ts
AuthController.ts
```

---

### Controller Naming

```txt
auth-controller.ts
user-controller.ts
assessment-controller.ts
```

---

### Service Naming

```txt
auth-service.ts
assessment-service.ts
recommendation-service.ts
```

---

### Schema Naming

```txt
login-schema.ts
create-assessment-schema.ts
update-profile-schema.ts
```

---

### Route Naming

```txt
auth-routes.ts
user-routes.ts
assessment-routes.ts
```

---

### Type Naming

```txt
user.types.ts
assessment.types.ts
recommendation.types.ts
```

---

### Import Order

```ts
// Node modules
import express from "express";

// Third-party packages
import { z } from "zod";

// Internal modules
import { authService } from "@/features/authentication/services/auth-service";

// Relative imports
import "./some-file";
```

---

### Controller Rules

Controllers should only:

* Receive requests
* Validate input
* Call services
* Return responses

Keep business logic out of controllers.

---

### Service Rules

Services should contain:

* Business logic
* Database interactions
* External integrations
* Domain-specific operations

---

### Error Handling Rules

Use centralized error handling.

✅ Good

```ts
throw new AppError("User not found", 404);
```

❌ Avoid

```ts
res.status(500).json({
  message: "Something went wrong",
});
```

inside services.

---

### TypeScript Rules

* Avoid `any`
* Prefer `unknown`
* Use strict typing
* Define reusable types
* Keep feature-specific types inside features

---

## 🛡️ Security Guidelines

* Never expose secrets in code
* Store configuration in environment variables
* Validate all incoming data
* Protect authenticated routes
* Sanitize user input
* Use secure cookies
* Follow least-privilege principles

---

## 🎯 Development Principles

* Type Safety First
* Feature-Based Architecture
* Service-Oriented Design
* Separation of Concerns
* Secure by Default
* Clean Code Practices
* Maintainability Over Cleverness
* Scalability Over Short-Term Convenience

---

## ✅ Pull Request Checklist

Before creating a PR:

```bash
pnpm check
pnpm build
```

Ensure:

* No TypeScript errors
* No linting issues
* Build succeeds
* Database migrations are included
* New code follows project conventions
* Feature-specific code remains inside its feature directory

---

## 🤝 Support & Contribute

If you found this project helpful, consider giving it a ⭐ on GitHub.

Contributions, suggestions, and improvements are always welcome.
