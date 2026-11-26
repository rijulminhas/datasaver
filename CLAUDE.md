# DataSaver – Project Development Instructions

## 1. Project Overview

Project Name: **DataSaver**

Tagline: **Your Memories. Your Files. Always Yours.**

DataSaver is a personal digital storage and file management platform where users can securely store, manage, organize, download, and delete their important digital data.

Users should be able to save:
- Photos and images (JPG, JPEG, PNG, WEBP, GIF, SVG where safely supported, etc.).
- Videos (MP4, MOV, AVI, MKV, WEBM, etc.).
- Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, etc.).
- Audio files (MP3, WAV, AAC, etc.).
- ZIP and other archive files.
- Other common file formats.

The platform should be designed to support different file types without unnecessarily restricting users to a small predefined list of extensions.

The long-term goal is to make DataSaver a reliable personal cloud storage platform.

## 2. Existing Technology Stack

The project has already been initialized and development has started.

Use the existing technologies:

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- PostgreSQL (Neon) 
- Drizzle ORM
- Drizzle Kit for database migrations
- Zod for validation
- Argon2id for password hashing
- Secure HTTP-only cookies for authentication

Do not introduce unnecessary frameworks or replace existing dependencies.

## 3. Important: Existing Implementation Must Be Preserved

The following functionality has already been implemented and tested:

- User signup API.
- User login API.
- User logout API.
- Session-based authentication.
- Database connection.
- Drizzle ORM configuration.
- Database migration.
- Existing database tables, including users and sessions.
- Authentication APIs are working correctly.

Before making any changes:

1. Inspect the complete existing project structure.
2. Read package.json and understand installed dependencies.
3. Inspect the existing database schema.
4. Identify all existing database tables, including the third table.
5. Inspect signup, login, logout and session validation APIs.
6. Understand existing middleware and authentication utilities.
7. Check the current environment variables.

IMPORTANT:
- Do not rewrite working authentication logic.
- Do not recreate the Next.js project.
- Do not delete existing database tables.
- Do not change working API endpoints without a valid reason.
- Do not create duplicate authentication implementations.
- Reuse existing components, utilities and functions wherever possible.

Continue development using the existing codebase.

## 4. Authentication and Account Management

Complete the authentication experience with professional UI.

### Signup Page
- Full name.
- Email address.
- Password.
- Confirm password.
- Show/hide password.
- Form validation.
- Email format validation.
- Password strength feedback.
- Appropriate error and success messages.
- Redirect users to the dashboard after successful registration.

### Login Page
- Email address.
- Password.
- Show/hide password.
- Remember me option, only if supported by the existing session architecture.
- Forgot password link (implement recovery only when its secure flow is available).
- Redirect authenticated users to the dashboard.
- Display appropriate validation and authentication errors.

### Logout
- Add a logout option in the user profile menu.
- Reuse the existing logout API.
- Invalidate the current session.
- Redirect users to the login page.

### Authentication Security
- Preserve Argon2id password hashing.
- Use secure HTTP-only cookies.
- Validate sessions on the server.
- Protect private dashboard routes.
- Prevent unauthorized users from accessing other users' data.
- Never expose password hashes or session tokens to the frontend.

## 5. DataSaver Dashboard

Create a modern, clean and professional dashboard.

The dashboard should contain:

### Sidebar Navigation
- Dashboard
- All Files
- Photos
- Videos
- Documents
- Audio
- Folders
- Trash (only if a trash/recovery feature is implemented)
- Settings
- Profile

### Dashboard Overview

Display:
- Total uploaded files.
- Total storage used.
- Available storage.
- Number of photos.
- Number of videos.
- Number of documents.
- Recently uploaded files.
- Storage usage visualization.

### File Management

Users should be able to:

1. Upload files using a file picker.
2. Upload files using drag and drop.
3. Upload multiple files.
4. View uploaded files.
5. Download individual files.
6. Delete individual files.
7. Select and delete multiple files.
8. Search files by filename.
9. Filter files by file type.
10. Sort files by name, size and upload date.
11. Create folders.
12. Move files between folders.

Provide appropriate upload progress indicators, loading states, empty states and error messages.

## 6. File Storage Architecture

This is one of the most important parts of DataSaver.

Do not store actual file binary data directly in PostgreSQL.

Use object/file storage for file contents and PostgreSQL for file metadata.

Before implementing storage:

1. Evaluate the available storage options.
2. Check the existing project configuration.
3. Prefer a storage architecture that can start with minimal or zero initial investment.
4. Avoid introducing paid services without discussing the cost and alternatives first.
5. Keep the storage implementation provider-independent where practical.

Create a storage abstraction so that the storage provider can be changed in the future without rewriting the complete application.

The storage system should support:
- Different file formats.
- Large file uploads within configurable limits.
- Multiple file uploads.
- Unique storage keys.
- Secure file downloads.
- File deletion.
- Upload progress.
- File size validation.
- Storage usage tracking.

Never assume unlimited storage or unlimited upload sizes.

Use environment variables for storage credentials and configuration.

Never expose storage credentials in client-side code.

## 7. Database Design

Inspect the existing database schema before adding tables.

Preserve existing users, sessions and the third existing table.

Add new tables only when required.

Suggested future tables:

### files
- id
- userId
- folderId
- originalName
- storedName
- storageKey
- mimeType
- extension
- size
- storageProvider
- createdAt
- updatedAt

### folders
- id
- userId
- name
- parentFolderId
- createdAt
- updatedAt

Additional tables can be introduced later for:
- Storage plans and quotas.
- File sharing.
- Trash and file recovery.
- Upload tracking.

Use proper foreign keys, indexes, unique constraints and cascading deletion rules where appropriate.

Every file and folder must belong to a specific user.

## 8. File Security and Privacy

Security is a priority.

Implement:
- Server-side authentication checks.
- Ownership validation for every file operation.
- File size restrictions.
- MIME type and file signature validation.
- Safe storage filenames.
- Protection against path traversal.
- Secure download authorization.
- Rate limiting for upload and authentication endpoints.
- Safe handling of potentially malicious files.
- Protection against unauthorized file access.

Never trust filenames, MIME types or user-supplied storage keys.

Do not execute uploaded files.

Do not expose publicly accessible storage URLs for private user files.

## 9. UI/UX Design Guidelines

Design DataSaver as a modern SaaS application.

Design direction:
- Minimal and clean interface.
- Professional SaaS dashboard.
- Consistent spacing.
- Rounded cards.
- Subtle shadows.
- Responsive layouts.
- Clear typography.
- Modern icons.
- Smooth but lightweight transitions.

Create a consistent design system using Tailwind CSS.

Use reusable components.

The UI should work properly on:
- Desktop.
- Laptop.
- Tablet.
- Mobile.

Create professional interfaces for:
- Signup.
- Login.
- Dashboard.
- File manager.
- File upload.
- Folder management.
- Profile settings.

Avoid unnecessary visual complexity.

## 10. API Architecture

Follow Next.js App Router conventions.

Keep API logic separate from UI components.

Use proper HTTP methods and status codes.

Validate incoming data using Zod.

Implement appropriate error handling.

Suggested API structure:

Authentication:
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

Files:
- POST /api/files/upload
- GET /api/files
- GET /api/files/[id]
- GET /api/files/[id]/download
- DELETE /api/files/[id]

Folders:
- POST /api/folders
- GET /api/folders
- PATCH /api/folders/[id]
- DELETE /api/folders/[id]

Adapt these routes to the existing project conventions and avoid duplicating existing APIs.

## 11. Development Roadmap

Develop DataSaver in manageable phases.

### Phase 1 – Authentication UI
- Inspect existing authentication implementation.
- Build Signup UI.
- Build Login UI.
- Build Logout UI.
- Connect forms to existing APIs.
- Implement proper validation and error handling.
- Test the complete authentication flow.

### Phase 2 – Dashboard UI
- Create application layout.
- Build sidebar navigation.
- Build dashboard overview.
- Add storage usage cards.
- Add recent files section.
- Implement responsive design.

### Phase 3 – File Storage
- Finalize storage provider and architecture.
- Implement secure file upload.
- Support multiple file formats.
- Save file metadata in PostgreSQL.
- Implement download and delete functionality.
- Track storage usage.

### Phase 4 – File Management
- Implement All Files.
- Implement Photos, Videos and Documents filters.
- Implement search and sorting.
- Implement folder creation.
- Implement moving files between folders.
- Add bulk operations.

### Phase 5 – Advanced Features
- File previews where supported.
- Trash and recovery.
- Storage quotas.
- Account settings.
- Password recovery.
- File sharing with explicit user permissions.

### Phase 6 – Testing and Deployment
- Test signup, login and logout.
- Test file upload and download.
- Test deletion.
- Test file ownership and security.
- Test large files and upload failures.
- Test responsive layouts.
- Optimize performance.
- Prepare production deployment.

## 12. Development Rules for Claude

Follow these instructions throughout the project:

1. Always inspect existing code before changing anything.
2. Never replace working functionality unnecessarily.
3. Work in small, manageable development steps.
4. Explain the purpose of important changes.
5. Maintain clean and reusable TypeScript code.
6. Avoid unnecessary dependencies.
7. Follow Next.js App Router best practices.
8. Use server-side operations for sensitive functionality.
9. Never expose secrets or credentials.
10. Keep database schema and migrations consistent.
11. Handle loading, error and empty states.
12. Test functionality after implementation.
13. Do not introduce mock data into production functionality.
14. Do not claim a feature is complete without testing it.
15. Do not silently remove existing functionality.
16. Ask before introducing paid infrastructure or services.
17. Update documentation when significant architecture changes are made.

## 13. First Task: Start From the Existing Project

Do not immediately start implementing every feature.

First:

1. Analyze the existing project.
2. Identify the existing folder structure.
3. Inspect all authentication APIs.
4. Inspect all database schemas and tables.
5. Understand how the current authentication works.
6. Identify reusable components and existing dependencies.
7. Report what is already implemented and what is missing.

Then start with **Phase 1 – Authentication UI**.

Build a professional Signup and Login experience connected to the existing working APIs.

Do not modify working authentication APIs unless an actual issue is identified.

After Phase 1 is complete and tested, proceed to the next development phase.

**Final Objective:** Build DataSaver into a secure, scalable and user-friendly personal cloud storage platform where users can store and manage their digital files and memories from anywhere.