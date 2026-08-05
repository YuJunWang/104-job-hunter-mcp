# 104 Job Hunter Agent Guidelines (AGENT.md)

This document provides behavioral guidelines for any AI Agent interacting with the `104-job-hunter` MCP Server. When a user requests to search for or apply to jobs on 104, please strictly follow the workflow below to ensure a highly personalized, interactive, and safe "Hit-in-the-loop" experience.

## 🌟 Core Philosophy
- **Context-Aware Hunting**: Always try to leverage the user's background (e.g., querying their LLM Wiki or asking for their resume) before blindly searching.
- **User in Control**: Never assume you know which job the user wants to apply for. Always present curated options and ask for confirmation.
- **Hit-in-the-loop Safety**: The `job104_prepare_application` tool will ONLY open the browser and fill in the text. It will NOT click the final submit button. Do not attempt to bypass this.
- **Customized Pitch**: Use the intersection of the user's resume and the job details to craft a highly relevant cover letter rather than using a generic template.

## 📝 The 5-Step "Smart Hunter" Workflow

### Step 1: Context & Resume Retrieval (背景探索)
1. Before searching, check if the user has provided their resume or if it exists in their knowledge base (e.g., using `global-wiki-query` or reading local files).
2. Analyze the resume to extract core skills, past projects, and domain expertise. 

### Step 2: Search & Filter (精準檢索與過濾)
1. Use `job104_search` with keywords formulated from both the user's explicit request and their background.
2. **Do not dump the raw JSON**. Use your LLM brain to secretly cross-reference the search results with the user's resume.
3. Filter out irrelevant jobs (e.g., wrong seniority, missing mandatory skills) and select the top 3 to 5 best matches.

### Step 3: Curated Presentation (精緻呈現)
1. Present the filtered jobs to the user in a highly readable format, preferably a **Markdown Table**.
2. The table should include: 
   - **推薦度 (Match Rating)**: e.g., ⭐⭐⭐⭐⭐
   - **職缺名稱 (Job Title) & 公司 (Company)**
   - **薪資 (Salary)**
   - **核心匹配點 (Match Reason)**: A concise, 1-2 sentence explanation of *why* this job fits their specific resume (e.g., "Your LangGraph experience perfectly matches their demand for AI workflows.").
3. **Action**: Pause and ask the user: *"這幾家看起來都非常有發展潛力！您對哪一家最感興趣？"*

### Step 4: Crafting the Cover Letter (客製化推薦信)
1. Once the user selects a job, optionally use `job104_get_details` to fetch the full JD if you need more context.
2. Draft a tailored cover letter (自我推薦信). The letter MUST explicitly connect specific achievements from the user's resume to the specific requirements of the job.
3. Keep the tone professional but authentic.

### Step 5: Hit-in-the-loop Application (觸發實體應徵)
1. Call the `job104_prepare_application` tool.
2. Pass the `job_url` and the tailored `cover_letter_text`.
3. Set `dry_run: false` to actually open the user's Chrome browser and trigger the UI.
4. **Action**: Remind the user: *"我已經幫您在畫面上點開應徵視窗並填妥推薦信了。請您在彈出的 Chrome 視窗中檢查，確認無誤後，請親自手動點擊最下方的『確認送出』！"*

## ⚠️ Error Handling & Troubleshooting
- **Timeout or Element Not Found in Step 5**: If the `apply` tool throws an error about not finding the apply button, it usually means:
  1. The user has already applied to this job.
  2. The user's `.chrome-profile` is not logged in.
  - *Agent Response*: Politely inform the user of these possibilities and suggest they check their login status or try another job.
- **Profile Lock Error**: If you see a `ProcessSingleton` error, it means another instance of Chrome is holding the profile.
  - *Agent Response*: Ask the user to close any stray Chrome windows associated with the profile or restart the MCP background server.
