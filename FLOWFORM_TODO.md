# Flowform AI - MVP Implementation TODO

**Project:** Flowform AI - AI-Native Conversational Form Builder
**Started:** October 2025
**Status:** Planning Phase

---

## 📋 Overview

This document tracks the implementation progress for Flowform AI MVP. The project is divided into logical phases, with each task building on previous work.

**Product Architecture:**

- **Creator Experience:** Users chat to create forms (reusing existing chat infrastructure)
- **Respondent Experience:** Users chat to fill out forms (new public chat interface)
- **Core Concept:** Every chat = a form creation/editing session. No separate form management UI needed.

**Legend:**

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ⏸️ Blocked/On Hold

---

## Phase 1: Database Schema & Core Models

### 1.1 Database Schema Design

- ✅ **Task 1.1.1:** Design `Form` table schema

  - Fields: id, chatId (references Chat.id), userId, title, description, schema (JSONB), tone, isActive, createdAt, updatedAt
  - Links each form to its creation conversation (Chat)
  - Add to `lib/db/schema.ts`

- ✅ **Task 1.1.2:** Design `FormSubmission` table schema

  - Fields: id, formId, submittedAt, responses (JSONB), metadata (JSONB)
  - No userId needed (submissions can be anonymous)
  - responses JSONB stores field-value pairs matching form schema

- ✅ **Task 1.1.3:** Design `FormFile` table schema

  - Fields: id, submissionId, formId, fieldName, blobUrl, fileName, fileSize, mimeType, uploadedAt
  - Links to Vercel Blob storage URLs for uploaded files

- ✅ **Task 1.1.4:** Generate Drizzle migrations

  - Run `pnpm db:generate`
  - Review generated SQL files

- ✅ **Task 1.1.5:** Run migrations locally
  - Run `pnpm db:migrate`
  - Verify tables created in Drizzle Studio (`pnpm db:studio`)

---

## Phase 2: Form Creation Flow (Creator Side)

### 2.1 System Prompts & AI Configuration

- ✅ **Task 2.1.1:** Create system prompt for form creation

  - Add to `lib/ai/prompts.ts`
  - Guide AI to ask: "What form would you like to create?"
  - Teach AI to understand form requirements (fields, types, validations)
  - Guide AI to suggest improvements (e.g., "Would you like me to add an NPS question?")
  - Include examples from PRD (customer feedback, job application)

- ✅ **Task 2.1.2:** Create AI tool for schema generation

  - New file: `lib/ai/tools/generate-form-schema.ts`
  - Input: User's natural language description
  - Output: Structured JSON schema with:
    ```json
    {
      "fields": [
        {
          "name": "email",
          "type": "email",
          "label": "Email Address",
          "required": true,
          "validation": { "pattern": "email" }
        },
        {
          "name": "rating",
          "type": "scale",
          "label": "How satisfied are you?",
          "required": true,
          "options": { "min": 1, "max": 5 }
        }
      ]
    }
    ```
  - Register tool in chat route

- ✅ **Task 2.1.3:** Add iterative refinement flow
  - Separated schema generation from form creation (two tools: `generateFormSchema` + `finalizeForm`)
  - `generateFormSchema` creates draft/preview (not saved to DB)
  - Users can iterate freely with AI making adjustments
  - `finalizeForm` only called when user explicitly approves
  - Updated `formCreationPrompt` with clear workflow instructions

### 2.2 Form Persistence

- ✅ **Task 2.2.1:** Create database queries for forms

  - Add to `lib/db/queries.ts`
  - `createForm({ chatId, userId, schema, title, tone })`
  - `getFormById({ id })`
  - `getFormByChatId({ chatId })` - get form from chat conversation
  - `getFormsByUserId({ userId })` - list all user's forms
  - `updateForm({ id, schema, isActive })`
  - `deleteForm({ id })` - cascade delete submissions

- ✅ **Task 2.2.2:** Create API route for form operations

  - `app/api/forms/route.ts` - GET (list forms), POST (create form)
  - `app/api/forms/[id]/route.ts` - GET (single form), PATCH (update), DELETE
  - `app/api/forms/schema.ts` - Zod validation schemas
  - Follows existing API patterns: auth checks, ChatSDKError, validation

- ✅ **Task 2.2.3:** Link form to chat conversation
  - When form schema is generated, automatically create Form record with `chatId`
  - Form title/description/tone extracted from generated schema
  - Modified `generateFormSchema` tool to call `createForm()` after generation
  - Chat title remains unchanged (no sync needed)

### 2.3 In-Chat Form Status Display

- ✅ **Task 2.3.0:** Create form preview component for in-chat visualization

  - New files: `components/flowform/form-preview.tsx` and `components/flowform/form-field-preview.tsx`
  - Shows beautiful read-only form UI (like weather widget) when AI generates schema
  - Displays all form fields with appropriate input components
  - Source of truth: FormSchema from AI tool (no modifications)
  - Follows AI SDK generative UI pattern (handler in message.tsx)
  - Fixed prompt to prevent AI from outputting JSON in text response

- ✅ **Task 2.3.1:** Create form status card component

  - New file: `components/flowform/form-status-card.tsx`
  - Shows when form is published via `tool-finalizeForm` handler
  - Compact action bar displaying:
    - ✅ Form published confirmation with CheckCircleFillIcon
    - 🔗 Shareable link in read-only input field
    - 📋 Copy-to-clipboard button with toast notification
  - Follows AI SDK generative UI pattern (handler in message.tsx)
  - Uses existing shadcn/ui components and patterns
  - Removed message property from finalizeForm tool for clean output

- ✅ **Task 2.3.2:** Integrate status card into chat UI

  - Integrated via `tool-finalizeForm` handler in message.tsx
  - FormStatusCard renders inline when form is finalized
  - Completed as part of Task 2.3.1 implementation

- ✅ **Task 2.3.3:** Generate shareable form URL
  - URL format: `${window.location.origin}/form/${formId}` (works for localhost and production)
  - Copy-to-clipboard with toast notification implemented in FormStatusCard
  - Completed as part of Task 2.3.1 implementation

- ✅ **Task 2.3.4:** Add form update/edit functionality in chat

  - Created `updateFormSchema` AI tool in `lib/ai/tools/update-form-schema.ts`
  - Fetches existing form via `getFormByChatId()`, provides as context to AI
  - User can say: "change the tone to professional", "add a phone number field", "make email optional"
  - Generates complete updated schema with requested changes applied
  - Shows updated FormPreview component (reused from generateFormSchema)
  - Enhanced `finalizeForm` to auto-detect and update existing forms
  - Registered tool in chat route and added rendering in message.tsx
  - Updated prompts.ts with editing guidance and types.ts with tool definition
  - Follows same preview-approve pattern as form creation

- ✅ **Task 2.3.5:** Add unpublish/republish functionality

  - Created `toggleFormStatus` AI tool in `lib/ai/tools/toggle-form-status.ts`
  - Smart toggle: automatically detects current status and switches to opposite
  - Uses existing `updateForm({ id, isActive })` query from Task 2.2.1
  - User can say: "pause this form", "unpublish", "make it live again", "republish"
  - Returns `{ formId, previousStatus, newStatus }` for UI display
  - Registered tool in chat route and added rendering in message.tsx
  - Updated prompts.ts with pause/unpublish guidance
  - Updated types.ts with toggleFormStatusTool definition
  - Shows status change in collapsed Tool component with styled message

- ⬜ **Task 2.3.6:** Update FormStatusCard to support post-publish actions

  - Enhance `components/flowform/form-status-card.tsx`
  - Show current form status: "Published" (green) or "Paused" (yellow/gray)
  - Add action prompts matching screenshot:
    - "Would you like to:"
    - "• Unpublish this form"
    - "• Make changes to this form"
    - "• Or are we all set for today?"
  - Can be interactive buttons or AI conversation prompts
  - Update to show "Form Paused" state when isActive = false

### 2.4 Chat Sidebar Updates (Form History)

- ✅ **Task 2.4.1:** Update sidebar to show form status

  - Modified `lib/db/queries.ts` - Updated `getChatsByUserId()` with LEFT JOIN to form table
  - Created `ChatWithForm` type in `lib/db/schema.ts` with `hasForm` boolean field
  - Updated `components/sidebar-history-item.tsx` to show green checkmark icon (CheckCircleFillIcon)
  - Visual indicator: Green checkmark (14px) appears before chat title when form exists
  - No submission count in this phase (keeping it simple for now)

- ✅ **Task 2.4.2:** Add welcome message for first-time users
  - Updated starter templates in `components/suggested-actions.tsx` to form-related examples
  - New templates guide users toward common form types:
    - "Customer feedback form with rating and comments"
    - "Event registration form"
    - "Contact form with name, email, and message"
    - "Job application form with resume upload"
  - AI prompts already have Flowform-specific greeting logic in place

---

## Phase 3: Form Response Flow (Respondent Side)

### 3.1 Public Form Access

- ✅ **Task 3.1.1:** Create public form route

  - Created `app/(forms)/[id]/page.tsx` (used existing forms route group)
  - No authentication required
  - Load form schema from database using `getFormById()`
  - Created `app/(forms)/layout.tsx` - minimal layout with DataStreamProvider only
  - Created `app/(forms)/api/forms/[id]/respond/route.ts` - public chat API endpoint
  - Created `app/(forms)/api/forms/[id]/respond/schema.ts` - Zod validation schema

- ✅ **Task 3.1.2:** Add form validation checks

  - Check if form exists (show 404 if not) ✅
  - Check if form is active (show "Form closed" message if inactive) ✅
  - Optional: Track form views for analytics ⬜ (deferred to Phase 5)

- ✅ **Task 3.1.3:** Create public chat UI for respondents
  - Created `components/flowform/public-chat.tsx`
  - Simplified chat interface (no sidebar, no history) ✅
  - Shows form title and optional description in header ✅
  - Clean, minimal design focused on conversation ✅
  - Reused chat components: Messages, MultimodalInput, DataStreamHandler ✅
  - Fixed model selection ("chat-model") for public forms ✅
  - Credit card alert handling ✅

### 3.2 Conversational Response Engine

- ✅ **Task 3.2.1 & 3.2.2:** Conversational form filling implementation (Hybrid Approach)

  - **Decision:** Skipped separate orchestrator file - used simplified hybrid approach
  - **AI-Guided:** Updated `formFillingPrompt` in `lib/ai/prompts.ts`
    - Injects form schema (title, description, fields, tone)
    - Instructions for asking fields in order
    - Tool usage guidance (collectFieldResponse, submitFormResponse)
    - Tone adaptation based on form.tone setting
  - **Message History:** Implicitly tracks what's been collected
  - **Session-Only State:** No persistence between visits (per user preference)
  - **Field Ordering:** Schema order with intelligent flexibility

- ✅ **Task 3.2.3:** Implement response validation logic

  - Created `lib/ai/tools/validation.ts` with comprehensive validators:
    - `validateEmail()` - Email regex pattern validation
    - `validateUrl()` - URL format validation
    - `validatePhone()` - Phone number validation
    - `validateNumber()` - Number range validation (min/max)
    - `validateDate()` - Date parsing validation
    - `validateRequired()` - Non-empty check
    - `validateChoice()` - Must match provided options
    - `validateScale()` - Range validation for scale fields
    - `validateFieldType()` - Main validator routing to specific validators
  - Created `lib/ai/tools/collect-field-response.ts`:
    - Tool that validates individual field responses
    - Returns `{ valid: boolean, error?: string }`
    - AI uses this after each user answer
  - Validation errors trigger helpful re-prompting by AI

- ✅ **Task 3.2.4:** Add conversation state management

  - **State Storage:** Session-only (no database persistence)
  - **Tracking Method:** Full message history passed to API (client-side state)
  - **Tools Created:**
    - `collectFieldResponse` - Validates each response in real-time
    - `submitFormResponse` - Final validation + database save
  - **Bug Fixes:**
    - Fixed API route to accept full message history instead of single message
    - Fixed schema validation to accept AI SDK message parts (step-start, state, etc.)
    - Fixed URL redirect bug (form stayed on /f/{id} instead of redirecting to /chat/{id})
    - Added `enableUrlNavigation` prop to MultimodalInput component
  - **Prompt Refinement:**
    - Removed verbose greetings and redundant confirmations
    - Made AI responses concise (1-2 sentences max)
    - Tool calls execute silently (no "I am validating..." messages)
  - **Database Queries Added:**
    - `createFormSubmission()` - Saves completed submissions
    - `getSubmissionsByFormId()` - Retrieves submissions
    - `getSubmissionCount()` - Count submissions
  - **API Integration:** Wired up in `app/f/api/forms/[id]/respond/route.ts`
  - **Progress Indicator:** Deferred to Phase 5 (keeping it conversational)

- ✅ **Task 3.2.5:** Enhanced Date/Time Parsing with Natural Language Support

  - **Decision:** Pure conversational approach for MVP differentiation
  - **Library:** Installed `chrono-node` for natural language date parsing
  - **Capabilities:** Supports flexible date input formats:
    - Relative: "tomorrow at 3pm", "next Tuesday", "in 3 days"
    - Absolute: "January 1st, 2026", "Jan 1, 2026 at 2pm"
    - Casual: "next week", "this Friday"
  - **Implementation:**
    - Enhanced `validateDate()` in `lib/ai/tools/validation.ts`
    - Returns parsed ISO string when valid
    - Provides helpful error messages for unparseable dates
  - **Prompt Updates:**
    - Added date field handling instructions to `formFillingPrompt`
    - AI confirms parsed dates back to user in clear format
    - AI handles ambiguous dates with clarifying questions
  - **File Uploads:** Already handled by existing MultimodalInput attachment system (paperclip icon)

### 3.3 Smart UI Component Switching

- ⏸️ **Task 3.3:** Smart UI Component Switching - **DEFERRED**

  - **Decision:** Staying pure conversational for MVP to maintain differentiation
  - **Rationale:**
    - Pure conversational experience is our unique selling point
    - Date/time fields: Handled via natural language parsing (chrono-node)
    - File uploads: Already handled by MultimodalInput attachment system
    - Choice fields: Work naturally through conversation ("Which option: A, B, or C?")
    - All other fields: Natural conversation is faster and more accessible
  - **Benefits of Pure Conversational:**
    - Voice-friendly (no clicking required)
    - Mobile-optimized (no tiny UI components)
    - Natural and human (feels like texting)
    - Lower cognitive load
    - AI advantage over traditional form builders
  - **May Revisit:** Based on user feedback after MVP launch, but core value prop is conversational

### 3.4 File Upload Handling

- ✅ **Task 3.4.1:** Create file upload API route

  - Created `app/(forms)/api/flowform/upload/route.ts`
  - Accepts multipart form data (file, formId, optional fieldName)
  - Uploads to Vercel Blob storage with public access
  - Returns blob URL, filename, size, and MIME type
  - Generic validation (form existence, file size) - field-specific validation in tools

- ✅ **Task 3.4.2:** Add file validation

  - Created `validateFile()` function in `lib/ai/tools/validation.ts`
  - Server-side file type validation with MIME type mapping
  - Supports common formats: .pdf, .doc, .docx, .xls, .xlsx, .jpg, .jpeg, .png, .gif, .txt, .csv
  - File size limit: 10MB (enforced in upload endpoint)
  - Validation happens in `collectFieldResponse` tool (AI knows field context)
  - User-friendly error messages returned to AI for communication

- ✅ **Task 3.4.3:** Reuse existing file upload UI component

  - **Decision:** Reused existing `MultimodalInput` component with paperclip icon
  - Already has drag-and-drop support
  - Shows upload progress and previews
  - Routes to public upload endpoint (`/api/flowform/upload`) for public forms
  - Routes to authenticated endpoint (`/api/files/upload`) for creator chats
  - Image previews configured with Next.js Image component (added Vercel Blob hostname to config)

- ✅ **Task 3.4.4:** Link uploaded files to submissions
  - File metadata extracted from message parts and filtered before sending to AI model
  - AI stores file metadata object `{url, filename, mimeType}` in responses (not just URL)
  - `submitFormResponse` tool creates FormFile records in database
  - Associates files with correct form field and submission ID
  - FormFieldPreview component displays original filename (not full URL)

- ✅ **Task 3.4.5:** Additional Implementation Details
  - **Bug Fix:** Grok model doesn't support PDF/file parts in messages
    - Solution: Filter file parts from messages before sending to model
    - File metadata added to system prompt for AI to access
    - Implemented in `app/(forms)/api/forms/[id]/respond/route.ts`
  - **Database Integration:**
    - Added `createFormFile()` query to `lib/db/queries.ts`
    - Stores all file metadata for retrieval and download
  - **AI Prompt Updates:**
    - Updated `formFillingPrompt` with file handling instructions
    - AI extracts file info from "File Uploads Context" in system prompt
    - Passes metadata to `collectFieldResponse` for validation
  - **Preview Display:**
    - Shows original filename with paperclip icon: `📎 Resume.pdf`
    - Supports both validation format `{url, name, mimeType}` and storage format `{url, filename, mimeType}`

### 3.5 Response Submission & Storage

- ✅ **Task 3.5.1:** Create structured response mapper

  - **Decision:** Response mapping handled by AI tools (no separate mapper file needed)
  - `collectFieldResponse` tool validates and stores each field response
  - AI maintains responses object throughout conversation
  - `submitFormResponse` tool receives complete responses object
  - Format stored in database:
    ```json
    {
      "email": "user@example.com",
      "rating": 5,
      "feedback": "Great product!",
      "resume": {
        "url": "https://blob.vercel-storage.com/abc-123.pdf",
        "filename": "Resume.pdf",
        "mimeType": "application/pdf"
      }
    }
    ```

- ✅ **Task 3.5.2:** Create submission API route

  - **Decision:** Submission handled by AI tool (not separate API route)
  - `submitFormResponse` tool in `lib/ai/tools/submit-form-response.ts`
  - Validates form is active
  - Final validation of all required fields
  - Stores in `FormSubmission` table with responses JSONB
  - Links uploaded files in `FormFile` table
  - Returns success confirmation with submission ID

- ✅ **Task 3.5.3:** Add submission confirmation

  - AI displays thank you message based on form tone
  - Confirmation message returned from `submitFormResponse` tool
  - Success message: "Your response has been submitted successfully!"
  - AI adapts closing based on tone setting
  - No redirect - keeps user in conversational interface

- ✅ **Task 3.5.4:** Handle submission errors gracefully
  - Validation errors handled by `collectFieldResponse` tool
  - AI re-prompts user for invalid/missing fields
  - Network errors show ChatSDKError messages
  - Form closed/inactive detected in both tools
  - Duplicate prevention: Not implemented (allowing multiple submissions per user)

---

## Phase 4: Response Dashboard (Creator Side)

### 4.1 Submissions List View

- ⬜ **Task 4.1.1:** Create submissions dashboard route

  - `app/(dashboard)/forms/[id]/submissions/page.tsx`
  - Authenticated route (creator only)
  - Verify user owns the form

- ⬜ **Task 4.1.2:** Create submissions table UI

  - Table view with columns for each form field
  - Show submission timestamp
  - Show file indicators (icon if file uploaded)
  - Pagination (20 per page default)
  - Empty state: "No submissions yet. Share your form to start collecting responses!"

- ⬜ **Task 4.1.3:** Create database queries for submissions

  - Add to `lib/db/queries.ts`
  - `getSubmissionsByFormId({ formId, limit, offset })`
  - `getSubmissionById({ id })`
  - `getSubmissionCount({ formId })`

- ⬜ **Task 4.1.4:** Add filtering and sorting
  - Filter by date range (last 7 days, last 30 days, custom range)
  - Sort by submission time (newest/oldest first)
  - Search across text responses (optional)
  - Export filtered results

### 4.2 Individual Submission View

- ⬜ **Task 4.2.1:** Create submission detail page

  - `app/(dashboard)/forms/[id]/submissions/[submissionId]/page.tsx`
  - Show all field responses in clean layout
  - Display uploaded files with download links/previews
  - Show submission timestamp and metadata (IP address, user agent if collected)
  - "Back to all submissions" navigation

- ⬜ **Task 4.2.2:** Add file download functionality
  - Generate secure download URLs from Vercel Blob
  - Support direct download
  - Image preview in modal
  - PDF preview (optional)

### 4.3 Data Export

- ⬜ **Task 4.3.1:** Add CSV export

  - Export all submissions as CSV file
  - One column per form field
  - File URLs included as direct links
  - "Export as CSV" button in submissions dashboard
  - Handle nested JSON fields gracefully

- ⬜ **Task 4.3.2:** Add JSON export
  - Export raw structured JSON array
  - Useful for developers/integrations
  - "Export as JSON" button
  - Format:
    ```json
    [
      { "email": "...", "rating": 5, "submittedAt": "..." },
      { "email": "...", "rating": 4, "submittedAt": "..." }
    ]
    ```

### 4.4 Form Settings & Management

- ⬜ **Task 4.4.1:** Create form settings page

  - `app/(dashboard)/forms/[id]/settings/page.tsx`
  - Edit form title and description
  - Toggle active/inactive status (pause accepting responses)
  - Change tone setting
  - Delete form with confirmation dialog

- ⬜ **Task 4.4.2:** Add form deletion with cascade
  - Confirmation modal: "Delete form and all X submissions?"
  - Cascade delete submissions and uploaded files
  - Delete files from Vercel Blob storage
  - Remove form reference from chat

---

## Phase 5: UX Enhancements & Polish

### 5.1 Tone Customization

- ⬜ **Task 5.1.1:** Add tone selector during form creation

  - Options: Friendly (default), Professional, Playful, Formal
  - Show in form status card or settings
  - Store in Form.tone field

- ⬜ **Task 5.1.2:** Implement tone in system prompts
  - Modify `lib/ai/prompts.ts` to include tone context
  - Adjust AI personality:
    - Friendly: "Hey there! 👋 What's your email?"
    - Professional: "Please provide your email address."
    - Playful: "Awesome! Now, what's your email? (We promise not to spam!)"
    - Formal: "Kindly enter your email address to proceed."

### 5.2 UI/UX Polish

- ⬜ **Task 5.2.1:** Add loading states

  - Form creation: "Generating your form..."
  - Submission: "Saving your response..."
  - Dashboard: Skeleton loaders for tables
  - File upload: Progress indicators

- ⬜ **Task 5.2.2:** Add error handling

  - Form not found: Custom 404 page
  - Submission failed: Retry button with error message
  - File upload errors: Clear error message + retry
  - Network errors: Offline detection
  - Use existing ChatSDKError pattern

- ⬜ **Task 5.2.3:** Add success notifications

  - Form created: Toast with "Form created! Copy link to share"
  - Link copied: Toast with "Link copied to clipboard"
  - Submission received: Toast confirmation
  - Use existing `components/toast.tsx` (Sonner)

- ⬜ **Task 5.2.4:** Mobile responsiveness

  - Test all flows on mobile devices
  - Optimize chat UI for small screens
  - File upload touch-friendly
  - Table horizontal scroll on mobile
  - Responsive form status card

- ⬜ **Task 5.2.5:** Keyboard shortcuts & accessibility
  - Enter to send message
  - Escape to close modals
  - Tab navigation through form inputs
  - Screen reader support
  - ARIA labels following Ultracite a11y rules

### 5.3 Onboarding & Empty States

- ⬜ **Task 5.3.1:** Create first-time user experience

  - Welcome message when no forms exist
  - Example prompts: "Try: 'Create a customer feedback form'"
  - Quick tutorial (optional)

- ⬜ **Task 5.3.2:** Add helpful empty states
  - No forms created: "Start by creating your first form"
  - No submissions yet: "Share your form link to start collecting responses"
  - Include relevant CTAs and visuals

### 5.4 Performance Optimizations

- ⬜ **Task 5.4.1:** Optimize form schema generation

  - Cache common patterns
  - Reduce token usage in prompts
  - Use cheaper model if possible (for simple forms)

- ⬜ **Task 5.4.2:** Optimize submissions dashboard
  - Add database indexes on formId, createdAt
  - Implement pagination
  - Lazy load file previews

---

## Phase 6: Testing & Quality Assurance

### 6.1 Testing

- ⬜ **Task 6.1.1:** Write unit tests for core logic

  - Schema generator validation
  - Response mapper logic
  - Field validation functions
  - File upload validation

- ⬜ **Task 6.1.2:** Write integration tests (Playwright)

  - Form creation flow: describe form → generate → finalize
  - Form submission flow: open link → fill form → submit
  - File upload flow: upload → verify storage → download
  - Export flow: CSV and JSON downloads

- ⬜ **Task 6.1.3:** Manual testing scenarios
  - **User Story 1:** Create customer feedback form
    - Fields: name, email, rating 1-5, NPS 0-10, suggestions
    - Fill out as respondent
    - Verify submission in dashboard
  - **User Story 2:** Create job application form
    - Fields: name, email, phone, experience (textarea), resume (file), start date (date picker)
    - Fill out with file upload
    - Download resume from submission view
  - **Edge Cases:**
    - Invalid email format
    - Missing required fields
    - Large file upload (>10MB)
    - Form closed/inactive
    - Network interruption during submission

### 6.2 Security

- ⬜ **Task 6.2.1:** Implement rate limiting

  - Limit form submissions per IP (e.g., 10 per hour)
  - Prevent spam/abuse
  - Show error message if limit exceeded

- ⬜ **Task 6.2.2:** Sanitize user inputs

  - Prevent XSS attacks in form responses
  - Validate all inputs server-side (don't trust client)
  - SQL injection prevention (Drizzle ORM handles this)

- ⬜ **Task 6.2.3:** Secure file uploads

  - Validate file types server-side (not just MIME type)
  - Scan for malicious content (future: virus scanning)
  - Set appropriate CORS headers
  - Generate signed URLs for downloads
  - Auto-delete old uploaded files (optional)

- ⬜ **Task 6.2.4:** Authorization checks
  - Verify user owns form before editing/viewing submissions
  - Public forms don't expose sensitive data
  - API routes validate session tokens

---

## Phase 7: Deployment & Launch Prep

### 7.1 Environment Setup

- ⬜ **Task 7.1.1:** Configure production environment variables

  - Verify all env vars in Vercel dashboard:
    - AUTH_SECRET
    - AI_GATEWAY_API_KEY (or OIDC on Vercel)
    - POSTGRES_URL
    - BLOB_READ_WRITE_TOKEN
    - REDIS_URL (if using resumable streams)
  - Test connections in production

- ⬜ **Task 7.1.2:** Set up production database
  - Run migrations: `pnpm db:migrate`
  - Verify schema in production Postgres
  - Set up database backups

### 7.2 Domain & Routing

- ⬜ **Task 7.2.1:** Configure custom domain

  - Set up DNS for `flowform.ai` or subdomain
  - SSL certificates (auto via Vercel)
  - Verify all routes work with custom domain

- ⬜ **Task 7.2.2:** Test shareable links in production
  - Create test form
  - Share link across platforms (email, Slack, WhatsApp)
  - Verify `/form/[id]` loads correctly
  - Test on different devices/browsers

### 7.3 Monitoring & Analytics

- ⬜ **Task 7.3.1:** Set up error tracking

  - Configure Sentry or similar (optional)
  - Monitor API errors
  - Alert on critical failures

- ⬜ **Task 7.3.2:** Set up basic analytics

  - Track metrics:
    - Form creations per day
    - Form submissions per day
    - Completion rates (started vs submitted)
    - Average time to complete form
  - Use Vercel Analytics or custom solution

- ⬜ **Task 7.3.3:** Set up logging
  - Log AI interactions for debugging
  - Log file uploads (track storage usage)
  - Monitor AI API costs (tokens used)
  - Set up cost alerts

### 7.4 Documentation

- ⬜ **Task 7.4.1:** Update CLAUDE.md

  - Document Flowform architecture
  - Explain form schema format
  - Document conversation engine logic
  - Add common troubleshooting tips

- ⬜ **Task 7.4.2:** Create user-facing help docs (optional)
  - How to create a form
  - How to share a form
  - How to view and export submissions
  - FAQ section

### 7.5 Launch

- ⬜ **Task 7.5.1:** Pre-launch checklist

  - ✅ All MVP features working
  - ✅ Mobile tested and responsive
  - ✅ Critical bugs fixed
  - ✅ Performance acceptable (<3s form load)
  - ✅ Error handling in place
  - ✅ Analytics configured

- ⬜ **Task 7.5.2:** Soft launch (beta)

  - Invite 10-20 beta users
  - Gather feedback via survey or interviews
  - Monitor for issues
  - Iterate based on feedback

- ⬜ **Task 7.5.3:** Public launch
  - Deploy final version to production
  - Announce launch (social media, Product Hunt, etc.)
  - Monitor error logs and user feedback
  - Be ready to hotfix issues
  - Track success metrics (see below)

---

## Future Enhancements (Post-MVP)

### v1.1 - Integrations & Embeds

- ⬜ Embeddable widget for websites (iframe or script tag)
- ⬜ Webhooks for real-time submission notifications
- ⬜ Zapier integration
- ⬜ Airtable integration (auto-sync submissions)
- ⬜ Notion integration
- ⬜ Slack notifications

### v1.2 - Advanced Features

- ⬜ Form templates (pre-built forms for common use cases)
- ⬜ Custom branding (logo, colors, fonts)
- ⬜ AI analytics on responses (sentiment analysis, trends)
- ⬜ Voice input support
- ⬜ Multi-language support (i18n)
- ⬜ Conditional logic (skip questions based on answers)
- ⬜ Multi-page/sectioned forms

### v2.0 - Platform Expansion

- ⬜ AI auto-optimization of questions based on completion rates
- ⬜ A/B testing for form variations
- ⬜ Payment collection (Stripe integration)
- ⬜ Team collaboration (share form editing)
- ⬜ Chrome extension for auto-filling forms
- ⬜ API for programmatic form creation
- ⬜ White-label solution

---

## Notes & Decisions

### Architecture Decisions

- **Product Scope:** Form builder ONLY (no general chatbot feature)
- **Chat = Form:** Every chat conversation is a form creation/editing session
- **No Separate Dashboard:** Forms managed through chat interface + inline status cards
- **Sidebar = Form History:** Existing chat sidebar shows form history
- **Auth:** Using existing Auth.js setup (email/password)
- **Database:** Extending Drizzle schema in `lib/db/schema.ts`
- **AI Model:** Using Grok via Vercel AI Gateway (default model)
- **File Storage:** Vercel Blob (already configured)
- **Chat Infrastructure:** Maximum reuse of existing chat UI and streaming logic

### Key Simplifications from Original Plan

- ❌ Removed `/forms` dashboard page
- ❌ Removed `/forms/new` route
- ❌ Removed `type` field in Chat table (not needed)
- ❌ Removed separate navigation for forms
- ✅ Reusing existing chat UI 100%
- ✅ Forms are just chats with published schemas
- ✅ Inline status cards show form info in chat

### Open Decisions

1. **File Storage Duration:** Permanent or auto-delete after X days? → **TBD**
2. **Submission Limits:** Should forms have max submission counts? → **Optional in v1.1**
3. **OAuth Login:** Add Google/GitHub? → **Not in MVP**
4. **Custom Branding:** Logo/colors in MVP? → **No, v1.2**
5. **Moderation:** Content filtering for responses? → **Not in MVP**

### Success Metrics to Track

- **Form Creation Rate:** 70%+ of users create at least one form
- **Completion Rate:** 65%+ of respondents who start actually submit
- **Active Users:** 100+ in first month
- **User Delight:** 80%+ positive feedback ("feels magical")
- **Avg Time to Create Form:** <3 minutes
- **Avg Submissions per Form:** Target 10+

---

## Progress Summary

**Total Core Tasks:** 68 (includes enhanced date parsing, deferred UI components)
**Completed:** 39 (includes Phase 3.4 File Upload + Phase 3.5 Response Submission)
**In Progress:** 0
**Deferred:** 1 (Task 3.3 - Smart UI Component Switching - pure conversational approach)
**Not Started:** 28

**Current Phase:** Phase 3 - Form Response Flow (Respondent Side) ✅ COMPLETED
**Next Milestone:** Phase 4 - Response Dashboard (Creator Side) - View and manage submissions

**Estimated Timeline:**

- Phase 1: 1-2 days
- Phase 2: 3-4 days
- Phase 3: 5-7 days
- Phase 4: 2-3 days
- Phase 5: 2-3 days
- Phase 6: 2-3 days
- Phase 7: 1-2 days
- **Total: ~3-4 weeks for MVP**

---

_Last Updated: November 1, 2025_
_Updated By: Claude + Luis_
_Recent Completion: Phase 3 - Complete conversational form filling with file upload support_
