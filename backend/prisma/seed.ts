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
      nameZh: 'DineFlow',
      nameEn: 'DineFlow',
      summaryZh:
        '我自行規劃並開發餐飲點餐 SaaS 系統 DineFlow。透過這個專案，我累積了從需求規劃、資料庫設計、功能開發到系統部署的完整經驗，也開始從使用者流程與產品角度思考系統設計。',
      summaryEn:
        'I independently planned and developed DineFlow, a SaaS-based restaurant ordering system. Through this project, I gained end-to-end experience in requirement planning, database design, feature development, and system deployment, and strengthened my ability to consider system design from both user experience and product perspectives.',
      highlightsZh: JSON.stringify([
        '店家與菜單管理',
        'QR Code 桌邊點餐',
        '內用與外帶流程',
        '購物車與訂單系統',
        '商家後台',
        'GCP 雲端主機部署',
      ]),
      highlightsEn: JSON.stringify([
        'Store and menu management',
        'QR code table ordering',
        'Dine-in and takeout workflows',
        'Shopping cart and order management',
        'Merchant administration system',
        'GCP Cloud server deployment',
      ]),
      techStack: JSON.stringify(['GCP']),
      link: null,
      githubUrl: null,
      imageUrl: null,
      categoryZh: 'SaaS 產品',
      categoryEn: 'SaaS Product',
      subtitleZh: '餐飲點餐 SaaS 系統',
      subtitleEn: 'Restaurant Ordering SaaS',
      featured: true,
      sortOrder: 0,
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
