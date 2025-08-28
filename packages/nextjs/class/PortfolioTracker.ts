import { formatEther, formatUnits } from "viem";

// ERC20 ABI for balance and decimals
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Common tokens on Arbitrum
export const TOKENS = [
  {
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    symbol: "WETH",
    name: "Wrapped Ether",
    coingeckoId: "weth",
  },
  {
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    symbol: "USDT",
    name: "Tether USD",
    coingeckoId: "tether",
  },
  {
    address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8" as `0x${string}`,
    symbol: "USDC",
    name: "USD Coin",
    coingeckoId: "usd-coin",
  },
  {
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    symbol: "ARB",
    name: "Arbitrum",
    coingeckoId: "arbitrum",
  },
] as const;

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  usdPrice: number;
  usdValue: number;
}

export interface PriceData {
  [key: string]: {
    usd: number;
  };
}

class PortfolioTrackerClass {
  // Generate batched contracts for useReadContracts
  static generateBatchedContracts(connectedAddress: `0x${string}` | undefined) {
    return TOKENS.flatMap(token => [
      {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [connectedAddress],
      },
      {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "decimals",
      },
      {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "symbol",
      },
    ]);
  }

  // Generate individual contract configs for each token
  static generateIndividualContracts(connectedAddress: `0x${string}` | undefined) {
    return TOKENS.map(token => ({
      balance: {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: connectedAddress ? [connectedAddress] : undefined,
        query: { enabled: false },
      },
      decimals: {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "decimals" as const,
        query: { enabled: false },
      },
      symbol: {
        address: token.address,
        abi: ERC20_ABI,
        functionName: "symbol" as const,
        query: { enabled: false },
      },
    }));
  }

  // Fetch prices from CoinGecko
  static async fetchPrices(): Promise<PriceData> {
    try {
      const coingeckoIds = TOKENS.map(token => token.coingeckoId).join(",");
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds},ethereum&vs_currencies=usd`,
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch prices:", error);
      return {};
    }
  }

  // Process token balances from batched data
  static processTokenBalances(
    batchedData: any[] | undefined,
    prices: PriceData,
    connectedAddress: `0x${string}` | undefined,
  ): TokenBalance[] {
    if (!batchedData || !prices || !connectedAddress) return [];

    const processedBalances: TokenBalance[] = [];

    for (let i = 0; i < TOKENS.length; i++) {
      const token = TOKENS[i];
      const balanceIndex = i * 3;
      const decimalsIndex = i * 3 + 1;
      const symbolIndex = i * 3 + 2;

      const balanceResult = batchedData[balanceIndex];
      const decimalsResult = batchedData[decimalsIndex];
      const symbolResult = batchedData[symbolIndex];

      if (
        balanceResult?.status === "success" &&
        decimalsResult?.status === "success" &&
        symbolResult?.status === "success"
      ) {
        const balance = BigInt(balanceResult.result as string);
        const decimals = decimalsResult.result as number;
        const symbol = symbolResult.result as string;

        const formattedBalance = formatUnits(balance, decimals);
        const usdPrice = prices[token.coingeckoId]?.usd || 0;
        const usdValue = parseFloat(formattedBalance) * usdPrice;

        processedBalances.push({
          address: token.address,
          symbol,
          name: token.name,
          balance: formattedBalance,
          decimals,
          usdPrice,
          usdValue,
        });
      }
    }

    return processedBalances;
  }

  // Calculate total portfolio value
  static calculateTotalPortfolioValue(tokenBalances: TokenBalance[], ethBalanceData: any, prices: PriceData): number {
    const tokensValue = tokenBalances.reduce((sum, token) => sum + token.usdValue, 0);
    const ethValue = ethBalanceData ? parseFloat(formatEther(ethBalanceData.value)) * (prices.ethereum?.usd || 0) : 0;
    return tokensValue + ethValue;
  }

  // Performance comparison - batched read
  static async performBatchedRead(refetchBatched: () => Promise<any>): Promise<number> {
    const startTime = performance.now();
    await refetchBatched();
    const endTime = performance.now();
    return endTime - startTime;
  }

  // Performance comparison - individual reads
  static async performIndividualReads(individualReads: any[]): Promise<number> {
    const startTime = performance.now();
    const dx = await Promise.all(
      individualReads.flatMap(token => [token.balance.refetch(), token.decimals.refetch(), token.symbol.refetch()]),
    );
    console.log(dx, "individual");
    const endTime = performance.now();
    return endTime - startTime;
  }

  // Handle refresh with price and balance updates
  static async handleRefresh(
    fetchPrices: () => Promise<void>,
    performBatchedRead: () => Promise<void>,
    setLastRefresh: (date: Date) => void,
    setIsLoading: (loading: boolean) => void,
  ): Promise<void> {
    setIsLoading(true);
    await Promise.all([fetchPrices(), performBatchedRead()]);
    setLastRefresh(new Date());
    setIsLoading(false);
  }

  // Run performance comparison
  static async runPerformanceComparison(
    performBatchedRead: () => Promise<void>,
    performIndividualReads: () => Promise<void>,
    setIsLoading: (loading: boolean) => void,
  ): Promise<void> {
    setIsLoading(true);
    await performBatchedRead();
    await performIndividualReads();
    setIsLoading(false);
  }
}

export default PortfolioTrackerClass;
