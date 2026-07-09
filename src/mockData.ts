import { UserRole, Department, ProjectType, TaskStatus, Priority, UserProfile, Project, Task } from './types';

export const MOCK_USERS: UserProfile[] = [
  {
    id: '001',
    name: 'Amit Thakkar',
    email: 'amit@blufig.digital',
    password: 'password',
    department: Department.MANAGEMENT,
    designation: 'CEO',
    role: UserRole.AGENCY_ADMIN,
    skillTags: ['Strategy', 'Leadership', 'Business Operations']
  },
  {
    id: '072',
    name: 'Ajay Kumar Jha',
    email: 'ajay@blufig.digital',
    password: 'password',
    department: Department.CLIENT_SERVICING,
    designation: 'Team Lead – Account Manager & Design',
    role: UserRole.ACCOUNT_DIRECTOR,
    skillTags: ['Account Management', 'Design Direction', 'Client Strategy']
  },
  {
    id: '130',
    name: 'B T Chaincy Rai',
    email: 'chaincy@blufig.digital',
    password: 'password',
    department: Department.CLIENT_SERVICING,
    designation: 'Key Account Manager',
    role: UserRole.ACCOUNT_MANAGER,
    skillTags: ['Client Coordination', 'Brief Writing', 'Project Planning']
  },
  {
    id: '126',
    name: 'Thimmaiah KP',
    email: 'thimmaiah@blufig.digital',
    department: Department.CLIENT_SERVICING,
    designation: 'Key Account Manager',
    role: UserRole.ACCOUNT_MANAGER,
    skillTags: ['Account Strategy', 'Stakeholder Management']
  },
  {
    id: '092',
    name: 'Shreejaya Chowdhury',
    email: 'shreejaya@blufig.digital',
    department: Department.CLIENT_SERVICING,
    designation: 'Key Account Manager',
    role: UserRole.ACCOUNT_MANAGER,
    skillTags: ['Client Relations', 'Campaign Oversight']
  },
  {
    id: '114',
    name: 'Mousumi Ghosh',
    email: 'mousumi@blufig.digital',
    department: Department.SALES,
    designation: 'Business Development Manager',
    role: UserRole.SALES,
    skillTags: ['B2B Sales', 'Partnerships', 'Lead Generation']
  },
  {
    id: '094',
    name: 'Tejaswi Rudresh',
    email: 'tejaswi@blufig.digital',
    department: Department.SALES,
    designation: 'Pre-Sales Specialist',
    role: UserRole.PRE_SALES,
    skillTags: ['Solution Architecture', 'Proposals', 'Technical Sales']
  },
  {
    id: '080',
    name: 'Naveen Kumar Biradar',
    email: 'naveen@blufig.digital',
    department: Department.SALES,
    designation: 'Sales Development Representative',
    role: UserRole.BD_EXECUTIVE,
    skillTags: ['Outreach', 'Prospecting', 'CRM Management']
  },
  {
    id: '087',
    name: 'Akshay Bhosale',
    email: 'akshay@blufig.digital',
    department: Department.DIGITAL,
    designation: 'Digital Marketing Lead',
    role: UserRole.DIGITAL_LEAD,
    skillTags: ['Google Ads', 'GA4 Analysis', 'LinkedIn Ads', 'Performance Strategy']
  },
  {
    id: '120',
    name: 'Raghav Kumar',
    email: 'raghav@blufig.digital',
    department: Department.DIGITAL,
    designation: 'Performance Marketing Executive',
    role: UserRole.PERFORMANCE_ANALYST,
    skillTags: ['PPC', 'Data Visualization', 'Campaign Tracking']
  },
  {
    id: '119',
    name: 'Rakesh E',
    email: 'rakesh@blufig.digital',
    department: Department.DIGITAL,
    designation: 'SEO Specialist',
    role: UserRole.SEO_SPECIALIST,
    skillTags: ['Technical SEO', 'On-page Optimization', 'Search Console']
  },
  {
    id: '109',
    name: 'Diksha Mehra',
    email: 'diksha@blufig.digital',
    department: Department.DIGITAL,
    designation: 'Link Building Specialist',
    role: UserRole.SEO_SPECIALIST,
    skillTags: ['Backlink Strategy', 'Outreach', 'Domain Authority']
  },
  {
    id: '059',
    name: 'Rashmi Alurkar',
    email: 'rashmi@blufig.digital',
    department: Department.CONTENT,
    designation: 'Team Lead – Content Writer',
    role: UserRole.CONTENT_LEAD,
    skillTags: ['Social Media', 'Blog Writing', 'Email Copy', 'Content Strategy']
  },
  {
    id: '129',
    name: 'Sejal Vijay',
    email: 'sejal@blufig.digital',
    department: Department.CONTENT,
    designation: 'Content Writer',
    role: UserRole.CONTENT_WRITER,
    skillTags: ['Copywriting', 'SEO Content', 'Creative Writing']
  },
  {
    id: '102',
    name: 'Deeksha Das',
    email: 'deeksha@blufig.digital',
    department: Department.CONTENT,
    designation: 'Content Writer',
    role: UserRole.CONTENT_WRITER,
    skillTags: ['Article Writing', 'Proofreading', 'Content Research']
  },
  {
    id: '098',
    name: 'Samiksha Panda',
    email: 'samiksha@blufig.digital',
    department: Department.CONTENT,
    designation: 'Content Writer',
    role: UserRole.CONTENT_WRITER,
    skillTags: ['Scriptwriting', 'Social Captioning', 'Blogging']
  },
  {
    id: '036',
    name: 'Pintu Kumar',
    email: 'pintu@blufig.digital',
    department: Department.WEB_DEVELOPMENT,
    designation: 'Web Development Manager',
    role: UserRole.WEB_DEV_MANAGER,
    skillTags: ['WordPress', 'HTML/CSS', 'QA', 'Server Management']
  },
  {
    id: '044',
    name: 'Anupama Joshi',
    email: 'anupama@blufig.digital',
    department: Department.WEB_DEVELOPMENT,
    designation: 'Sr. Web Developer',
    role: UserRole.WEB_DEVELOPER,
    skillTags: ['React', 'Full-stack', 'API Integration']
  },
  {
    id: '107',
    name: 'Ankit Kumar',
    email: 'ankit@blufig.digital',
    department: Department.WEB_DEVELOPMENT,
    designation: 'Web Developer',
    role: UserRole.WEB_DEVELOPER,
    skillTags: ['Frontend', 'JavaScript', 'Tailwind']
  },
  {
    id: '112',
    name: 'Vignesh B',
    email: 'vignesh@blufig.digital',
    department: Department.WEB_DEVELOPMENT,
    designation: 'Junior Web Developer',
    role: UserRole.WEB_DEVELOPER,
    skillTags: ['Maintenance', 'CMS Updates', 'Basic CSS']
  },
  {
    id: '124',
    name: 'Raghavendra Prasad S',
    email: 'raghavendra@blufig.digital',
    department: Department.HUBSPOT,
    designation: 'HubSpot Consultant',
    role: UserRole.HUBSPOT_SPECIALIST,
    skillTags: ['CRM Implementation', 'Workflows', 'Automation']
  },
  {
    id: '056',
    name: 'Subhadip Dey',
    email: 'subhadip@blufig.digital',
    department: Department.DESIGN,
    designation: 'Sr. Graphic Designer',
    role: UserRole.DESIGNER,
    skillTags: ['Visual Design', 'Illustrations', 'Print Design']
  },
  {
    id: '076',
    name: 'Chitrankita Dey',
    email: 'chitrankita@blufig.digital',
    department: Department.DESIGN,
    designation: 'Design Lead',
    role: UserRole.DESIGN_LEAD,
    skillTags: ['Branding', 'User Experience', 'Social Creatives', 'Art Direction']
  },
  {
    id: '123',
    name: 'Abhijit Saha',
    email: 'abhijit@blufig.digital',
    department: Department.DESIGN,
    designation: 'Motion Graphic Designer',
    role: UserRole.DESIGNER_MOTION,
    skillTags: ['After Effects', '2D Animation', 'Video Editing']
  },
  {
    id: '122',
    name: 'Teena S',
    email: 'teena@blufig.digital',
    department: Department.DESIGN,
    designation: 'Graphic Designer',
    role: UserRole.DESIGNER,
    skillTags: ['Social Media Graphics', 'Layouts']
  },
  {
    id: '118',
    name: 'Sayan Chowdhury',
    email: 'sayan@blufig.digital',
    department: Department.DESIGN,
    designation: 'Graphic Designer',
    role: UserRole.DESIGNER,
    skillTags: ['Vector Art', 'Ad Creatives']
  },
  {
    id: '115',
    name: 'Shalu Kumari',
    email: 'shalu@blufig.digital',
    department: Department.HUMAN_RESOURCES,
    designation: 'HR Specialist',
    role: UserRole.HR_SPECIALIST,
    skillTags: ['Recruitment', 'Employee Engagement', 'Culture']
  },
  {
    id: 'client-1',
    name: 'Sarah Johnson',
    email: 'sarah@acmecorp.com',
    department: Department.MANAGEMENT,
    designation: 'Marketing Director',
    role: UserRole.CLIENT,
    skillTags: ['Strategy', 'Project Management'],
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    id: 'test-user',
    name: 'Test Client',
    email: 'test',
    password: '123456789',
    department: Department.MANAGEMENT,
    designation: 'Testing Head',
    role: UserRole.CLIENT,
    skillTags: ['Testing', 'QA'],
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test'
  },
  {
    id: 'client-2',
    name: 'Robert Globex',
    email: 'robert@globex.com',
    department: Department.MANAGEMENT,
    designation: 'Operation Head',
    role: UserRole.CLIENT,
    skillTags: ['Operations', 'Agile'],
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert'
  },
  {
    id: 'client-3',
    name: 'Elena Vance',
    email: 'elena@blackmesa.org',
    department: Department.MANAGEMENT,
    designation: 'Strategic Partner',
    role: UserRole.CLIENT,
    skillTags: ['Science', 'Communication'],
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena'
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Acme Corp Retainer',
    clientId: 'client-1',
    accountManagerId: '130',
    type: ProjectType.RETAINER,
    status: 'Active',
    startDate: '2024-01-01',
    websiteUrl: 'https://acme.org'
  },
  {
    id: 'p2',
    name: 'Globex Website Build',
    clientId: 'client-2',
    accountManagerId: '072',
    type: ProjectType.ONE_OFF,
    status: 'Active',
    startDate: '2024-03-15',
    websiteUrl: 'https://globex.co'
  },
  {
    id: 'p3',
    name: 'Black Mesa Research',
    clientId: 'client-3',
    accountManagerId: '130',
    type: ProjectType.RETAINER,
    status: 'Active',
    startDate: '2024-02-10',
    websiteUrl: 'https://blackmesa.gov'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    deliverableId: 'd1',
    name: 'Monthly SEO Audit',
    type: 'SEO Audit',
    assigneeId: '087',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    dueDate: '2024-05-20',
    createdAt: '2024-05-01',
    updatedAt: '2024-05-01',
    timeEstimate: 4,
    timeLogged: 2,
    subTasks: [
      { id: 'st1', taskId: 't1', name: 'Technical Site Crawl', isCompleted: true, createdAt: '2024-05-01' },
      { id: 'st2', taskId: 't1', name: 'Backlink Profile Analysis', isCompleted: false, createdAt: '2024-05-02' },
      { id: 'st3', taskId: 't1', name: 'Competitor Keyword Research', isCompleted: false, createdAt: '2024-05-03' }
    ]
  },
  {
    id: 't2',
    projectId: 'p1',
    name: 'Social Media Grid Design',
    type: 'Design',
    assigneeId: '076',
    status: TaskStatus.REVIEW,
    priority: Priority.HIGH,
    dueDate: '2024-05-18',
    createdAt: '2024-05-15',
    updatedAt: '2024-05-15',
    deliverableId: 'd2',
    subTasks: []
  },
  {
    id: 't3',
    projectId: 'p1',
    name: 'Weekly Performance Report',
    type: 'Reporting',
    assigneeId: '087',
    status: TaskStatus.DONE,
    priority: Priority.NORMAL,
    dueDate: '2024-05-14',
    createdAt: '2024-05-10',
    updatedAt: '2024-05-10',
    deliverableId: 'd3',
    subTasks: []
  },
  {
    id: 't4',
    projectId: 'p2',
    name: 'WordPress Migration',
    type: 'Web Dev',
    assigneeId: '036',
    status: TaskStatus.BLOCKED,
    priority: Priority.CRITICAL,
    dueDate: '2024-05-25',
    createdAt: '2024-05-12',
    updatedAt: '2024-05-12',
    deliverableId: 'd4',
    subTasks: []
  },
  {
    id: 't-demo-urgent',
    projectId: 'p1',
    deliverableId: 'd1',
    name: 'Urgent Client Strategy Proposal Review',
    type: 'Strategy',
    assigneeId: '130',
    status: TaskStatus.OPEN,
    priority: Priority.CRITICAL,
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subTasks: []
  }
];
