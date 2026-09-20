import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// EngineeringCase 以 slug 為穩定識別做 upsert，避免重新 seed 時刪除或覆寫既有案例。
async function upsertEngineeringCase(data: Prisma.EngineeringCaseCreateInput) {
  await prisma.engineeringCase.upsert({
    where: { slug: data.slug },
    update: data,
    create: data,
  })
}

async function main() {
  await prisma.profile.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.skillCategory.deleteMany()
  await prisma.experience.deleteMany()
  await prisma.project.deleteMany()
  await prisma.certification.deleteMany()

  await prisma.profile.create({
    data: {
      displayName: 'Lucky',
      preferredName: 'Lucky',
      titleZh: 'Backend & System Engineer · PHP / Laravel · E-commerce · System Integration · AI Automation',
      titleEn: 'Backend & System Engineer · PHP / Laravel · E-commerce · System Integration · AI Automation',
      introZh:
        '專注於後端系統、電商平台、第三方服務整合與工程自動化，具備多國電商、支付與物流串接、Production Debugging，以及 AI Engineering Workflow 設計經驗。\n\n' +
        '面對一個新系統，我習慣先理解真正的問題與情境（Understand），再把需求轉換成清楚的資料模型（Model），接著進行架構與流程設計（Design）。設計確定後動手實作（Implement），並透過測試與驗收持續驗證正確性（Validate），確保交付到生產環境時是可控、可觀察的（Deploy）。上線後我會主動追蹤異常、定位根因（Debug），並把每一次修正回饋到下一輪的設計與流程中，讓系統與開發流程持續變得更穩定、更好維護（Improve）。\n\n' +
        '這套 Understand → Model → Design → Implement → Validate → Deploy → Debug → Improve 的循環，是我處理電商後端、跨系統整合與工程自動化問題時一貫的思考方式，而不只是單一次性的修 bug 或加功能。',
      introEn:
        'Focused on backend systems, e-commerce platforms, third-party service integration, and engineering automation, with hands-on experience across multi-region e-commerce, payment and logistics integrations, production debugging, and AI engineering workflow design.\n\n' +
        'When approaching a new system, I start by understanding the real problem and context (Understand), then translate requirements into a clear data model (Model) before moving into architecture and process design (Design). Once the design is settled, I implement it (Implement) and continuously verify correctness through testing and acceptance checks (Validate), so that what reaches production is controlled and observable (Deploy). After release, I actively track anomalies and trace them to root cause (Debug), feeding each fix back into the next round of design and process so the system and the workflow itself keep getting more stable and maintainable (Improve).\n\n' +
        'This Understand → Model → Design → Implement → Validate → Deploy → Debug → Improve loop is how I consistently approach e-commerce backend work, cross-system integration, and engineering automation problems, rather than treating each fix or feature as a one-off task.',
      avatarUrl: null,
      contactEmail: null,
      contactLinks: null,
    },
  })

  const skillCategories: Array<{
    nameZh: string
    nameEn: string
    skills: Array<{ nameZh: string; nameEn: string }>
  }> = [
    {
      nameZh: '後端開發',
      nameEn: 'Backend',
      skills: [
        { nameZh: 'PHP', nameEn: 'PHP' },
        { nameZh: 'Laravel', nameEn: 'Laravel' },
        { nameZh: 'Magento', nameEn: 'Magento' },
        { nameZh: 'Node.js', nameEn: 'Node.js' },
      ],
    },
    {
      nameZh: '資料儲存',
      nameEn: 'Data',
      skills: [
        { nameZh: 'MySQL', nameEn: 'MySQL' },
        { nameZh: 'MariaDB', nameEn: 'MariaDB' },
        { nameZh: 'PostgreSQL', nameEn: 'PostgreSQL' },
        { nameZh: 'SQLite', nameEn: 'SQLite' },
        { nameZh: 'Redis', nameEn: 'Redis' },
      ],
    },
    {
      nameZh: 'API 與整合',
      nameEn: 'API & Integration',
      skills: [
        { nameZh: 'REST API', nameEn: 'REST API' },
        { nameZh: 'OAuth2', nameEn: 'OAuth2' },
        { nameZh: 'JWT', nameEn: 'JWT' },
        { nameZh: 'Webhook', nameEn: 'Webhook' },
        { nameZh: 'Payment Gateway', nameEn: 'Payment Gateway' },
        { nameZh: '第三方 API 整合', nameEn: 'Third-party API' },
      ],
    },
    {
      nameZh: '基礎設施',
      nameEn: 'Infrastructure',
      skills: [
        { nameZh: 'Docker', nameEn: 'Docker' },
        { nameZh: 'Linux', nameEn: 'Linux' },
        { nameZh: 'Nginx', nameEn: 'Nginx' },
        { nameZh: 'GCP', nameEn: 'GCP' },
        { nameZh: 'Cloudflare', nameEn: 'Cloudflare' },
        { nameZh: 'DNS', nameEn: 'DNS' },
      ],
    },
    {
      nameZh: '工程實踐',
      nameEn: 'Engineering',
      skills: [
        { nameZh: 'Git', nameEn: 'Git' },
        { nameZh: 'Git Worktree', nameEn: 'Git Worktree' },
        { nameZh: 'Testing', nameEn: 'Testing' },
        { nameZh: 'CI/CD', nameEn: 'CI/CD' },
        { nameZh: 'Queue', nameEn: 'Queue' },
        { nameZh: 'Job', nameEn: 'Job' },
        { nameZh: 'OpenSearch', nameEn: 'OpenSearch' },
      ],
    },
    {
      nameZh: 'AI 工程',
      nameEn: 'AI Engineering',
      skills: [
        { nameZh: 'Claude', nameEn: 'Claude' },
        { nameZh: 'Codex', nameEn: 'Codex' },
        { nameZh: 'AI Agent Workflow', nameEn: 'AI Agent Workflow' },
        { nameZh: 'Human-in-the-loop', nameEn: 'Human-in-the-loop' },
        { nameZh: 'Automated Validation', nameEn: 'Automated Validation' },
        { nameZh: 'Structured Output', nameEn: 'Structured Output' },
      ],
    },
  ]

  for (const [index, category] of skillCategories.entries()) {
    await prisma.skillCategory.create({
      data: {
        nameZh: category.nameZh,
        nameEn: category.nameEn,
        sortOrder: index,
        skills: {
          create: category.skills.map((skill, skillIndex) => ({
            nameZh: skill.nameZh,
            nameEn: skill.nameEn,
            sortOrder: skillIndex,
          })),
        },
      },
    })
  }

  await prisma.experience.create({
    data: {
      companyZh: '華碩電腦股份有限公司',
      companyEn: 'ASUSTeK Computer Inc.',
      roleZh: '後端工程師',
      roleEn: 'Backend Engineer',
      locationZh: '台灣',
      locationEn: 'Taiwan',
      startDate: new Date('2023-08-01'),
      endDate: new Date('2026-03-31'),
      summaryZh:
        '我是一名以 PHP 為主要開發語言的後端工程師，具備電商系統、第三方服務串接及正式環境維護經驗。過去曾參與 ASUS Store 多國電商平台的開發與維護，服務站點包含台灣、美國、加拿大、墨西哥、馬來西亞、菲律賓、土耳其，工作內容涵蓋 Commerce、Payment、Logistics 與 Data 等領域。',
      summaryEn:
        "I am a backend engineer specializing in PHP, with practical experience in e-commerce systems, third-party service integration, and production environment maintenance. I previously participated in the development and maintenance of ASUS Store's multinational e-commerce platforms, supporting markets including Taiwan, the United States, Canada, Mexico, Malaysia, the Philippines, and Turkey, across Commerce, Payment, Logistics, and Data domains.",
      highlightsZh: JSON.stringify([
        '商品、購物車、結帳、訂單、會員與紅利點數（Reward Points）等電商核心模組的功能開發與既有系統維護',
        '串接 Apple Pay、Google Pay、Stripe、藍新金流、GogoPay、Zingala 等第三方金流服務，並開發訂單分期付款（Installment）流程',
        '開發 UPS 定點取貨（Pickup）與物流配送相關流程，處理收件地址欄位驗證與整合',
        '依加拿大、土耳其、菲律賓、墨西哥等市場的地址規則與結帳流程差異，調整並維護地區性結帳邏輯',
        '撰寫 SQL 查詢與 CTE 報表，處理跨時區資料轉換需求，支援營運與財務報表產出',
        '在 MariaDB、OpenSearch、Queue / Job、Docker、WSL2 組成的開發與資料平台上進行功能開發、除錯與環境維護',
        '主動追蹤並排除橫跨結帳、金流、物流與資料流程的正式環境異常問題',
      ]),
      highlightsEn: JSON.stringify([
        'Developed and maintained core e-commerce modules including Product, Cart, Checkout, Order, Membership, and Reward Points',
        'Integrated third-party payment gateways including Apple Pay, Google Pay, Stripe, NewebPay, GogoPay, and Zingala, and built installment payment workflows',
        'Built UPS pickup and shipping-related workflows, and handled shipping address field validation and integration',
        'Adjusted and maintained region-specific checkout logic to account for address rules and checkout differences across markets including Canada, Turkey, the Philippines, and Mexico',
        'Wrote SQL queries and CTE-based reports, and handled cross-timezone data conversion to support operational and financial reporting',
        'Developed, debugged, and maintained services on a data and development platform built on MariaDB, OpenSearch, Queue/Job processing, Docker, and WSL2',
        'Proactively investigated and resolved production issues across checkout, payment, logistics, and data workflows',
      ]),
      sortOrder: 0,
    },
  })

  await prisma.project.create({
    data: {
      nameZh: 'TaskFlow',
      nameEn: 'TaskFlow',
      summaryZh:
        '我自行設計並開發 TaskFlow，一套 Local-first 的 AI Engineering Workflow Platform，讓 AI 代理能依循「需求 → 規劃 → 人工核准 → 實作 → Git Commit → 獨立驗證 → 修正 → 部署驗證 → 合併 → 結案」的完整流程執行工程任務，同時保留人在迴圈中的關鍵審核點。',
      summaryEn:
        'I independently designed and built TaskFlow, a local-first AI Engineering Workflow Platform that lets AI agents carry out engineering tasks through a full Requirement → Planning → Human Approval → Implementation → Git Commit → Independent Validation → Repair → Deployment Validation → Merge → Close pipeline, while keeping a human-in-the-loop at key review points.',
      highlightsZh: JSON.stringify([
        '以 Git worktree 隔離每個任務的工作副本，避免任務間互相干擾',
        '導入測試基準線（test baseline）與差異比對，區分既有失敗與本次修改造成的迴歸',
        '整合瀏覽器驗證（browser validation）與部署驗證流程，確保交付前通過可觀察的檢查',
        '設計 Preview 生命週期管理，涵蓋啟動、健康檢查、驗證到結束的完整流程',
        '透過 LINE 與 Cloudflare 建置遠端任務通知與觸發管道',
        '以結構化 AI 輸出（structured AI output）串接規劃、執行、驗證與修正各階段',
      ]),
      highlightsEn: JSON.stringify([
        'Isolated each task in its own Git worktree to prevent cross-task interference',
        'Introduced test baselines and regression comparison to distinguish pre-existing failures from newly introduced regressions',
        'Integrated browser validation and deployment validation into the pipeline to ensure observable checks before delivery',
        'Designed preview runtime lifecycle management covering startup, health checks, validation, and teardown',
        'Built remote task notification and triggering via LINE and Cloudflare',
        'Connected planning, execution, validation, and repair stages through structured AI output',
      ]),
      techStack: JSON.stringify([
        'AI Agent Workflow',
        'Human-in-the-loop',
        'Git Worktree',
        'Test Baseline',
        'Regression Comparison',
        'Browser Validation',
        'Preview Lifecycle',
        'Process Management',
        'LINE Integration',
        'Cloudflare',
        'SQLite',
        'Structured AI Output',
      ]),
      link: null,
      githubUrl: null,
      imageUrl: null,
      categoryZh: 'AI 工程平台',
      categoryEn: 'AI Engineering Platform',
      subtitleZh: 'AI 工程工作流平台',
      subtitleEn: 'AI Engineering Workflow Platform',
      featured: true,
      sortOrder: 0,
    },
  })

  await prisma.project.create({
    data: {
      nameZh: 'DineFlow',
      nameEn: 'DineFlow',
      summaryZh:
        '我自行規劃並開發餐飲點餐 SaaS 系統 DineFlow。透過這個專案，我累積了從資料庫設計、內用點餐流程、購物車與結帳、多店家架構到系統部署的完整經驗，也開始從使用者流程與產品角度思考系統設計。',
      summaryEn:
        'I independently planned and developed DineFlow, a SaaS-based restaurant ordering system. Through this project, I gained end-to-end experience across database design, dine-in ordering flow, cart and checkout, multi-store architecture, and system deployment, and strengthened my ability to consider system design from both user experience and product perspectives.',
      highlightsZh: JSON.stringify([
        '以 Laravel 開發，設計 Store → Tables / Categories / Products → Orders → Order Items 的資料模型',
        '實作內用點餐流程：QR Code 掃碼 → 選桌 → 瀏覽菜單 → 加入購物車 → 結帳 → 建立訂單',
        '支援多店家（multi-store）架構，讓不同店家的菜單、桌位與訂單彼此獨立',
        '規劃 SaaS 化的商業模式與商家後台，並以 MVP 精神優先驗證核心點餐流程',
        '將系統部署至 GCP 雲端主機，處理環境設定與上線流程',
      ]),
      highlightsEn: JSON.stringify([
        'Built with Laravel; designed a data model of Store → Tables / Categories / Products → Orders → Order Items',
        'Implemented the dine-in ordering flow: QR code scan → table selection → menu browsing → cart → checkout → order creation',
        'Supported a multi-store architecture, keeping each store’s menu, tables, and orders independent',
        'Planned the SaaS business model and merchant admin panel, prioritizing an MVP to validate the core ordering flow first',
        'Deployed the system to a GCP cloud server, handling environment setup and release',
      ]),
      techStack: JSON.stringify(['Laravel', 'MySQL', 'Cart', 'Checkout', 'Multi-store', 'SaaS', 'GCP']),
      link: null,
      githubUrl: null,
      imageUrl: null,
      categoryZh: 'SaaS 產品',
      categoryEn: 'SaaS Product',
      subtitleZh: '餐飲點餐 SaaS 系統',
      subtitleEn: 'Restaurant Ordering SaaS',
      featured: true,
      sortOrder: 1,
    },
  })

  await prisma.project.create({
    data: {
      nameZh: 'Lucky IDV',
      nameEn: 'Lucky IDV',
      summaryZh:
        '這個作品集網站本身也是我的專案之一。它是一套資料驅動（data-driven）的全端工程作品集平台，所有經歷、專案與工程案例都存放在資料庫中並透過後台管理，而不是寫死在頁面裡的靜態履歷。',
      summaryEn:
        'This portfolio website is itself one of my projects. It is a data-driven, full-stack engineering portfolio platform where all experience, project, and engineering case content is stored in a database and managed through an admin panel, rather than hard-coded into static resume pages.',
      highlightsZh: JSON.stringify([
        '前端以 Vue 3 與 TypeScript 建置，支援 zh-TW / EN 雙語系（i18n）',
        '設計 Prisma 資料模型，將經歷、專案、工程案例、技能與證照抽象為結構化內容',
        '開發後台管理介面與對應 API，支援內容的新增、編輯與排序',
        '部署於 Cloudflare，並串接自訂網域',
      ]),
      highlightsEn: JSON.stringify([
        'Built the frontend with Vue 3 and TypeScript, supporting zh-TW / EN bilingual content (i18n)',
        'Designed a Prisma data model that abstracts experience, projects, engineering cases, skills, and certifications into structured content',
        'Developed the admin management interface and corresponding APIs for creating, editing, and reordering content',
        'Deployed on Cloudflare with a custom domain',
      ]),
      techStack: JSON.stringify(['Vue 3', 'TypeScript', 'i18n', 'Prisma', 'Admin', 'API', 'Cloudflare']),
      link: null,
      githubUrl: null,
      imageUrl: null,
      categoryZh: '全端工程平台',
      categoryEn: 'Full-stack Engineering Platform',
      subtitleZh: '全端工程作品集平台',
      subtitleEn: 'Full-stack Engineering Portfolio Platform',
      featured: true,
      sortOrder: 2,
    },
  })

  await prisma.project.create({
    data: {
      nameZh: 'Wings of the Hollow',
      nameEn: 'Wings of the Hollow',
      summaryZh:
        '利用 Godot 引擎開發的 2D 平台動作遊戲專案，涵蓋玩法規劃、角色動畫狀態機與遊戲機制設計，是我在工程之外探索遊戲開發的個人專案。',
      summaryEn:
        'A 2D platform action game project built with the Godot engine, covering gameplay planning, character animation state machines, and game mechanics design. A personal project exploring game development outside of my main engineering work.',
      highlightsZh: JSON.stringify([
        '以 Godot 引擎開發 2D 平台動作遊戲',
        '規劃核心玩法與關卡設計方向',
        '實作角色動畫狀態機（animation states）',
        '設計並調整遊戲機制（game mechanics）',
      ]),
      highlightsEn: JSON.stringify([
        'Developed a 2D platform action game using the Godot engine',
        'Planned core gameplay and level design direction',
        'Implemented character animation state machines',
        'Designed and tuned game mechanics',
      ]),
      techStack: JSON.stringify(['Godot', 'Gameplay Planning', 'Animation States', 'Game Mechanics']),
      link: null,
      githubUrl: null,
      imageUrl: null,
      categoryZh: '其他專案',
      categoryEn: 'Other Projects',
      subtitleZh: '2D 平台動作遊戲專案',
      subtitleEn: '2D Platform Game Project',
      featured: false,
      sortOrder: 3,
    },
  })

  await upsertEngineeringCase({
    slug: 'taskflow-multi-agent-pipeline',
    titleZh: 'TaskFlow：多代理任務流水線',
    titleEn: 'TaskFlow: Multi-Agent Task Pipeline',
    categoryZh: 'AI 系統架構',
    categoryEn: 'AI System Architecture',
    summaryZh: '設計並實作以 Planner→Executor→Validator→Repair 四階段代理協作的自動化任務系統，讓 AI 能自主規劃、執行、驗收並修正程式變更。',
    summaryEn: 'Designed and implemented an automated task system built on a four-stage Planner→Executor→Validator→Repair agent pipeline, enabling AI to autonomously plan, execute, validate, and repair code changes.',
    problemZh: '單一 AI 對話難以穩定完成多步驟、跨檔案的工程任務，容易出現規劃與執行脫節、缺乏驗收機制的問題。',
    problemEn: 'A single AI conversation struggles to reliably complete multi-step, cross-file engineering tasks, often causing planning and execution to drift apart with no built-in acceptance check.',
    contextZh: '需要在不引入額外基礎設施成本的前提下，讓非工程背景的使用者也能透過對話下達需求，並取得可驗證、可回溯的交付成果。',
    contextEn: 'The goal was to let non-engineering users submit requirements conversationally and receive verifiable, traceable deliverables, without introducing heavy additional infrastructure.',
    investigationZh: '評估多種代理協作模式後，發現將「規劃」「執行」「驗證」「修正」拆成獨立角色並以交接紀錄串接，能有效降低單一角色的認知負擔並提高可觀測性。',
    investigationEn: 'After evaluating several multi-agent collaboration patterns, splitting the flow into independent Planner, Executor, Validator, and Repair roles connected via handoff records proved to reduce cognitive load per role and improve observability.',
    solutionZh: '建立以 Planner 產出計畫、Executor 依步驟修改程式、Validator 執行測試與驗收、Repair 針對失敗項目自動修正的迴圈，並以 git worktree 隔離每個任務的工作副本。',
    solutionEn: 'Built a loop where the Planner produces a plan, the Executor implements each step, the Validator runs tests and checks acceptance criteria, and the Repair role automatically fixes failing items, with each task isolated in its own git worktree.',
    validationZh: '透過實際任務執行記錄（typecheck / lint / test / build）確認每個角色的產出皆可被下一階段驗證，並統計修正輪數以評估流程穩定性。',
    validationEn: 'Verified via real task execution logs (typecheck / lint / test / build) that each role’s output can be validated by the next stage, and tracked repair-round counts to assess pipeline stability.',
    resultZh: '任務完成率與可追溯性顯著提升，使用者可在不理解程式細節的情況下，透過交接紀錄了解每個階段的決策與變更。',
    resultEn: 'Task completion rate and traceability improved significantly, allowing users to understand each stage’s decisions and changes via handoff records without needing to read the underlying code.',
    architecture: JSON.stringify([
      { labelZh: 'Planner', labelEn: 'Planner' },
      { labelZh: 'Executor', labelEn: 'Executor' },
      { labelZh: 'Validator', labelEn: 'Validator' },
      { labelZh: 'Repair', labelEn: 'Repair' },
    ]),
    techStack: JSON.stringify(['TypeScript', 'Node.js', 'Git Worktree', 'Prisma']),
    githubUrl: null,
    projectUrl: null,
    featured: true,
    sortOrder: 0,
  })

  await upsertEngineeringCase({
    slug: 'git-repository-topology-detection',
    titleZh: 'Git 儲存庫拓樸偵測',
    titleEn: 'Git Repository Topology Detection',
    categoryZh: '工程基礎設施',
    categoryEn: 'Engineering Infrastructure',
    summaryZh: '設計一套能正確區分主儲存庫、Linked Worktree、受管理專案與真正巢狀儲存庫的偵測邏輯，避免將合法專案誤判為巢狀儲存庫而擋下操作。',
    summaryEn: 'Designed detection logic that correctly distinguishes the main repository, linked worktrees, managed projects, and truly nested repositories, preventing legitimate projects from being blocked as false-positive nested repositories.',
    problemZh: '若僅以「專案路徑是否位於某個 Git 儲存庫路徑之下」判斷是否為巢狀儲存庫，會誤判 Linked Worktree 或平台自身管理的專案，造成合法操作被政策擋下。',
    problemEn: 'Determining nested-repository status purely by whether a project path sits under another Git repository path leads to false positives for linked worktrees and platform-managed projects, blocking legitimate operations.',
    contextZh: '平台需要在準備工作區前先判斷目標路徑的儲存庫身分，且必須能同時處理主儲存庫、由 git worktree 建立的 Linked Worktree，以及獨立管理的專案這幾種常見拓樸。',
    contextEn: 'Before preparing a workspace, the platform needs to determine the repository identity of a target path, and must correctly handle common topologies including the main repository, linked worktrees created via git worktree, and independently managed projects.',
    investigationZh: '透過 git rev-parse 取得儲存庫根目錄與 git dir 位置，並比對兩者關係，發現 Linked Worktree 的 git dir 會指向主儲存庫的 .git/worktrees 子目錄，這個特徵可用來與真正的巢狀儲存庫區分。',
    investigationEn: 'Using git rev-parse to obtain the repository root and git dir revealed that a linked worktree\'s git dir points into the main repository\'s .git/worktrees subdirectory — a distinguishing signature separate from true nested repositories.',
    solutionZh: '建立 RepositoryInfo 作為統一的儲存庫描述模型，經過 Repository Detection 階段標準化路徑並判斷拓樸類型，再交由 Repository Policy 依類型套用對應規則，最後才進入 Workspace Preparation。',
    solutionEn: 'Introduced RepositoryInfo as a canonical description model; the Repository Detection stage normalizes paths and classifies topology type, Repository Policy then applies rules per type, and only afterwards does Workspace Preparation proceed.',
    validationZh: '以主儲存庫、Linked Worktree、平台管理專案、獨立儲存庫與真正巢狀儲存庫等多種路徑組合驗證偵測結果，確認每種拓樸都能被正確分類且不誤擋合法專案。',
    validationEn: 'Verified detection results against combinations of main repository, linked worktree, platform-managed project, independent repository, and true nested repository paths, confirming each topology classifies correctly without blocking legitimate projects.',
    resultZh: '降低了合法專案被巢狀儲存庫政策誤擋的問題，讓工作區準備流程能以一致、可預期的方式處理各種儲存庫拓樸。',
    resultEn: 'Reduced false-positive blocking of legitimate projects by the nested-repository policy, making workspace preparation handle varied repository topologies in a consistent, predictable way.',
    architecture: JSON.stringify([
      { labelZh: 'RepositoryInfo', labelEn: 'RepositoryInfo' },
      { labelZh: '儲存庫偵測', labelEn: 'Repository Detection' },
      { labelZh: '儲存庫政策', labelEn: 'Repository Policy' },
      { labelZh: '工作區準備', labelEn: 'Workspace Preparation' },
    ]),
    techStack: JSON.stringify(['git rev-parse', 'Repository Root', 'Git Dir', 'Linked Worktree', 'Path Normalization', 'Canonical Domain Model', 'Policy Evaluation']),
    githubUrl: null,
    projectUrl: null,
    featured: true,
    sortOrder: 1,
  })

  await upsertEngineeringCase({
    slug: 'deterministic-deployment-validation',
    titleZh: '確定性部署驗證',
    titleEn: 'Deterministic Deployment Validation',
    categoryZh: '部署與驗證',
    categoryEn: 'Deployment & Validation',
    summaryZh: '建立一套多層次的部署驗證流程，不以「建置成功」或「伺服器已啟動」作為部署通過的依據，而是逐項確認健康狀態、身分驗證、資料狀態與瀏覽器可觀察行為。',
    summaryEn: 'Built a multi-layer deployment validation pipeline that does not treat build success or server startup as proof of a working deployment, instead checking health, authentication, state, and browser-observable behavior individually.',
    problemZh: '建置成功或伺服器程序已啟動，不代表服務實際可用；曾出現伺服器已啟動但核心功能無法回應的情況，若僅以啟動與否作為判斷依據會產生假陽性的部署結果。',
    problemEn: 'A successful build or a running server process does not guarantee the service actually works; a server can be up while core functionality fails to respond, so relying only on process status produces false-positive deployment results.',
    contextZh: '需要在自動化流程中判斷一次部署是否真的通過，且判斷結果必須是可重現、不依賴人工目視的確定性檢查。',
    contextEn: 'The automated pipeline needed a deterministic, reproducible way to decide whether a deployment truly passed, without relying on manual visual inspection.',
    investigationZh: '分析過去發生的部署誤判案例後，歸納出健康檢查、身分驗證、資料狀態與瀏覽器渲染是四個容易被忽略但實際上代表服務可用性的關鍵面向。',
    investigationEn: 'Analyzing past false-positive deployment cases identified health checks, authentication, state verification, and browser rendering as four frequently overlooked dimensions that actually represent real service availability.',
    solutionZh: '設計 Deploy → Start Preview → Health Check → Authentication → State Verification → Browser Validation → Cleanup 的驗證流程，每一步都是明確的通過或失敗條件，且流程結束後會清理啟動的程序。',
    solutionEn: 'Designed a Deploy → Start Preview → Health Check → Authentication → State Verification → Browser Validation → Cleanup pipeline where every step has an explicit pass/fail condition, and the started process is cleaned up when the pipeline ends.',
    validationZh: '以 HTTP API 呼叫驗證健康檢查與身分驗證端點的回應，並透過瀏覽器實際載入頁面確認渲染結果與資料狀態一致，確保每一項檢查都是可重現的確定性判斷。',
    validationEn: 'Verified health-check and authentication endpoint responses via HTTP API calls, and confirmed rendered output matched expected state via actual browser loads, ensuring each check is a reproducible deterministic judgment.',
    resultZh: '部署驗證從單純的「程序是否存活」提升為涵蓋健康狀態、身分驗證、資料狀態與瀏覽器行為的多層確認，降低了假陽性部署通過的風險。',
    resultEn: 'Deployment validation moved from a simple process-alive check to a multi-layer confirmation covering health, authentication, state, and browser behavior, reducing the risk of false-positive deployment approvals.',
    architecture: JSON.stringify([
      { labelZh: '部署', labelEn: 'Deploy' },
      { labelZh: '啟動 Preview', labelEn: 'Start Preview' },
      { labelZh: '健康檢查', labelEn: 'Health Check' },
      { labelZh: '身分驗證', labelEn: 'Authentication' },
      { labelZh: '資料狀態驗證', labelEn: 'State Verification' },
      { labelZh: '瀏覽器驗證', labelEn: 'Browser Validation' },
      { labelZh: '清理', labelEn: 'Cleanup' },
    ]),
    techStack: JSON.stringify(['HTTP API Validation', 'Authenticated State', 'Preview Runtime', 'Process Lifecycle', 'Browser Validation', 'Deterministic Checks']),
    githubUrl: null,
    projectUrl: null,
    featured: true,
    sortOrder: 2,
  })

  await upsertEngineeringCase({
    slug: 'test-baseline-regression-detection',
    titleZh: '測試基準線與迴歸偵測',
    titleEn: 'Test Baseline & Regression Detection',
    categoryZh: '測試工程',
    categoryEn: 'Testing Engineering',
    summaryZh: '在修改程式前先建立測試基準線，讓修改後的測試結果能與基準線比對，明確區分既有失敗與本次修改造成的新迴歸。',
    summaryEn: 'Established a test baseline before making code changes, so post-change test results can be compared against the baseline to clearly distinguish pre-existing failures from regressions introduced by the current change.',
    problemZh: '修改程式前，測試套件中可能已存在失敗項目；如果修改後只看到「2 個測試失敗」這樣的總數，無法判斷這是既有問題還是本次修改造成的迴歸。',
    problemEn: 'Before a code change, the test suite may already contain failing tests; if the post-change result only shows a total like "2 tests failed", there is no way to tell whether these are pre-existing failures or regressions caused by the current change.',
    contextZh: '自動化流程需要能自主判斷一次修改是否引入新的破壞，而不需要每次都由人工比對測試輸出的差異。',
    contextEn: 'The automated pipeline needed to autonomously determine whether a change introduced new breakage, without requiring a human to manually diff test output every time.',
    investigationZh: '嘗試直接比較修改前後的測試通過數量後發現，總數相同不代表結果相同（可能一項變好、一項變壞），因此需要以個別測試項目為單位進行比對，而非只看總數。',
    investigationEn: 'Direct comparison of pass counts before and after a change proved unreliable, since an unchanged total could mask one test improving while another regresses; comparison therefore needed to operate at the level of individual test identities, not aggregate counts.',
    solutionZh: '建立 Baseline → Implementation → Branch Test → Compare → Regression Detection 的流程，在實作前先記錄基準線的個別測試結果，實作後於分支重新執行測試，再逐項比對區分既有失敗（Existing Failure）與新迴歸（New Regression）。',
    solutionEn: 'Built a Baseline → Implementation → Branch Test → Compare → Regression Detection pipeline that records individual test results before implementation, reruns tests on the branch afterwards, and compares item-by-item to separate existing failures from new regressions.',
    validationZh: '以刻意包含既有失敗測試的情境驗證流程，確認比對結果能正確標示哪些是既有失敗、哪些是本次修改新增的迴歸，而不是籠統的總數變化。',
    validationEn: 'Validated the pipeline against scenarios deliberately containing pre-existing failing tests, confirming the comparison correctly labels which failures are pre-existing and which are newly introduced regressions, rather than a vague aggregate delta.',
    resultZh: '每次修改後都能明確得知是否引入新的迴歸，而不需要人工逐一比對測試輸出，也避免了因既有失敗被誤判為本次修改責任的情況。',
    resultEn: 'Each change now yields a clear determination of whether new regressions were introduced, without manual test-output comparison, and avoids mistakenly attributing pre-existing failures to the current change.',
    architecture: JSON.stringify([
      { labelZh: '基準線', labelEn: 'Baseline' },
      { labelZh: '實作', labelEn: 'Implementation' },
      { labelZh: '分支測試', labelEn: 'Branch Test' },
      { labelZh: '比對', labelEn: 'Compare' },
      { labelZh: '迴歸偵測', labelEn: 'Regression Detection' },
    ]),
    techStack: JSON.stringify(['Test Baseline', 'Regression Comparison', 'Existing Failure', 'New Regression', 'Automated Testing']),
    githubUrl: null,
    projectUrl: null,
    featured: false,
    sortOrder: 3,
  })

  await upsertEngineeringCase({
    slug: 'ai-structured-output-recovery',
    titleZh: 'AI 結構化輸出復原',
    titleEn: 'AI Structured Output Recovery',
    categoryZh: 'AI 系統架構',
    categoryEn: 'AI System Architecture',
    summaryZh: '設計一套針對 AI 結構化輸出的解析、異常偵測與復原機制，讓 AI 已完成的實際工作不因輸出格式缺陷而被要求重新執行。',
    summaryEn: 'Designed a parsing, anomaly-detection, and recovery mechanism for AI structured output, ensuring work an AI has already completed is not discarded and re-executed merely because the final response is missing required fields.',
    problemZh: 'AI 有時已完成實際工作，但最終回應可能缺少必要欄位（例如 questions、acceptance、steps、artifacts、passed），若因為格式錯誤就要求重新執行，會浪費已完成的工作並可能造成狀態不一致。',
    problemEn: 'An AI agent may have already completed real work, yet its final response can be missing required schema fields (such as questions, acceptance, steps, artifacts, passed); treating this as a failure and re-running the task wastes completed work and can cause state inconsistency.',
    contextZh: '流程仰賴 AI 輸出符合特定結構才能交給下一階段處理，但 AI 輸出品質無法完全保證，需要在不重做已完成工作的前提下處理格式異常。',
    contextEn: 'The pipeline depends on AI output conforming to a specific schema before it can be handed to the next stage, but output quality cannot be fully guaranteed, so format anomalies need to be handled without redoing completed work.',
    investigationZh: '排查發現格式缺陷通常只發生在最終回應的輸出階段，而 AI 實際的工作成果（程式變更、工作區狀態、執行歷程）多半已經確實存在，問題出在「回報」而非「執行」。',
    investigationEn: 'Investigation showed format defects typically occur only at the final-response output stage, while the AI\'s actual work artifacts — code changes, workspace state, execution history — usually already exist correctly; the failure is in reporting, not execution.',
    solutionZh: '保留原始 AI 輸出、已完成進度、工作區與執行歷程，只針對缺漏的欄位進行輸出重建（Output Reconciliation），必要時以既有執行紀錄回填欄位，而不重新觸發實際工作。',
    solutionEn: 'Preserved the original AI output, completed progress, workspace, and execution history, and performed output reconciliation only on the missing fields — backfilling them from existing execution records when needed — without re-triggering the actual work.',
    validationZh: '以刻意缺少必要欄位的輸出樣本驗證復原機制，確認能在不重新執行工作的前提下補齊結構化欄位，且補齊後的結果與實際工作區狀態一致。',
    validationEn: 'Validated the recovery mechanism against output samples deliberately missing required fields, confirming the schema could be completed without re-executing work, and that the reconciled result matched the actual workspace state.',
    resultZh: '格式異常不再導致工作被重複執行，系統在面對不完整的 AI 輸出時具備容錯能力，同時維持工作區與執行歷程的一致性。',
    resultEn: 'Format anomalies no longer cause work to be re-executed; the system tolerates incomplete AI output while preserving consistency between the workspace and execution history.',
    architecture: JSON.stringify([
      { labelZh: '原始 AI 輸出', labelEn: 'Original AI Output' },
      { labelZh: '已完成進度', labelEn: 'Completed Progress' },
      { labelZh: '工作區', labelEn: 'Workspace' },
      { labelZh: '執行歷程', labelEn: 'Execution History' },
      { labelZh: '輸出調和', labelEn: 'Output Reconciliation' },
    ]),
    techStack: JSON.stringify(['Fault Tolerance', 'State Preservation', 'Idempotency Thinking', 'AI Orchestration']),
    githubUrl: null,
    projectUrl: null,
    featured: false,
    sortOrder: 4,
  })

  await upsertEngineeringCase({
    slug: 'preview-runtime-lifecycle-management',
    titleZh: 'Preview 執行環境生命週期管理',
    titleEn: 'Preview Runtime Lifecycle Management',
    categoryZh: '部署與驗證',
    categoryEn: 'Deployment & Validation',
    summaryZh: '設計 Preview 執行環境從配置埠號、啟動、健康等待、瀏覽器驗證到關閉與確認結束的完整生命週期管理，避免殘留程序占用資源。',
    summaryEn: 'Designed full lifecycle management for preview runtimes — from port allocation, startup, and health waiting to browser validation, shutdown, and exit confirmation — to prevent leftover processes from holding resources.',
    problemZh: '每次驗證都需要啟動一個暫時的 Preview 執行環境，若沒有明確的生命週期管理，容易出現埠號衝突、程序沒有正確結束而變成孤兒程序（orphan process）的問題。',
    problemEn: 'Each validation run requires starting a temporary preview runtime; without explicit lifecycle management, this easily leads to port conflicts and orphaned processes that never terminate correctly.',
    contextZh: '流程需要能重複、大量地啟動與關閉 Preview 環境進行驗證，每次都必須確保資源在使用後被正確釋放。',
    contextEn: 'The pipeline needed to repeatedly start and stop preview environments at scale for validation, with resources reliably released after each use.',
    investigationZh: '排查孤兒程序案例後發現，問題多半出在關閉流程只是送出結束訊號、卻沒有等待並確認程序真的已經結束，導致埠號被占用卻查無對應的可見程序。',
    investigationEn: 'Investigating orphaned-process cases showed most originated from shutdown logic that only sent a termination signal without waiting to confirm the process actually exited, leaving ports occupied with no corresponding visible process.',
    solutionZh: '建立 Allocate Port → Start Preview → Wait for Health → Browser Validation → Shutdown → Verify Exit 的流程，關閉步驟後明確等待並確認程序 PID 已結束，才視為一次生命週期完成。',
    solutionEn: 'Built an Allocate Port → Start Preview → Wait for Health → Browser Validation → Shutdown → Verify Exit pipeline, where shutdown explicitly waits for and confirms the process PID has exited before the lifecycle is considered complete.',
    validationZh: '以多輪重複啟動與關閉驗證流程，確認每輪結束後埠號皆被釋放、對應 PID 不再存在，且未觀察到孤兒程序殘留。',
    validationEn: 'Validated across multiple repeated start/stop cycles, confirming ports were released and corresponding PIDs no longer existed after each cycle, with no observed orphaned processes.',
    resultZh: 'Preview 環境的啟動與關閉具備可預期的生命週期保證，降低了埠號衝突與孤兒程序累積導致資源耗盡的風險。',
    resultEn: 'Preview environments now have predictable lifecycle guarantees, reducing the risk of port conflicts and orphaned-process accumulation leading to resource exhaustion.',
    architecture: JSON.stringify([
      { labelZh: '配置埠號', labelEn: 'Allocate Port' },
      { labelZh: '啟動 Preview', labelEn: 'Start Preview' },
      { labelZh: '等待健康狀態', labelEn: 'Wait for Health' },
      { labelZh: '瀏覽器驗證', labelEn: 'Browser Validation' },
      { labelZh: '關閉', labelEn: 'Shutdown' },
      { labelZh: '確認結束', labelEn: 'Verify Exit' },
    ]),
    techStack: JSON.stringify(['PID', 'Port Allocation', 'Timeout', 'Child Process', 'Cleanup', 'Orphan Prevention']),
    githubUrl: null,
    projectUrl: null,
    featured: false,
    sortOrder: 5,
  })

  await upsertEngineeringCase({
    slug: 'remote-ai-agent-infrastructure',
    titleZh: '遠端 AI 代理基礎設施',
    titleEn: 'Remote AI Agent Infrastructure',
    categoryZh: 'AI 系統架構',
    categoryEn: 'AI System Architecture',
    summaryZh: '建置一套讓使用者能透過 LINE 遠端觸發並接收 AI 工程任務通知的基礎設施，串接 Webhook、Cloudflare 與本機 AI 執行環境。',
    summaryEn: 'Built infrastructure allowing users to remotely trigger and receive notifications for AI engineering tasks via LINE, connecting webhooks, Cloudflare, and a local AI runtime.',
    problemZh: '需要讓任務觸發與通知不受限於本機終端機，使用者能在離開電腦的情況下仍掌握任務進度，但這也代表本機執行環境必須安全地暴露一個對外可觸達的入口。',
    problemEn: 'Task triggering and notification needed to work beyond a local terminal so users could track progress while away from their computer, which in turn meant the local runtime had to safely expose an externally reachable entry point.',
    contextZh: '整體串接涉及訊息平台的 Webhook、對外的隧道服務，以及本機常駐的執行環境，過程中歷經多種連線層級的問題排查。',
    contextEn: 'The integration spans a messaging platform webhook, an outbound tunneling service, and a locally resident runtime, and involved troubleshooting issues at several layers of connectivity.',
    investigationZh: '排查過程中遇到的問題涵蓋路由不匹配、HTTP 404 / 401、Webhook 身分驗證失敗、空回應、服務生命週期異常、SSH 連接埠轉發設定、Cloudflare 隧道連線，以及本機執行環境連線問題，逐一定位後才確認每一層各自的正確設定方式。',
    investigationEn: 'Issues encountered along the way covered route mismatches, HTTP 404 / 401 responses, webhook authentication failures, empty responses, service lifecycle anomalies, SSH port-forwarding configuration, Cloudflare tunnel connectivity, and local runtime connectivity — each was isolated and resolved layer by layer.',
    solutionZh: '建立 LINE → Webhook → Cloudflare → TaskFlow Inbox → Service Guardian → 本機 AI 執行環境 → 任務執行 → 通知 的傳遞鏈路，並為每一層加上對應的健康檢查與重試邏輯，確保訊息能可靠地穿越整條鏈路。',
    solutionEn: 'Established a LINE → Webhook → Cloudflare → TaskFlow Inbox → Service Guardian → Local AI Runtime → Task Execution → Notification delivery chain, adding health checks and retry logic at each layer to ensure messages reliably traverse the full path.',
    validationZh: '以端對端訊息觸發測試驗證整條鏈路，確認從傳送訊息到收到任務完成通知之間，各層皆回傳預期的狀態而非前述異常類型。',
    validationEn: 'Validated the full chain via end-to-end message-trigger tests, confirming each layer returned expected status rather than the anomaly types listed above, from message send through to task-completion notification.',
    resultZh: '使用者能透過 LINE 遠端觸發並追蹤 AI 工程任務，整條遠端基礎設施在多種連線異常情境下仍具備可觀察、可排查的特性。',
    resultEn: 'Users can now remotely trigger and track AI engineering tasks via LINE, with the remote infrastructure remaining observable and diagnosable across a range of connectivity anomaly scenarios.',
    architecture: JSON.stringify([
      { labelZh: 'LINE', labelEn: 'LINE' },
      { labelZh: 'Webhook', labelEn: 'Webhook' },
      { labelZh: 'Cloudflare', labelEn: 'Cloudflare' },
      { labelZh: 'TaskFlow 收件匣', labelEn: 'TaskFlow Inbox' },
      { labelZh: 'Service Guardian', labelEn: 'Service Guardian' },
      { labelZh: '本機 AI 執行環境', labelEn: 'Local AI Runtime' },
      { labelZh: '任務執行', labelEn: 'Task Execution' },
      { labelZh: '通知', labelEn: 'Notification' },
    ]),
    techStack: JSON.stringify(['Route Mismatch Debugging', 'HTTP 404 / 401 Troubleshooting', 'Webhook Authentication', 'Service Lifecycle', 'SSH Port Forwarding', 'Cloudflare Tunnel', 'Local Runtime Connectivity']),
    githubUrl: null,
    projectUrl: null,
    featured: false,
    sortOrder: 6,
  })

  await upsertEngineeringCase({
    slug: 'multi-region-ecommerce-integration',
    titleZh: '多國電商整合',
    titleEn: 'Multi-region E-commerce Integration',
    categoryZh: '電商工程',
    categoryEn: 'E-commerce Engineering',
    summaryZh: '維護以 Magento 為核心、涵蓋台灣、美國、加拿大、墨西哥、馬來西亞、菲律賓、土耳其等多個市場的電商站點，將 Magento 由 2.4.2 逐步升級至 2.4.7-p3，並處理各市場在地址規則、結帳流程、金流與物流整合上的差異。',
    summaryEn: 'Maintained a Magento-based e-commerce platform serving markets including Taiwan, the United States, Canada, Mexico, Malaysia, the Philippines, and Turkey, progressively upgraded Magento from 2.4.2 to 2.4.7-p3, and handled differences in address rules, checkout flows, payment, and logistics integrations between markets.',
    problemZh: '同一套 Magento 結帳與訂單邏輯無法直接套用到所有市場：不同國家在地址欄位格式與 autocomplete 規則、可用金流（如 Apple Pay、Google Pay、分期付款）、物流選項（如 UPS Pickup）與結帳成功頁／發票需求（如墨西哥 CFDI）上都存在差異，若以單一邏輯處理容易在特定市場產生錯誤。',
    problemEn: 'A single Magento checkout and order logic could not be applied uniformly across all markets: countries differed in address field formats and autocomplete rules, available payment methods (Apple Pay, Google Pay, installment plans), shipping options (such as UPS Pickup), and checkout success page / invoicing requirements (such as CFDI in Mexico), so a one-size-fits-all approach easily produced errors in specific markets.',
    contextZh: '平台以 Magento 2.4.2 為起點，搭配 MariaDB 與 OpenSearch，需要在持續維運既有商業邏輯的同時逐步升級版本至 2.4.7-p3，並容納各市場各自的地址、金流、物流與報表需求，同時避免程式碼因市場別分支而變得難以維護。',
    contextEn: 'The platform started on Magento 2.4.2 with MariaDB and OpenSearch, and needed ongoing maintenance of existing business logic while progressively upgrading to 2.4.7-p3, accommodating each market\'s address, payment, shipping, and reporting requirements without letting market-specific branching make the codebase unmaintainable.',
    investigationZh: '比對多個市場的結帳流程後發現，差異主要集中在地址欄位 autocomplete 與驗證規則、可用的金流服務（Apple Pay / Google Pay / 訂閱分期）、物流選項（UPS Pickup）、結帳成功頁與稅務憑證格式（如 CFDI），以及需要以非同步 Queue / Job 處理的作業（如 Reward Points 報表產出），而非整體訂單流程本身。',
    investigationEn: 'Comparing checkout flows across markets revealed that differences were concentrated in address autocomplete and validation rules, available payment services (Apple Pay / Google Pay / installment plans), shipping options (UPS Pickup), checkout success page and tax-document formats (such as CFDI), and operations that needed asynchronous queue/job processing (such as generating Reward Points reports) — not in the overall order flow itself.',
    solutionZh: '將市場別差異限縮在地址 autocomplete／驗證規則與可用服務清單的設定層級，核心訂單流程與 Magento checkout lifecycle 維持共用；金流（Apple Pay、Google Pay、分期付款）與物流（UPS Pickup）皆以外部服務整合方式接入既有 Magento lifecycle，Reward Points 等報表類作業改以 Queue / Job 進行非同步處理，並在版本升級過程（2.4.2 → 2.4.7-p3）中同步驗證上述整合與 MariaDB / OpenSearch 相容性。',
    solutionEn: 'Confined market-specific differences to configuration-level address autocomplete/validation rules and available service lists, keeping the core order flow and Magento checkout lifecycle shared; payment methods (Apple Pay, Google Pay, installment plans) and shipping (UPS Pickup) were integrated as external services within the existing Magento lifecycle, reporting operations such as Reward Points were moved to asynchronous queue/job processing, and compatibility with MariaDB/OpenSearch was verified throughout the version upgrade path (2.4.2 to 2.4.7-p3).',
    validationZh: '針對每個市場分別以該國實際地址格式、可用金流組合（含 Apple Pay / Google Pay / 分期）與物流選項（含 UPS Pickup）進行結帳流程測試，並確認結帳成功頁、CFDI 等在地稅務憑證格式與 Reward Points 報表在 Queue / Job 處理下皆能正確產出。',
    validationEn: 'Tested the checkout flow separately for each market using that country\'s actual address formats, available payment combinations (including Apple Pay / Google Pay / installment plans), and shipping options (including UPS Pickup), and confirmed the checkout success page, local tax-document formats such as CFDI, and Reward Points reports processed via queue/job all produced correct output.',
    resultZh: '建立可重複使用的市場差異整合模式，將地址、金流、物流與報表等在地需求限制在設定與整合層級，降低了跨市場功能彼此的耦合，並將支付與外部服務整合方式納入既有 Magento lifecycle 一併維運與升級。',
    resultEn: 'Established a reusable market-difference integration pattern that confines local requirements for address, payment, shipping, and reporting to the configuration and integration layer, reduced coupling between cross-market features, and folded payment and external service integrations into the existing Magento lifecycle for ongoing maintenance and upgrades.',
    architecture: JSON.stringify([
      { labelZh: '地址 Autocomplete', labelEn: 'Address Autocomplete' },
      { labelZh: '結帳流程差異', labelEn: 'Checkout Differences' },
      { labelZh: '金流整合', labelEn: 'Payment Integration' },
      { labelZh: '物流整合', labelEn: 'Shipping Integration' },
      { labelZh: 'Queue / Job 報表', labelEn: 'Queue / Job Reporting' },
    ]),
    techStack: JSON.stringify(['Magento 2.4.2 → 2.4.7-p3', 'MariaDB', 'OpenSearch', 'Address Autocomplete', 'Apple Pay', 'Google Pay', 'UPS Pickup', 'Reward Points Reporting', 'CFDI', 'Queue / Job Processing']),
    githubUrl: null,
    projectUrl: null,
    featured: true,
    sortOrder: 7,
  })

  await upsertEngineeringCase({
    slug: 'payment-integration-order-state',
    titleZh: '金流整合與訂單狀態處理',
    titleEn: 'Payment Integration & Order State Handling',
    categoryZh: '電商工程',
    categoryEn: 'E-commerce Engineering',
    summaryZh: '串接 Apple Pay、Google Pay、Stripe 等多個金流服務的過程中，設計一套能一致處理不同金流回呼時機與訂單狀態轉換的機制。',
    summaryEn: 'While integrating multiple payment services including Apple Pay, Google Pay, and Stripe, designed a mechanism to consistently handle differing callback timings and order-state transitions across gateways.',
    problemZh: '不同金流服務的付款結果通知時機不一致，有些同步回應、有些透過非同步回呼通知，若訂單狀態機沒有妥善處理這種差異，容易出現訂單狀態與實際付款結果不一致的情況。',
    problemEn: 'Different payment services notify payment results at different times — some respond synchronously while others rely on asynchronous callbacks; without a state machine that handles this properly, order state can drift out of sync with actual payment results.',
    contextZh: '結帳流程需要同時支援多種金流服務，且必須在付款請求送出後，無論結果何時抵達，都能將訂單導向正確且一致的狀態。',
    contextEn: 'The checkout flow needed to support multiple payment services simultaneously, and had to route orders to a correct, consistent state regardless of when the payment result actually arrived after the request was sent.',
    investigationZh: '排查訂單狀態異常案例後發現，問題多發生在非同步回呼延遲或失敗時，若訂單狀態機沒有明確的「等待中」與「失敗」狀態，容易被誤判為交易遺失或重複處理。',
    investigationEn: 'Investigating order-state anomalies showed issues mostly arose when asynchronous callbacks were delayed or failed; without explicit "pending" and "failed" states in the order state machine, these cases were easily misread as lost or duplicate transactions.',
    solutionZh: '設計 Checkout → Payment Request → External Gateway → Callback / Async Handling → Order State → Failure Handling 的流程，訂單狀態機明確納入等待中與失敗狀態，並依各金流的回呼特性分別處理同步與非同步結果。',
    solutionEn: 'Designed a Checkout → Payment Request → External Gateway → Callback / Async Handling → Order State → Failure Handling flow, with the order state machine explicitly modeling pending and failed states, handling synchronous and asynchronous results according to each gateway\'s callback behavior.',
    validationZh: '以模擬同步成功、非同步延遲回呼與回呼失敗等情境驗證訂單狀態轉換，確認每種情境下訂單最終都能落在正確且可解釋的狀態。',
    validationEn: 'Validated order-state transitions against simulated synchronous success, delayed asynchronous callbacks, and callback failure scenarios, confirming orders consistently settle into a correct and explainable final state in every case.',
    resultZh: '訂單狀態與實際付款結果的一致性提升，降低了因金流回呼時機差異而產生的狀態誤判與人工排查成本。',
    resultEn: 'Consistency between order state and actual payment results improved, reducing state misjudgments and manual troubleshooting caused by differing payment-callback timing.',
    architecture: JSON.stringify([
      { labelZh: '結帳', labelEn: 'Checkout' },
      { labelZh: '付款請求', labelEn: 'Payment Request' },
      { labelZh: '外部金流', labelEn: 'External Gateway' },
      { labelZh: '回呼 / 非同步處理', labelEn: 'Callback / Async Handling' },
      { labelZh: '訂單狀態', labelEn: 'Order State' },
      { labelZh: '失敗處理', labelEn: 'Failure Handling' },
    ]),
    techStack: JSON.stringify(['Apple Pay', 'Google Pay', 'Stripe', 'Regional Gateways', 'Order State Machine', 'Async Callback Handling']),
    githubUrl: null,
    projectUrl: null,
    featured: false,
    sortOrder: 8,
  })

  await prisma.certification.create({
    data: {
      nameZh: 'ISO 27001:2022 資訊安全管理系統主導稽核員',
      nameEn: 'ISO 27001:2022 Information Security Management System Lead Auditor',
      issuerZh: 'BSI 英國標準協會',
      issuerEn: 'BSI (British Standards Institution)',
      descriptionZh: '取得 CQI & IRCA 認證之 ISO 27001:2022 資訊安全管理系統主導稽核員資格，具備規劃與執行資訊安全稽核之能力。',
      descriptionEn: 'Holds a CQI & IRCA certified ISO 27001:2022 Information Security Management System Lead Auditor qualification, with the ability to plan and conduct information security audits.',
      credential: 'CQI & IRCA Lead Auditor',
      issuedAt: null,
      link: null,
      sortOrder: 0,
    },
  })

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH

  if (adminEmail && adminPasswordHash) {
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash: adminPasswordHash },
      create: { email: adminEmail, passwordHash: adminPasswordHash },
    })
  } else {
    console.warn('seed: 未設定 ADMIN_EMAIL / ADMIN_PASSWORD_HASH，略過管理者帳號建立。')
  }

  console.log('seed: 完成。')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
