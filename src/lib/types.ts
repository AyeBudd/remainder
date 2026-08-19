export type HoldingSource = "manual" | "wallet";

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string;
  targetAmount: number;
  currentAmount: number;
  source: HoldingSource;
  walletAddress: string | null;
};

export type HoldingInput = Omit<Holding, "id">;

export type DcaFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type DcaPlan = {
  id: string;
  holdingId: string;
  targetDate: string;
  frequency: DcaFrequency;
  assumedPrice: number | null;
};

export type DcaPlanInput = Omit<DcaPlan, "id">;

export type PriceMap = Record<string, number>;
