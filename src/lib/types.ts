export type HoldingSource = "manual" | "wallet" | "mixed";

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string;
  targetAmount: number;
  currentAmount: number;
  source: HoldingSource;
  walletAddress: string | null;
  walletAmount: number;
  manualAmount: number;
  costBasisUsd: number | null;
};

export type LinkedWallet = {
  address: string;
  label: string | null;
};

export type HoldingInput = Omit<Holding, "id"> & { markPrice?: number };

export type DcaFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export type DcaPlan = {
  id: string;
  holdingId: string;
  targetDate: string;
  frequency: DcaFrequency;
  assumedPrice: number | null;
  baselineAt?: string | null;
  baselineDays?: number | null;
  baselineUsdPerBuy?: number | null;
  baselinePrice?: number | null;
  baselineRemaining?: number | null;
};

export type DcaPlanInput = Omit<DcaPlan, "id">;

export type PriceMap = Record<string, number>;
