export const uiText = {
  zh: {
    nav: {
      about: '自我介紹',
      skills: '專業能力',
      experience: '工作經歷',
      projects: '專案作品',
      contact: '聯絡方式',
      langSwitch: 'EN',
    },
    hero: {
      eyebrow: '你好，我是',
      ctaContact: '聯絡我',
      ctaProjects: '看看作品',
      scrollHint: '往下捲動了解更多',
    },
    about: {
      title: '自我介紹',
    },
    skills: {
      title: '專業能力',
      subtitle: '從後端系統、電商流程到雲端部署，累積的技術能力一覽。',
    },
    experience: {
      title: '工作經歷',
      subtitle: '在真實商業流程中累積的系統開發與維運經驗。',
      present: '至今',
    },
    projects: {
      title: '專案作品',
      subtitle: '自主規劃與開發的產品專案。',
      techStack: '技術堆疊',
      viewProject: '查看專案',
    },
    contact: {
      title: '聯絡方式',
      subtitle: '歡迎透過以下方式與我聯絡，一起討論系統與產品。',
      emailCta: '寄送 Email',
    },
    footer: {
      builtWith: '以 Vue 3、TypeScript 打造',
    },
    state: {
      loading: '內容載入中…',
      error: '資料載入失敗，請稍後重新整理頁面。',
    },
  },
  en: {
    nav: {
      about: 'About',
      skills: 'Skills',
      experience: 'Experience',
      projects: 'Projects',
      contact: 'Contact',
      langSwitch: '中文',
    },
    hero: {
      eyebrow: "Hi, I'm",
      ctaContact: 'Contact Me',
      ctaProjects: 'View Projects',
      scrollHint: 'Scroll to learn more',
    },
    about: {
      title: 'About Me',
    },
    skills: {
      title: 'Skills',
      subtitle: 'Backend systems, e-commerce workflows, and cloud deployment expertise.',
    },
    experience: {
      title: 'Experience',
      subtitle: 'Systems built and maintained across real-world business workflows.',
      present: 'Present',
    },
    projects: {
      title: 'Projects',
      subtitle: 'Independently planned and developed products.',
      techStack: 'Tech Stack',
      viewProject: 'View Project',
    },
    contact: {
      title: 'Contact',
      subtitle: "Feel free to reach out — let's talk about systems and products.",
      emailCta: 'Send an Email',
    },
    footer: {
      builtWith: 'Built with Vue 3 & TypeScript',
    },
    state: {
      loading: 'Loading…',
      error: 'Failed to load data. Please refresh the page.',
    },
  },
} as const

export type UiDictionary = typeof uiText
