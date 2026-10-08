export type ChannelCondition = "functional" | "degraded" | "blocked";
export type DemandKind = "household" | "irrigation";

export interface Village { id: string; name: string; tankId: string }
export interface Tank {
  id: string; name: string; catchmentAreaM2: number; runoffCoefficient: number;
  capacityL: number; initialStorageL: number;
}
export interface WaterChannel {
  id: string; sourceTankId: string; targetTankId: string; priority: number;
  condition: ChannelCondition; capacityL: number; efficiency: number;
}
export interface WaterDemand { id: string; villageId: string; kind: DemandKind; amountL: number }
export interface RainfallScenario { id: string; label: string; rainfallMm: number }
export interface RepairAction {
  id: string; channelId: string; costINR: number;
  restoredCapacityL: number; restoredEfficiency: number;
  feasibilityNote?: string;
}
export interface CommunityPolicy { mode: "householdFirst" | "proportional" }
export interface SimulationInput {
  schemaVersion: 1; villages: Village[]; tanks: Tank[];
  channels: WaterChannel[]; demands: WaterDemand[];
  repairs: RepairAction[]; rainfall: RainfallScenario;
  policy: CommunityPolicy;
}
export interface VillageDelivery {
  villageId: string; householdDeliveredL: number; irrigationDeliveredL: number;
  householdUnmetL: number; irrigationUnmetL: number;
}
export interface ChannelFlow { channelId: string; sentL: number; receivedL: number; lossL: number }
export interface TankBalance {
  tankId: string; runoffL: number; incomingL: number; deliveredL: number;
  finalStorageL: number; externalSpillL: number;
}
export interface SimulationResult {
  villageDeliveries: VillageDelivery[]; channelFlows: ChannelFlow[];
  tankBalances: TankBalance[]; rainfallRunoffL: number;
  initialStorageL: number; deliveredL: number; unmetDemandL: number;
  finalStorageL: number; channelLossL: number; externalSpillL: number;
  balanceResidualL: number;
}
export interface OptimizationResult {
  selectedRepairIds: string[]; totalCostINR: number;
  baseline: SimulationResult; recommended: SimulationResult;
  evaluatedSubsetCount: number; explanation: string;
}
export interface AIExtractedReport {
  channelId: string | null; defect: "blocked" | "degraded" | "unknown";
  villageIds: string[]; budgetINR: number | null;
  unknownFields: string[]; evidence: string;
}
