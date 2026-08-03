import { Priority } from '../types';

export interface TemplateTask {
  id: string;
  name: string;
  type: string;
  timeEstimate: number;
  priority: Priority;
  subTasks?: string[];
}

export interface TeamTemplate {
  id: string;
  name: string;
  tasks: TemplateTask[];
}

const DEFAULT_TEMPLATES: TeamTemplate[] = [
  {
    id: 'web_dev',
    name: '💻 Web Dev Template',
    tasks: [
      {
        id: 't_wd_1',
        name: 'Regular maintenance tasks',
        type: 'Web Development',
        timeEstimate: 5.0,
        priority: Priority.NORMAL,
        subTasks: []
      },
      {
        id: 't_wd_2',
        name: 'New development',
        type: 'Web Development',
        timeEstimate: 10.0,
        priority: Priority.HIGH,
        subTasks: []
      },
      {
        id: 't_wd_3',
        name: 'Ad-hoc tasks',
        type: 'Web Development',
        timeEstimate: 2.67,
        priority: Priority.LOW,
        subTasks: [
          'Task request receipt & validation',
          'Implementation & smoke testing'
        ]
      }
    ]
  },
  {
    id: 'design',
    name: '🎨 Design Team Template',
    tasks: [
      {
        id: 't_ds_1',
        name: 'UI/UX Layout Design',
        type: 'Design',
        timeEstimate: 8.0,
        priority: Priority.HIGH,
        subTasks: []
      },
      {
        id: 't_ds_2',
        name: 'Graphics & Asset Creation',
        type: 'Design',
        timeEstimate: 4.0,
        priority: Priority.NORMAL,
        subTasks: []
      },
      {
        id: 't_ds_3',
        name: 'Review & Feedback Loop',
        type: 'Design',
        timeEstimate: 2.0,
        priority: Priority.LOW,
        subTasks: []
      }
    ]
  },
  {
    id: 'content',
    name: '✍️ Content Team Template',
    tasks: [
      {
        id: 't_co_1',
        name: 'Content Writing & Drafting',
        type: 'Content',
        timeEstimate: 6.0,
        priority: Priority.NORMAL,
        subTasks: []
      },
      {
        id: 't_co_2',
        name: 'Editing & Proofreading',
        type: 'Content',
        timeEstimate: 3.0,
        priority: Priority.NORMAL,
        subTasks: []
      },
      {
        id: 't_co_3',
        name: 'SEO Content Optimization',
        type: 'Content',
        timeEstimate: 2.0,
        priority: Priority.LOW,
        subTasks: []
      }
    ]
  },
  {
    id: 'seo',
    name: '🔍 SEO Team Template',
    tasks: [
      {
        id: 't_se_1',
        name: 'On-Page SEO Audit',
        type: 'Strategy',
        timeEstimate: 4.0,
        priority: Priority.HIGH,
        subTasks: []
      },
      {
        id: 't_se_2',
        name: 'Keyword Research & Strategy',
        type: 'Strategy',
        timeEstimate: 6.0,
        priority: Priority.HIGH,
        subTasks: []
      },
      {
        id: 't_se_3',
        name: 'Backlink & Competitor Analysis',
        type: 'Strategy',
        timeEstimate: 5.0,
        priority: Priority.NORMAL,
        subTasks: []
      }
    ]
  },
  {
    id: 'ads_campaigns',
    name: '📣 Ads Campaigns Template',
    tasks: [
      {
        id: 't_ac_1',
        name: 'Monthly Report - May 2026',
        type: 'Strategy',
        timeEstimate: 4.0,
        priority: Priority.HIGH,
        subTasks: []
      },
      {
        id: 't_ac_2',
        name: 'New Campaigns- Ideation & Setup',
        type: 'Strategy',
        timeEstimate: 12.0,
        priority: Priority.HIGH,
        subTasks: [
          'Client briefing & objective alignment',
          'Competitor ad research & intelligence',
          'Target audience definition & persona building',
          'Keyword research & negative list preparation',
          'Ad copy drafting (Headings & Descriptions)',
          'Creative asset design request (banners/video)',
          'Campaign budget & bidding strategy setup',
          'UTM tracking & conversion pixel verification',
          'Ad group staging & targeting configuration',
          'Draft campaign review & sign-off',
          'Campaign launch & initial bid adjustment'
        ]
      },
      {
        id: 't_ac_3',
        name: 'Monthly activities',
        type: 'Strategy',
        timeEstimate: 8.0,
        priority: Priority.NORMAL,
        subTasks: [
          'Daily budget & spend pacing monitor',
          'Negative keyword addition',
          'Bid adjustment & optimization',
          'Search terms report analysis',
          'Ad copy A/B performance review',
          'Quality score diagnostic review',
          'Audience segment performance audit',
          'Landing page speed & bounce check',
          'Budget relocation between ad groups',
          'Mid-month client pacing update'
        ]
      },
      {
        id: 't_ac_4',
        name: 'Foundational Activities',
        type: 'Strategy',
        timeEstimate: 15.0,
        priority: Priority.HIGH,
        subTasks: [
          'Google Tag Manager container setup',
          'GA4 property configuration & link',
          'Google Ads account linking to GA4',
          'Conversion action setup (Purchases/Leads)',
          'Enhanced conversions activation',
          'Google Merchant Center link (if shopping)',
          'Remarketing tag installation on site',
          'Custom segment creations (All Visitors, Cart Abandoners)',
          'Ad strength standard checklist setup',
          'Billing profile verification & setup',
          'Negative placement list for display/PMax',
          'Brand safety settings & content exclusion',
          'Sitelink extensions creation (min 4)',
          'Callout extensions setup (min 4)',
          'Structured snippet setup',
          'Promo or price extension setup if applicable',
          'Automated rules configuration',
          'Merchant Center feed diagnostics',
          'Final health check & account validation'
        ]
      }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'blufig_team_templates';

export function getTemplates(): TeamTemplate[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error parsing templates from localStorage:', e);
  }
  
  // Initialize and return defaults
  saveTemplates(DEFAULT_TEMPLATES);
  return DEFAULT_TEMPLATES;
}

export function saveTemplates(templates: TeamTemplate[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving templates to localStorage:', e);
  }
}

export function resetTemplates(): TeamTemplate[] {
  saveTemplates(DEFAULT_TEMPLATES);
  return DEFAULT_TEMPLATES;
}
