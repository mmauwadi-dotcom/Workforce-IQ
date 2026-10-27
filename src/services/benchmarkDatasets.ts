import { Dataset } from '../types';
import { profileDataset } from './dataProcessor';

export interface BenchmarkDatasetInfo {
  id: string;
  title: string;
  category: 'Workforce & HR' | 'Finance & P&L' | 'B2B Sales' | 'Operations & Support';
  description: string;
  defaultObjective: string;
  rowCount: number;
  tags: string[];
  generateData: () => Dataset;
}

// 1. Workforce & Employee Retention Dataset
function createWorkforceDataset(): Dataset {
  const departments = ['Engineering', 'Sales', 'Product', 'Customer Success', 'Marketing', 'Finance', 'Human Resources', 'Operations'];
  const roles = [
    'Software Engineer', 'Senior Engineer', 'Engineering Lead', 'Account Executive', 'Sales Development Rep',
    'Product Manager', 'UX Designer', 'Support Specialist', 'Marketing Manager', 'Financial Analyst', 'HR Business Partner'
  ];
  const genders = ['Female', 'Male', 'Non-Binary'];
  const locations = ['London HQ', 'New York Hub', 'Singapore', 'Berlin', 'San Francisco', 'Remote'];

  const rows: Record<string, any>[] = [];

  const firstNames = [
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Isabella', 'Mason',
    'Mia', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'Aiden', 'Harper', 'James', 'Evelyn', 'Benjamin',
    'Abigail', 'Henry', 'Emily', 'Alexander', 'Elizabeth', 'Daniel', 'Mila', 'Matthew', 'Ella', 'Jackson',
    'Avery', 'Sebastian', 'Sofia', 'David', 'Camila', 'Carter', 'Aria', 'Wyatt', 'Scarlett', 'Jayden',
    'Chloe', 'John', 'Victoria', 'Owen', 'Grace', 'Dylan', 'Zoey', 'Luke', 'Penelope', 'Gabriel',
    'Riley', 'Anthony', 'Layla', 'Isaac', 'Lillian', 'Grayson', 'Nora', 'Jack', 'Zoey', 'Julian',
    'Elena', 'Levi', 'Hannah', 'Christopher', 'Lily', 'Joshua', 'Addison', 'Andrew', 'Eleanor', 'Lincoln'
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
  ];

  for (let i = 1; i <= 75; i++) {
    const dept = departments[i % departments.length];
    const role = roles[(i * 3) % roles.length];
    const location = locations[(i * 2) % locations.length];
    const gender = genders[i % genders.length];
    const tenureYears = Math.round(((i % 8) + 1 + Math.sin(i) * 0.8) * 10) / 10;
    const salary = 48000 + (dept === 'Engineering' ? 35000 : dept === 'Sales' ? 22000 : 15000) + (i % 25) * 1800;
    const rating = [3, 4, 5, 4, 2, 4, 3, 5][i % 8];
    const overtimeHours = (i % 5 === 0 || dept === 'Engineering' || dept === 'Customer Success') ? 12 + (i % 15) : (i % 6);
    const absentDays = (i % 7 === 0) ? 8 + (i % 6) : (i % 4);
    
    // Higher attrition likelihood for high overtime or lower satisfaction
    const satisfaction = Math.max(1, Math.min(5, 5 - Math.floor(overtimeHours / 8) + (rating >= 4 ? 1 : -1)));
    const attrition = (satisfaction <= 2 && overtimeHours > 15) || (i % 9 === 0) ? 'Yes' : 'No';
    const status = attrition === 'Yes' ? 'Resigned' : 'Active';

    rows.push({
      Employee_ID: `EMP-${1000 + i}`,
      Full_Name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      Department: dept,
      Role: role,
      Location: location,
      Gender: gender,
      Tenure_Years: Math.max(0.5, tenureYears),
      Monthly_Salary: Math.round(salary / 12),
      Annual_Salary: salary,
      Performance_Rating: rating,
      Overtime_Hours: overtimeHours,
      Absent_Days: absentDays,
      Job_Satisfaction_Score: satisfaction,
      Employment_Status: status,
      Attrition: attrition,
      Hire_Date: new Date(2021 + (i % 4), (i % 12), (i % 28) + 1).toISOString().slice(0, 10),
    });
  }

  return profileDataset('workforce_attrition_benchmark.csv', rows, 'csv');
}

// 2. Finance & P&L Operations Dataset
function createFinanceDataset(): Dataset {
  const businessUnits = ['Enterprise Cloud', 'Consumer Hardware', 'Consulting & Advisory', 'Digital Services', 'Logistics Platform'];
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const rows: Record<string, any>[] = [];

  let idCounter = 1;
  months.forEach((month, mIdx) => {
    businessUnits.forEach((bu, buIdx) => {
      const baseRev = 280000 + buIdx * 85000 + mIdx * 12000;
      const seasonalBoost = Math.sin((mIdx + buIdx) * 0.7) * 25000;
      const revenue = Math.round(baseRev + seasonalBoost);
      const cogs = Math.round(revenue * (0.38 + buIdx * 0.04));
      const opex = Math.round(revenue * 0.32 + 15000);
      const budget = Math.round(revenue * 0.98 + (buIdx % 2 === 0 ? 12000 : -8000));
      const grossProfit = revenue - cogs;
      const netMarginPct = Math.round(((grossProfit - opex) / revenue) * 1000) / 10;
      const variance = revenue - budget;

      rows.push({
        Record_ID: `FIN-${idCounter++}`,
        Reporting_Month: month,
        Business_Unit: bu,
        Gross_Revenue: revenue,
        Cost_Of_Goods_Sold: cogs,
        Operating_Expenses: opex,
        Gross_Profit: grossProfit,
        Budget_Target: budget,
        Budget_Variance: variance,
        Net_Margin_Percent: netMarginPct,
        Headcount_Cost: Math.round(opex * 0.65),
      });
    });
  });

  return profileDataset('enterprise_pnl_quarterly.xlsx', rows, 'excel', ['P&L Summary', 'Cost Centers'], 'P&L Summary');
}

// 3. B2B Sales Pipeline Dataset
function createSalesDataset(): Dataset {
  const industries = ['Financial Services', 'Healthcare', 'Manufacturing', 'Technology', 'Retail & E-commerce', 'Energy'];
  const stages = ['Discovery', 'Proposal Shared', 'Security Review', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const reps = ['Sarah Jenkins', 'Carlos Mendes', 'Priya Patel', 'David Kim', 'Rachel Adams', 'Marcus Vance'];
  const regions = ['North America', 'EMEA', 'APAC', 'Latin America'];

  const rows: Record<string, any>[] = [];

  for (let i = 1; i <= 65; i++) {
    const stage = stages[i % stages.length];
    const isWon = stage === 'Closed Won';
    const isLost = stage === 'Closed Lost';
    const dealSize = 25000 + (i % 15) * 12000 + ((i * 7) % 30) * 2000;
    const probability = isWon ? 100 : isLost ? 0 : [20, 50, 70, 85][i % 4];
    const daysInPipeline = 18 + (i % 45);

    rows.push({
      Deal_ID: `DEAL-${2000 + i}`,
      Account_Name: `Account ${(i % 30) + 1} Corp`,
      Industry: industries[i % industries.length],
      Sales_Rep: reps[i % reps.length],
      Region: regions[i % regions.length],
      Stage: stage,
      Deal_Value_USD: dealSize,
      Win_Probability_Percent: probability,
      Days_In_Pipeline: daysInPipeline,
      Lead_Source: ['Direct Outreach', 'Inbound Demo', 'Partner Referral', 'Annual Summit'][i % 4],
      Expected_Revenue: Math.round(dealSize * (probability / 100)),
      Close_Date: `2026-0${(i % 9) + 1}-15`,
    });
  }

  return profileDataset('sales_pipeline_velocity.json', rows, 'json');
}

// 4. Customer Support Operations Dataset
function createSupportDataset(): Dataset {
  const categories = ['Billing & Invoices', 'API Integration', 'Authentication & SSO', 'Performance Slowness', 'Feature Request'];
  const channels = ['Email', 'Live Chat', 'Phone', 'Slack Connect'];
  const tiers = ['Enterprise', 'Mid-Market', 'Growth', 'Free'];

  const rows: Record<string, any>[] = [];

  for (let i = 1; i <= 60; i++) {
    const category = categories[i % categories.length];
    const tier = tiers[i % tiers.length];
    const resolutionHours = Math.round((tier === 'Enterprise' ? 2.5 : 8.5) + (i % 12) * 1.5 * 10) / 10;
    const csat = [4, 5, 5, 3, 5, 4, 2, 5][i % 8];
    const firstContact = resolutionHours < 5 ? 'Yes' : 'No';
    const escalated = resolutionHours > 16 || csat <= 2 ? 'Yes' : 'No';

    rows.push({
      Ticket_ID: `TCK-${5000 + i}`,
      Customer_Tier: tier,
      Category: category,
      Channel: channels[i % channels.length],
      Resolution_Time_Hours: resolutionHours,
      CSAT_Score: csat,
      First_Contact_Resolution: firstContact,
      Escalated: escalated,
      Logged_Date: `2026-10-${String((i % 26) + 1).padStart(2, '0')}`,
    });
  }

  return profileDataset('customer_support_sla.csv', rows, 'csv');
}

export const BENCHMARK_DATASETS: BenchmarkDatasetInfo[] = [
  {
    id: 'workforce_retention',
    title: 'Workforce Retention & Attrition Benchmark',
    category: 'Workforce & HR',
    description: 'Detailed workforce dataset containing headcount, department, role, salary, overtime, satisfaction ratings, and employee attrition flags.',
    defaultObjective: 'Analyse employee attrition and identify the departments with the highest turnover, overtime impact, and satisfaction drivers.',
    rowCount: 75,
    tags: ['Workforce', 'Attrition', 'Headcount', 'Salary', 'HR'],
    generateData: createWorkforceDataset,
  },
  {
    id: 'finance_pnl',
    title: 'Corporate Finance & P&L Budget Variance',
    category: 'Finance & P&L',
    description: 'Quarterly financial performance tracking gross revenue, cost of goods sold, operational expenses, gross profit, and budget variance across business units.',
    defaultObjective: 'Compare actual expenditure against budget, identify cost reduction opportunities, and monitor gross margins across business units.',
    rowCount: 45,
    tags: ['Finance', 'P&L', 'Budget', 'Variance', 'Revenue'],
    generateData: createFinanceDataset,
  },
  {
    id: 'sales_pipeline',
    title: 'B2B Sales Velocity & Revenue Pipeline',
    category: 'B2B Sales',
    description: 'Enterprise sales opportunities by rep, industry, sales stage, deal size, win probability, and sales pipeline cycle days.',
    defaultObjective: 'Identify the main drivers of closed deals, assess pipeline health across regions, and evaluate rep conversion performance.',
    rowCount: 65,
    tags: ['Sales', 'Pipeline', 'Win Rate', 'Deals', 'Revenue'],
    generateData: createSalesDataset,
  },
  {
    id: 'support_operations',
    title: 'Customer Support SLAs & Quality Metrics',
    category: 'Operations & Support',
    description: 'Operational support incidents covering resolution times, customer satisfaction (CSAT), first-contact resolution, and escalation rates.',
    defaultObjective: 'Identify operational bottlenecks, assess response time compliance across customer tiers, and pinpoint drivers of escalations.',
    rowCount: 60,
    tags: ['Operations', 'Support', 'SLA', 'CSAT', 'Quality'],
    generateData: createSupportDataset,
  },
];
