import { load, type AzureAppConfiguration } from '@azure/app-configuration-provider';
import { DefaultAzureCredential } from '@azure/identity';
import { UserDataFunctions } from '@microsoft/fabric-user-data-functions';
import {
  ConfigurationMapFeatureFlagProvider,
  FeatureManager,
} from '@microsoft/feature-management';

const udf = new UserDataFunctions();
const approvalExperimentName = 'ApprovalEngineExperiment';

export type ApprovalVariant = 'standard' | 'assisted';
export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected';
export type PolicyStatus = 'Within policy' | 'Review required';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type ApprovalRecommendation = 'Approve' | 'Review';

export interface ApprovalExpense {
  id: string;
  employee: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  category: string;
  description: string;
  amount: number;
  submitted: string;
  expenseDate: string;
  merchant: string;
  status: ExpenseStatus;
  hasReceipt: boolean;
}

export interface StandardApprovalExpense extends ApprovalExpense {
  variant: ApprovalVariant;
}

export interface AssistedApprovalExpense extends StandardApprovalExpense {
  policyStatus: PolicyStatus;
  riskLevel: RiskLevel;
  recommendation: ApprovalRecommendation;
  reasons: string[];
}

export type ApprovalExperience = StandardApprovalExpense | AssistedApprovalExpense;
export type ApprovalVariantResolver = (experimentSubjectId: string) => Promise<ApprovalVariant>;

interface FeatureManagement {
  appConfig: AzureAppConfiguration;
  featureManager: FeatureManager;
}

let featureManagementPromise: Promise<FeatureManagement> | undefined;

async function getFeatureManagement(): Promise<FeatureManagement> {
  if (!featureManagementPromise) {
    featureManagementPromise = createFeatureManagement().catch((error: unknown) => {
      featureManagementPromise = undefined;
      throw error;
    });
  }

  return featureManagementPromise;
}

async function createFeatureManagement(): Promise<FeatureManagement> {
  const endpoint = process.env.AZURE_APPCONFIG_ENDPOINT;
  if (!endpoint) {
    throw new Error('AZURE_APPCONFIG_ENDPOINT is required to evaluate approval variants.');
  }

  const configuration = await load(endpoint, new DefaultAzureCredential(), {
    featureFlagOptions: {
      enabled: true,
      refresh: {
        enabled: true,
        refreshIntervalInMs: 5000,
      },
    },
  });

  return {
    appConfig: configuration,
    featureManager: new FeatureManager(new ConfigurationMapFeatureFlagProvider(configuration)),
  };
}

export async function getApprovalVariant(experimentSubjectId: string): Promise<ApprovalVariant> {
  const { appConfig, featureManager } = await getFeatureManagement();
  await appConfig.refresh();
  const assignment = await featureManager.getVariant(approvalExperimentName, {
    userId: experimentSubjectId,
  });

  if (assignment?.name !== 'standard' && assignment?.name !== 'assisted') {
    throw new Error(
      `Feature flag ${approvalExperimentName} returned unsupported variant: ${assignment?.name ?? 'undefined'}`,
    );
  }

  console.log(`AppConfig evaluation | ${experimentSubjectId} | ${assignment.name}`);
  return assignment.name;
}

export function standardApproval(
  expense: ApprovalExpense,
  variant: ApprovalVariant,
): StandardApprovalExpense {
  return { ...expense, variant };
}

export function assistedApproval(
  expense: ApprovalExpense,
  variant: ApprovalVariant,
): AssistedApprovalExpense {
  const reasons: string[] = [];

  if (!expense.hasReceipt) {
    reasons.push('A receipt is required before this expense can be approved.');
  }

  if (expense.amount > 5000) {
    reasons.push('The amount exceeds the $5,000 high-risk review threshold.');
    return {
      ...expense,
      variant,
      policyStatus: 'Review required',
      riskLevel: 'High',
      recommendation: 'Review',
      reasons,
    };
  }

  if (expense.amount > 2000) {
    reasons.push('The amount exceeds the $2,000 manager review threshold.');
    return {
      ...expense,
      variant,
      policyStatus: 'Review required',
      riskLevel: 'Medium',
      recommendation: 'Review',
      reasons,
    };
  }

  if (!expense.hasReceipt) {
    return {
      ...expense,
      variant,
      policyStatus: 'Review required',
      riskLevel: 'Low',
      recommendation: 'Review',
      reasons,
    };
  }

  return {
    ...expense,
    variant,
    policyStatus: 'Within policy',
    riskLevel: 'Low',
    recommendation: 'Approve',
    reasons: ['The expense is within the standard approval threshold and includes a receipt.'],
  };
}

export async function createApprovalExperience(
  expense: ApprovalExpense,
  experimentSubjectId: string,
  resolveVariant: ApprovalVariantResolver = getApprovalVariant,
): Promise<ApprovalExperience> {
  const variant = await resolveVariant(experimentSubjectId);

  return variant === 'standard'
    ? standardApproval(expense, variant)
    : assistedApproval(expense, variant);
}

udf.func(
  'getApprovalExperience',
  async (
    expense: ApprovalExpense,
    experimentSubjectId: string,
  ): Promise<ApprovalExperience> => createApprovalExperience(expense, experimentSubjectId),
  [],
);
