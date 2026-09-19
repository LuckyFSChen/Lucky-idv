import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.profile.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.skillCategory.deleteMany()
  await prisma.experience.deleteMany()
  await prisma.project.deleteMany()
  await prisma.engineeringCase.deleteMany()
  await prisma.certification.deleteMany()

  await prisma.profile.create({
    data: {
      displayName: 'Lucky',
      preferredName: 'Lucky',
      titleZh: 'PHP / Laravel 後端工程師',
      titleEn: 'Backend Engineer specializing in PHP / Laravel',
      introZh:
        '我是 Lucky，一名以 PHP / Laravel 為核心的後端軟體工程師，具備電商平台、多國站點、API、資料庫與系統整合開發經驗。\n\n' +
        '過去曾參與 Magento 電商系統開發與維護，處理付款、物流、會員、訂單、第三方 API、多國站點與效能優化等功能。目前持續投入 Laravel、系統架構、AI 輔助開發及獨立產品開發。\n\n' +
        '除了軟體工程，我也對遊戲開發與產品設計有興趣，曾使用 Unreal Engine、Godot 等工具進行遊戲專案規劃與開發。\n\n' +
        '我偏好從實際需求出發，重視系統可維護性、資料結構、效能、開發效率，以及將複雜問題拆解成可執行方案。',
      introEn:
        "I'm Lucky, a backend software engineer centered on PHP / Laravel, with experience across e-commerce platforms, multi-region storefronts, APIs, databases, and system integration.\n\n" +
        'I have worked on the development and maintenance of Magento e-commerce systems, handling payments, logistics, membership, orders, third-party APIs, multi-region storefronts, and performance optimization. I continue to invest in Laravel, system architecture, AI-assisted development, and independent product development.\n\n' +
        "Beyond software engineering, I'm also interested in game development and product design, and have used tools such as Unreal Engine and Godot for game project planning and development.\n\n" +
        'I prefer to start from real-world requirements, valuing system maintainability, data structure, performance, development efficiency, and breaking complex problems down into actionable solutions.',
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
      nameEn: 'Backend Development',
      skills: [
        { nameZh: 'PHP', nameEn: 'PHP' },
        { nameZh: 'Laravel', nameEn: 'Laravel' },
        { nameZh: 'Magento', nameEn: 'Magento' },
      ],
    },
    {
      nameZh: 'API',
      nameEn: 'API',
      skills: [
        { nameZh: 'RESTful API', nameEn: 'RESTful API' },
        { nameZh: '第三方 API 整合', nameEn: 'Third-Party API Integration' },
        { nameZh: 'JWT', nameEn: 'JWT' },
        { nameZh: 'OAuth2', nameEn: 'OAuth2' },
      ],
    },
    {
      nameZh: '資料庫',
      nameEn: 'Databases',
      skills: [
        { nameZh: 'MySQL', nameEn: 'MySQL' },
        { nameZh: 'MariaDB', nameEn: 'MariaDB' },
        { nameZh: 'PostgreSQL', nameEn: 'PostgreSQL' },
        { nameZh: 'SQL Query Optimization', nameEn: 'SQL Query Optimization' },
      ],
    },
    {
      nameZh: '快取與非同步處理',
      nameEn: 'Caching & Async Processing',
      skills: [
        { nameZh: 'Redis', nameEn: 'Redis' },
        { nameZh: 'Queue', nameEn: 'Queue' },
        { nameZh: 'Job', nameEn: 'Job' },
        { nameZh: 'Message Queue 基礎架構', nameEn: 'Message Queue Fundamentals' },
      ],
    },
    {
      nameZh: 'DevOps / 開發環境',
      nameEn: 'DevOps / Dev Environment',
      skills: [
        { nameZh: 'Docker', nameEn: 'Docker' },
        { nameZh: 'WSL2', nameEn: 'WSL2' },
        { nameZh: 'Nginx', nameEn: 'Nginx' },
        { nameZh: 'Git', nameEn: 'Git' },
        { nameZh: 'CI/CD', nameEn: 'CI/CD' },
      ],
    },
    {
      nameZh: '搜尋服務',
      nameEn: 'Search Services',
      skills: [{ nameZh: 'OpenSearch', nameEn: 'OpenSearch' }],
    },
    {
      nameZh: '支付整合',
      nameEn: 'Payment Integration',
      skills: [
        { nameZh: 'Stripe', nameEn: 'Stripe' },
        { nameZh: 'Apple Pay', nameEn: 'Apple Pay' },
        { nameZh: 'Google Pay', nameEn: 'Google Pay' },
        {
          nameZh: '第三方支付服務串接經驗',
          nameEn: 'Third-Party Payment Gateway Integration',
        },
      ],
    },
    {
      nameZh: '電商系統',
      nameEn: 'E-commerce Systems',
      skills: [
        {
          nameZh: '訂單、付款、物流、會員、商品與多國站點系統',
          nameEn: 'Orders, Payments, Logistics, Membership, Products & Multi-Region Storefronts',
        },
      ],
    },
    {
      nameZh: '系統設計',
      nameEn: 'System Design',
      skills: [
        { nameZh: '資料庫 Schema', nameEn: 'Database Schema' },
        { nameZh: 'API Design', nameEn: 'API Design' },
        { nameZh: 'Service Layer', nameEn: 'Service Layer' },
        { nameZh: 'Dependency Injection', nameEn: 'Dependency Injection' },
        { nameZh: '模組化架構', nameEn: 'Modular Architecture' },
      ],
    },
    {
      nameZh: '雲端與部署',
      nameEn: 'Cloud & Deployment',
      skills: [
        { nameZh: 'GCP', nameEn: 'GCP' },
        { nameZh: 'Linux Server', nameEn: 'Linux Server' },
        { nameZh: 'DNS', nameEn: 'DNS' },
        { nameZh: 'Web Service 部署', nameEn: 'Web Service Deployment' },
      ],
    },
    {
      nameZh: 'AI 輔助開發',
      nameEn: 'AI-Assisted Development',
      skills: [
        {
          nameZh: '使用 AI 協助程式開發、除錯、需求分析與系統規劃',
          nameEn: 'Using AI to Assist Development, Debugging, Requirement Analysis & System Planning',
        },
      ],
    },
    {
      nameZh: '遊戲開發',
      nameEn: 'Game Development',
      skills: [
        { nameZh: 'Godot', nameEn: 'Godot' },
        { nameZh: 'Unreal Engine', nameEn: 'Unreal Engine' },
        { nameZh: 'C++ / Blueprint 基礎', nameEn: 'C++ / Blueprint Basics' },
      ],
    },
    {
      nameZh: '產品開發',
      nameEn: 'Product Development',
      skills: [
        { nameZh: 'SaaS 規劃', nameEn: 'SaaS Planning' },
        { nameZh: 'MVP', nameEn: 'MVP' },
        { nameZh: '需求拆解', nameEn: 'Requirement Breakdown' },
        { nameZh: '產品功能設計', nameEn: 'Feature Design' },
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
        '我是一名以 PHP 為主要開發語言的後端工程師，具備電商系統、第三方服務串接及正式環境維護經驗。過去曾參與 ASUS Store 多國電商平台的開發與維護，服務站點包含台灣、美國、加拿大、墨西哥、馬來西亞、菲律賓、土耳其。',
      summaryEn:
        "I am a backend engineer specializing in PHP, with practical experience in e-commerce systems, third-party service integration, and production environment maintenance. I previously participated in the development and maintenance of ASUS Store's multinational e-commerce platforms, supporting markets including Taiwan, the United States, Canada, Mexico, Malaysia, the Philippines, and Turkey.",
      highlightsZh: JSON.stringify([
        'Magento 功能開發與既有系統維護',
        '訂單、付款及分期流程開發',
        'Apple Pay、藍新、Gogopay 等第三方金流串接',
        '物流、地址及地區性結帳流程調整',
        'SQL 查詢與資料報表開發',
        '正式環境異常追蹤與問題排除',
        '具有 ISO 27001:2022 資訊安全管理系統 CQI & IRCA 主導稽核員資格（BSI 發照）',
      ]),
      highlightsEn: JSON.stringify([
        'Developing new Magento features and maintaining existing systems',
        'Implementing order, payment, and installment workflows',
        'Integrating Apple Pay, NewebPay, GogoPay and third-party payment gateways',
        'Adjusting logistics, address, and region-specific checkout processes',
        'Developing SQL queries and data reports',
        'Investigating and resolving production issues',
        'Holds ISO 27001:2022 Information Security Management System Lead Auditor certification (CQI & IRCA, issued by BSI)',
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

  await prisma.engineeringCase.create({
    data: {
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
    },
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
