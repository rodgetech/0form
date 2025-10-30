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

- ⬜ **Task 1.1.1:** Design `Form` table schema

  - Fields: id, chatId (references Chat.id), userId, title, description, schema (JSONB), tone, isActive, createdAt, updatedAt
  - Links each form to its creation conversation (Chat)
  - Add to `lib/db/schema.ts`

- ⬜ **Task 1.1.2:** Design `FormSubmission` table schema

  - Fields: id, formId, submittedAt, responses (JSONB), metadata (JSONB)
  - No userId needed (submissions can be anonymous)
  - responses JSONB stores field-value pairs matching form schema

- ⬜ **Task 1.1.3:** Design `FormFile` table schema

  - Fields: id, submissionId, formId, fieldName, blobUrl, fileName, fileSize, mimeType, uploadedAt
  - Links to Vercel Blob storage URLs for uploaded files

- ⬜ **Task 1.1.4:** Generate Drizzle migrations

  - Run `pnpm db:generate`
  - Review generated SQL files

- ⬜ **Task 1.1.5:** Run migrations locally
  - Run `pnpm db:migrate`
  - Verify tables created in Drizzle Studio (`pnpm db:studio`)

---

## Phase 2: Form Creation Flow (Creator Side)

### 2.1 System Prompts & AI Configuration

- ⬜ **Task 2.1.1:** Create system prompt for form creation

  - Add to `lib/ai/prompts.ts`
  - Guide AI to ask: "What form would you like to create?"
  - Teach AI to understand form requirements (fields, types, validations)
  - Guide AI to suggest improvements (e.g., "Would you like me to add an NPS question?")
  - Include examples from PRD (customer feedback, job application)

- ⬜ **Task 2.1.2:** Create AI tool for schema generation

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

- ⬜ **Task 2.1.3:** Add iterative refinement flow
  - AI asks clarifying questions if description is vague
  - User can review, approve, or modify generated schema
  - Support multiple iterations before finalizing

### 2.2 Form Persistence

- ⬜ **Task 2.2.1:** Create database queries for forms

  - Add to `lib/db/queries.ts`
  - `createForm({ chatId, userId, schema, title, tone })`
  - `getFormById({ id })`
  - `getFormByChatId({ chatId })` - get form from chat conversation
  - `getFormsByUserId({ userId })` - list all user's forms
  - `updateForm({ id, schema, isActive })`
  - `deleteForm({ id })` - cascade delete submissions

- ⬜ **Task 2.2.2:** Create API route for form operations

  - `app/api/forms/route.ts`
  - POST: Create/save new form (called when user finalizes schema)
  - GET: List user's forms
  - PUT: Update form schema/settings
  - DELETE: Delete form

- ⬜ **Task 2.2.3:** Link form to chat conversation
  - When form is finalized, create Form record with current `chatId`
  - Update Chat title to form name (e.g., "Customer Feedback Form")
  - Store Form.id reference for easy lookup

### 2.3 In-Chat Form Status Display

- ⬜ **Task 2.3.1:** Create form status card component

  - New file: `components/flowform/form-status-card.tsx`
  - Shows when form is published (appears inline in chat)
  - Displays:
    - ✅ Form published
    - 📋 Form title
    - 🔗 Shareable link with copy-to-clipboard
    - 📊 "View X Submissions" button (links to submissions page)
    - ⚙️ Settings/edit link

- ⬜ **Task 2.3.2:** Integrate status card into chat UI

  - Detect when chat has associated published form
  - Render form status card at top or bottom of chat
  - Update in real-time when submissions come in

- ⬜ **Task 2.3.3:** Generate shareable form URL
  - Format: `/form/[formId]` or `/f/[formId]`
  - Copy-to-clipboard functionality with toast notification
  - Show full URL (e.g., `https://flowform.ai/form/abc-123`)

### 2.4 Chat Sidebar Updates (Form History)

- ⬜ **Task 2.4.1:** Update sidebar to show form status

  - Modify `components/sidebar-history.tsx`
  - Add visual indicator for chats with published forms (e.g., 📋 icon or badge)
  - Show submission count if available (e.g., "Customer Feedback (12)")
  - Keep existing chat title/timestamp display

- ⬜ **Task 2.4.2:** Add welcome message for first-time users
  - When user starts first chat, AI says: "Welcome! I'll help you create conversational forms. What would you like to collect from your users?"
  - Show example: "For example: 'I need customer feedback with name, email, and satisfaction rating'"

---

## Phase 3: Form Response Flow (Respondent Side)

### 3.1 Public Form Access

- ⬜ **Task 3.1.1:** Create public form route

  - `app/(public)/form/[id]/page.tsx` or `app/f/[id]/page.tsx`
  - No authentication required
  - Load form schema from database
  - New layout without auth UI elements

- ⬜ **Task 3.1.2:** Add form validation checks

  - Check if form exists (show 404 if not)
  - Check if form is active (show "Form closed" message if inactive)
  - Optional: Track form views for analytics

- ⬜ **Task 3.1.3:** Create public chat UI for respondents
  - Simplified chat interface (no sidebar, no history)
  - Shows form title and optional description
  - Clean, minimal design focused on conversation
  - Reuse chat components from `components/chat.tsx`

### 3.2 Conversational Response Engine

- ⬜ **Task 3.2.1:** Create conversation orchestrator

  - New file: `lib/flowform/conversation-engine.ts`
  - Takes form schema as input
  - Generates conversational questions in logical order
  - Tracks collection state: `{ email: "collected", rating: "pending", feedback: "pending" }`
  - Decides which field to ask next based on context

- ⬜ **Task 3.2.2:** Create system prompt for form filling

  - Add to `lib/ai/prompts.ts`
  - Inject form schema and current state into prompt
  - Instructions:
    - Be friendly and conversational (adjust based on form.tone)
    - Ask one question at a time
    - Validate responses match expected type
    - Map responses to schema fields
    - Confirm all required fields before submission
  - Example: "Great! Now, what's your email address?" → maps to `email` field

- ⬜ **Task 3.2.3:** Implement response validation logic

  - Email validation (regex pattern)
  - Number range validation (min/max)
  - Required field enforcement
  - URL format validation
  - Date format validation
  - AI asks for clarification if response doesn't match: "That doesn't look like a valid email. Could you double-check?"

- ⬜ **Task 3.2.4:** Add conversation state management
  - Track collected fields in memory during session
  - Store partial responses (in case user refreshes?)
  - Provide progress indicator: "3 of 5 questions answered"

### 3.3 Smart UI Component Switching

- ⬜ **Task 3.3.1:** Create UI component selector logic

  - File: `lib/flowform/ui-selector.ts`
  - Based on field type from schema, determine which component to render:
    - `text` → Standard text input
    - `email` → Email input with validation icon
    - `number` → Number input with +/- controls
    - `date` → Date picker component
    - `file` → File upload component
    - `choice` → Button chips (for 2-5 options) or dropdown (6+ options)
    - `scale` (1-5, 1-10) → Horizontal button chips with labels
    - `longtext` → Textarea
  - Return component type + props

- ⬜ **Task 3.3.2:** Create reusable form UI components

  - `components/flowform/date-picker-input.tsx`
    - Calendar dropdown
    - Manual text entry fallback
  - `components/flowform/file-upload-input.tsx`
    - Drag-and-drop zone
    - File type restrictions
    - Progress indicator
  - `components/flowform/button-chips.tsx`
    - Horizontal button group
    - Single/multi-select support
    - Active state styling
  - `components/flowform/scale-selector.tsx`
    - Numeric scale with labels (e.g., "Not satisfied" to "Very satisfied")
    - Visual feedback on hover/selection

- ⬜ **Task 3.3.3:** Integrate UI components with chat stream
  - Modify chat message renderer
  - AI signals field type in response (via tool call or special syntax)
  - Render appropriate input component inline in chat
  - Capture user input and send back to AI
  - AI confirms: "Got it! Rating: 5/5 ⭐"

### 3.4 File Upload Handling

- ⬜ **Task 3.4.1:** Create file upload API route

  - `app/api/flowform/upload/route.ts`
  - Accept multipart form data
  - Upload to Vercel Blob storage
  - Return blob URL and metadata
  - Store metadata temporarily (link to submission later)

- ⬜ **Task 3.4.2:** Add file validation

  - Server-side file type validation (whitelist: .pdf, .docx, .jpg, .png, etc.)
  - File size limits (default 10MB, configurable per form)
  - MIME type verification
  - Error handling with user-friendly messages

- ⬜ **Task 3.4.3:** Create file upload UI component

  - Drag-and-drop zone with visual feedback
  - Click to browse alternative
  - Upload progress bar
  - Image preview (thumbnail for images)
  - File name + size display for documents
  - Remove/replace file option

- ⬜ **Task 3.4.4:** Link uploaded files to submissions
  - Store blob URL temporarily during conversation
  - When submission finalized, create FormFile records
  - Associate files with correct form field and submission

### 3.5 Response Submission & Storage

- ⬜ **Task 3.5.1:** Create structured response mapper

  - File: `lib/flowform/response-mapper.ts`
  - Takes conversation history + form schema
  - Extracts field values from AI-mapped responses
  - Validates all required fields collected
  - Formats as clean JSON:
    ```json
    {
      "email": "user@example.com",
      "rating": 5,
      "feedback": "Great product!",
      "resume": "https://blob.vercel-storage.com/abc-123.pdf"
    }
    ```

- ⬜ **Task 3.5.2:** Create submission API route

  - `app/api/flowform/submit/route.ts`
  - POST: Save form submission
  - Validate form is active
  - Store in `FormSubmission` table with responses JSONB
  - Link uploaded files in `FormFile` table
  - Return submission confirmation

- ⬜ **Task 3.5.3:** Add submission confirmation

  - AI displays thank you message (customizable per form tone)
  - Show summary of submitted data (optional)
  - Friendly closing: "Thanks for your feedback! We'll be in touch soon."
  - Optional: Redirect or show "Form submitted" page

- ⬜ **Task 3.5.4:** Handle submission errors gracefully
  - Network errors → Retry option
  - Validation errors → Ask user to correct specific fields
  - Form closed → Show message
  - Already submitted? → Optional duplicate prevention

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

**Total Core Tasks:** 67 (down from 78 due to simplification)
**Completed:** 0
**In Progress:** 0
**Not Started:** 67

**Current Phase:** Phase 1 - Database Schema & Core Models
**Next Milestone:** Complete database schema design and run first migrations

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

_Last Updated: October 30, 2025_
_Updated By: Claude + Luis_
