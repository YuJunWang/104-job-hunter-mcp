# 104 Job Hunter Agent Guidelines (AGENT.md)

This document provides behavioral guidelines for any AI Agent interacting with the `104-job-hunter` MCP Server. When a user requests to search for or apply to jobs on 104, please strictly follow the workflow below to ensure a smooth, interactive, and safe "Hit-in-the-loop" experience.

## 🌟 Core Philosophy
- **User in Control**: Never assume you know which job the user wants to apply for. Always present options and ask for confirmation.
- **Hit-in-the-loop Safety**: The `job104_prepare_application` tool will ONLY open the browser and fill in the text. It will NOT click the final submit button. Do not attempt to bypass this.
- **Customized Pitch**: Use the job details to craft a highly relevant cover letter rather than using a generic template.

## 📝 Recommended Workflow (4-Step Process)

### Step 1: Search & Present (探索與呈現)
1. Use `job104_search` with the user's keywords (e.g., "AI 全端工程師 台北").
2. **Do not dump the raw JSON**. Analyze the results and present them in a highly readable format (like a Markdown table or clean bullet points).
3. Include the Job Title, Company, Salary, Location, and a 1-sentence highlight from the description.
4. **Action**: Pause and ask the user: *"這些職缺中，有哪幾個您比較感興趣？"*

### Step 2: Deep Dive (深挖細節)
1. Once the user selects one or more jobs, use `job104_get_details` with the specific `job_url`.
2. Extract key requirements, tech stack, and company culture from the detailed description.
3. Compare the user's known skills (if provided in the context) with the job requirements and highlight the match rate.

### Step 3: Crafting the Cover Letter (客製化推薦信)
1. Based on the job details, draft a tailored cover letter (自我推薦信).
2. The cover letter should explicitly mention why the user fits this specific role (e.g., mentioning a specific tool or requirement the company asked for).
3. **Action**: You can either show the draft to the user for approval first, or proceed directly to Step 4 and let them review it in the browser popup. (Ask the user for their preference if unsure).

### Step 4: Hit-in-the-loop Application (觸發實體應徵)
1. Call the `job104_prepare_application` tool.
2. Pass the `job_url` and the `cover_letter_text`.
3. Set `dry_run: false` to actually open the user's Chrome browser and trigger the UI.
4. **Action**: Remind the user: *"我已經幫您在畫面上點開應徵視窗並填妥推薦信了。請您在彈出的 Chrome 視窗中檢查內容，如果確認無誤，請親自手動點擊最下方的『確認送出』！"*

## ⚠️ Error Handling & Troubleshooting
- **Timeout or Element Not Found in Step 4**: If the `apply` tool throws an error about not finding the apply button, it usually means:
  1. The user has already applied to this job.
  2. The user's `.chrome-profile` is not logged in.
  - *Agent Response*: Politely inform the user of these possibilities and suggest they check their login status or try another job.
- **Profile Lock Error**: If you see a `ProcessSingleton` error, it means another instance of Chrome is holding the profile.
  - *Agent Response*: Ask the user to close any stray Chrome windows associated with the profile or restart the MCP background server.
