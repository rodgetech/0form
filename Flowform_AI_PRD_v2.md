# 🧠 Product Requirements Document (PRD)

## Project: Flowform AI (placeholder name)

**Date:** October 2025  
**Author:** [Your Name]  
**Version:** 1.0

---

## 1. Executive Summary

**Flowform AI** is an **AI-native conversational form builder** that reimagines how people collect information online.  
Instead of traditional static forms, Flowform AI enables users to create **dynamic, human-like intake conversations** that feel personal, adaptive, and effortless.

By describing what data they want to collect (e.g., “I need a job application for software engineers” or “I want to get customer feedback”), users can instantly generate an AI-driven conversational interface. Respondents interact naturally through chat while Flowform AI intelligently captures structured data — including text, numbers, files, and more.

The MVP will launch as a **hosted SaaS dashboard with shareable links** that drive users into interactive conversations.

---

## 2. Problem Statement

Traditional web forms are:

- Static, impersonal, and tedious to fill.
- Time-consuming to build and maintain.
- Poor at adapting to user context or intent.
- Low-converting, especially for onboarding and surveys.

**Typeform** proved there’s demand for better UX in forms ($140M+ ARR). But even Typeform’s approach is pre-scripted, rigid, and non-adaptive. Flowform AI represents the **next evolution** — AI-native, conversational, and context-aware data collection.

---

## 3. Product Vision

To make data collection **feel like a conversation, not a chore.**  
Flowform AI transforms rigid forms into natural dialogues that can dynamically adapt, infer missing details, and collect structured responses automatically.

### Vision Pillars

1. **Natural** – Feels human and friendly, not robotic.
2. **Adaptive** – Knows when to ask, skip, or clarify.
3. **Intelligent UI** – Switches from text to widgets (date pickers, file upload, etc.) automatically.
4. **Effortless creation** – “Describe what you need” → instantly generate a working form.
5. **Structured output** – Collects clean, structured JSON data ready for analysis or integration.

---

## 4. Target Audience

**Primary audience:** Anyone who needs to collect structured data online — startups, freelancers, recruiters, agencies, creators, or individuals.  
Flowform AI is not limited to businesses. Early adopters might include:

- Startups collecting onboarding info or feedback.
- Freelancers running project intake flows.
- Recruiters accepting job applications.
- Product teams conducting user surveys.
- Creators gathering community feedback.

---

## 5. Product Goals

### 5.1 MVP Goals

- Let users describe what data they want to collect in natural language.
- Generate a conversational “form” automatically.
- Provide a shareable link to a hosted chat UI for respondents.
- Support dynamic conversation logic (follow-ups, clarifications).
- Collect and store structured responses in a simple dashboard.
- Allow file uploads (e.g., resume) with secure storage.
- Make the AI tone friendly and conversational (with optional customization).

### 5.2 Non-Goals (MVP)

- No embeddable widgets yet.
- No third-party integrations or webhooks in v1.
- No advanced analytics.
- No payment or monetization logic yet.

---

## 6. Key Features (MVP Scope)

| Category                  | Feature                  | Description                                                            |
| ------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| **Form Creation**         | Prompt-based setup       | User types a freeform description of what they want to collect.        |
|                           | AI schema generation     | System generates a JSON schema of fields, types, and validations.      |
|                           | Auto conversation design | AI creates a logical flow of questions based on schema.                |
| **Form Experience**       | Conversational UI        | Chat-based form interface for respondents.                             |
|                           | Smart UI rendering       | System decides when to show text input, date picker, file upload, etc. |
|                           | Friendly AI tone         | Conversational and casual by default.                                  |
| **Data Handling**         | Response capture         | Store structured responses tied to creator’s account.                  |
|                           | File uploads             | Secure file storage via Vercel Blob (subject to change).               |
|                           | Dashboard                | Creators can view and manage submissions in a simple table view.       |
| **Platform**              | Hosted SaaS              | Forms hosted on Flowform AI domain (e.g. `flowform.ai/form/abc123`).   |
| **Optional Enhancements** | Tone customization       | Creators can choose tone preset per form (Friendly, Formal, Playful).  |

---

## 7. User Stories

---

### 👩‍💻 User Story 1: Customer Feedback Form (Conversational Flow)

#### 🎯 Goal

As a business owner,  
I want to collect customer feedback conversationally  
so that users feel more engaged and I receive higher-quality insights.

---

#### 🧑‍💻 Creator Flow (Prompt-to-Form)

1. I log into the Flowform AI dashboard and see a text box that says:

   > “Describe what information you want to collect.”

2. I type:

   > “I want to collect customer feedback after they use our product. I’d like to know their name, email, satisfaction (1–5), and any suggestions for improvement.”

3. **AI replies:**

   > “Got it! I’ll collect:
   >
   > - Name
   > - Email
   > - Satisfaction (1–5)
   > - Suggestions  
   >   Want me to include an NPS-style question (likelihood to recommend 1–10)?”

4. I respond:

   > “Yes, please include that.”

5. **AI confirms:**
   > “Perfect! Your conversational feedback form is ready. Here’s your link: https://flowform.ai/form/customer-feedback”

---

#### 💬 Responder Flow (Conversational Submission)

1. I click the link and see a friendly chat UI.  
   **AI:** “Hey 👋 We’d love your quick feedback on your experience! What’s your name?”  
   **User:** “Sarah.”

2. **AI:** “Hi Sarah! What’s the best email to reach you?”  
   **User:** “sarah@startup.io.”

3. **AI:** “Thanks! On a scale of 1–5, how satisfied are you with the product?”  
   _(Shows button chips [1] [2] [3] [4] [5])_  
   **User clicks:** “4.”

4. **AI:** “Good to hear! How likely are you to recommend us to a friend (1–10)?”  
   **User:** “9.”

5. **AI:** “Awesome! Any suggestions on what we could improve?”  
   **User:** “Add more integrations.”

6. **AI:** “Got it 👍 Thanks for the feedback, Sarah! Really appreciate it.”

---

#### ⚙️ System Behavior (Behind the Scenes)

- User’s answers are automatically mapped to fields: name, email, satisfaction, nps, suggestions.
- Data is stored in structured JSON format:
  ```json
  {
    "name": "Sarah",
    "email": "sarah@startup.io",
    "satisfaction": 4,
    "nps": 9,
    "suggestions": "Add more integrations"
  }
  ```
- Creator sees results in their dashboard and can export them later.
- The tone of the AI remains casual, friendly, and consistent with brand personality.

---

### 👩‍💼 User Story 2: Employment Application (with Smart File Upload)

#### 🎯 Goal

As a hiring manager,  
I want to collect applications for a software engineer role  
so that candidates can apply conversationally and upload their resume seamlessly.

---

#### 🧑‍💻 Creator Flow (Prompt-to-Form)

1. I go to the dashboard and type:

   > “I need an employment application for a software engineer role.  
   > I want to collect: full name, email, years of experience, preferred start date, GitHub profile, and resume upload.”

2. **AI replies:**

   > “Got it! I’ll collect:
   >
   > - Name
   > - Email
   > - Years of experience
   > - Preferred start date
   > - GitHub link
   > - Resume (file upload)  
   >   Would you like to include any screening questions?”

3. I respond:

   > “Yes — ask them what’s the most interesting project they’ve built.”

4. **AI confirms:**
   > “Perfect. Your conversational job application is ready!  
   > Here’s your link: https://flowform.ai/form/software-engineer”

**Behind the scenes**, the schema looks like:

```json
{
  "fields": [
    { "id": "name", "type": "text" },
    { "id": "email", "type": "email" },
    { "id": "experience", "type": "number" },
    { "id": "start_date", "type": "date" },
    { "id": "github", "type": "url" },
    { "id": "resume", "type": "file", "accepted": [".pdf", ".docx"] },
    { "id": "project", "type": "text" }
  ]
}
```

---

#### 💬 Applicant Flow (Conversational Submission)

1. Candidate opens the link → friendly chat interface.  
   **AI:** “Hey there 👋 I’m here to guide you through our quick application for the Software Engineer position. What’s your full name?”  
   **User:** “Alex Chen.”

2. **AI:** “Thanks, Alex! What’s the best email to reach you?”  
   **User:** “alex@chen.dev.”

3. **AI:** “Awesome. How many years of experience do you have in software engineering?”  
   **User:** “About five.”

4. **AI:** “Nice — and when could you start if hired?”  
   _(Shows calendar/date picker)_  
   **User selects:** “January 15, 2026.”

5. **AI:** “Cool. Do you have a GitHub or portfolio link?”  
   **User:** “github.com/alexchen.”

6. **AI:** “Perfect! Could you upload your resume so our hiring team can review it?”  
   _(UI switches to file-picker component)_  
   **User uploads:** `alex_chen_resume.pdf.`

7. **AI:** “Got it 👍. Last question — what’s the most interesting project you’ve built?”  
   **User:** “An open-source library for LLM token visualization.”

8. **AI:** “That sounds awesome! Thanks for applying, Alex — we’ll be in touch soon.”

---

#### ⚙️ System Behavior (Behind the Scenes)

- Each user input is mapped to schema fields.
- The AI determines **interaction mode** dynamically:
  - Text input → text field.
  - Email → validation field.
  - Date → date picker.
  - File → upload control.
  - Choice → button chips.
- File uploads stored securely in Vercel Blob (subject to change).
- Final structured output:
  ```json
  {
    "name": "Alex Chen",
    "email": "alex@chen.dev",
    "experience": 5,
    "start_date": "2026-01-15",
    "github": "https://github.com/alexchen",
    "resume": "https://cdn.flowform.ai/uploads/alex_chen_resume.pdf",
    "project": "An open-source library for LLM token visualization"
  }
  ```

---

## 8. Architecture Overview (High-Level)

```
[ User Dashboard ] ----> [ Prompt Parser ]
        |                        ↓
        |               [ Schema Generator (LLM) ]
        |                        ↓
        |               [ Conversation Builder ]
        |                        ↓
        ↓              [ Runtime Engine ]
[ Response Dashboard ] <---- [ Data Storage + File Storage ]
```

**Frontend**

- Next.js + Tailwind for dashboard and chat interface.
- Hosted SaaS experience with shareable links.

**Backend**

- Node.js / Next.js API routes.
- OpenAI or Anthropic API for schema & flow generation.
- Database: Supabase or PostgreSQL for user data + responses.
- File storage: Vercel Blob (temporary decision).

---

## 9. Success Metrics (MVP)

| Metric                | Description                                             | Target                  |
| --------------------- | ------------------------------------------------------- | ----------------------- |
| 🧾 Form Creation Rate | % of users who successfully create at least one form    | 70%                     |
| 💬 Completion Rate    | % of respondents who complete the full conversation     | 65%+                    |
| 📊 Active Users       | Users who create or share a form at least once per week | 100+ within first month |
| 💡 User Delight       | Qualitative feedback: “It feels magical”                | 80% positive            |

---

## 10. Future Roadmap

### **v1.1**

- Embeddable widget for websites.
- Webhooks & integrations (Airtable, Notion, Slack).
- AI analytics (auto insights from responses).

### **v1.2**

- Form templates (onboarding, job app, feedback).
- Custom avatars / themes for chat UI.
- Voice input support.

### **v2.0**

- AI auto-optimization (auto-rewrites questions for better completion).
- Multi-language support.
- Chrome extension for auto-filling external forms.

---

## 11. Open Questions

1. Should we store files permanently or provide temporary access links for security?
2. Will users authenticate via email/password, or do we add OAuth (Google, GitHub) in MVP?
3. Should we allow users to export responses (CSV/JSON) early on, or only view in dashboard?
4. Do we need moderation or content filtering for conversational inputs?
5. Should we allow basic branding (logo, colors) in MVP?

---

## 12. Appendix

### Competitive Benchmarks

- **Typeform:** Linear, scripted, non-adaptive forms.
- **Tally.so:** Simpler form builder, static logic.
- **Formsort / Feathery:** Advanced logic, but still rule-based.
- **Flowform AI:** Dynamic, AI-native, schema-driven, conversational.

---

### Summary

Flowform AI represents the next evolution in form technology — **AI-native, adaptive, and conversational**.  
It removes the friction of form creation and transforms data collection into a natural, human-like experience.
