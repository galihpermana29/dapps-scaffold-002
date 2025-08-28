"use client";

import { useEffect, useState, useMemo } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatEther } from "viem";
import PortfolioTrackerClass, { TokenBalance, PriceData } from "../class/PortfolioTracker";
import { useTokenContracts } from "../hooks/useTokenContracts";

export const PortfolioTracker = () => {
  const { address: connectedAddress } = useAccount();
  const { data: ethBalanceData } = useBalance({ address: connectedAddress });

  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [totalValue, setTotalValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [batchedTime, setBatchedTime] = useState<number>(0);
  const [individualTime, setIndividualTime] = useState<number>(0);

  // Batched contract reads using class method
  const batchedContracts = useMemo(
    () => PortfolioTrackerClass.generateBatchedContracts(connectedAddress as `0x${string}` | undefined),
    [connectedAddress],
  );

  const { data: batchedData, refetch: refetchBatched } = useReadContracts({
    contracts: batchedContracts,
    query: {
      enabled: !!connectedAddress,
    },
  });

  // Individual contract reads for performance comparison using optimized hook
  const tokenContractReads = useTokenContracts(connectedAddress as `0x${string}` | undefined);
  const individualReads = tokenContractReads.map(({ balance, decimals, symbol }) => ({
    balance,
    decimals,
    symbol,
  }));

  // Fetch prices using class method
  const fetchPrices = async () => {
    const data = await PortfolioTrackerClass.fetchPrices();
    setPrices(data);
  };

  // Memoized token balance processing using class method
  const processedTokenBalances = useMemo(() => {
    return PortfolioTrackerClass.processTokenBalances(
      batchedData,
      prices,
      connectedAddress as `0x${string}` | undefined,
    );
  }, [batchedData, prices, connectedAddress]);

  // Memoized total portfolio value calculation using class method
  const totalPortfolioValue = useMemo(() => {
    return PortfolioTrackerClass.calculateTotalPortfolioValue(processedTokenBalances, ethBalanceData, prices);
  }, [processedTokenBalances, ethBalanceData, prices]);

  // Update state when processed data changes
  useEffect(() => {
    setTokenBalances(processedTokenBalances);
    setTotalValue(totalPortfolioValue);
  }, [processedTokenBalances, totalPortfolioValue]);

  // Performance comparison functions using class methods
  const performBatchedRead = async () => {
    const time = await PortfolioTrackerClass.performBatchedRead(refetchBatched);
    setBatchedTime(time);
  };

  const performIndividualReads = async () => {
    const time = await PortfolioTrackerClass.performIndividualReads(individualReads);
    setIndividualTime(time);
  };

  const handleRefresh = async () => {
    await PortfolioTrackerClass.handleRefresh(fetchPrices, performBatchedRead, setLastRefresh, setIsLoading);
  };

  const runPerformanceComparison = async () => {
    await PortfolioTrackerClass.runPerformanceComparison(performBatchedRead, performIndividualReads, setIsLoading);
  };

  // Initial load
  useEffect(() => {
    if (connectedAddress) {
      fetchPrices();
    }
  }, [connectedAddress]);

  if (!connectedAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4">Portfolio Tracker</h2>
        <p className="text-lg">Please connect your wallet to view your portfolio</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Overview</h1>
          <p className="text-lg opacity-70">Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleRefresh} disabled={isLoading} className="btn btn-primary">
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={runPerformanceComparison} disabled={isLoading} className="btn btn-secondary">
            Compare Performance
          </button>
        </div>
      </div>

      {/* Total Portfolio Value */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title text-2xl">Total Portfolio Value</h2>
          <p className="text-4xl font-bold text-primary">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Performance Comparison */}
      {(batchedTime > 0 || individualTime > 0) && (
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">Performance Comparison</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="stat">
                <div className="stat-title">Batched Reads</div>
                <div className="stat-value text-success">{batchedTime.toFixed(2)}ms</div>
                <div className="stat-desc">Single multicall</div>
              </div>
              <div className="stat">
                <div className="stat-title">Individual Reads</div>
                <div className="stat-value text-warning">{individualTime.toFixed(2)}ms</div>
                <div className="stat-desc">Multiple separate calls</div>
              </div>
            </div>
            {batchedTime > 0 && individualTime > 0 && (
              <div className="alert alert-info mt-4">
                <span>
                  Batched reads are {(individualTime / batchedTime - 1).toFixed(1)}x faster than individual calls
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ETH Balance */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12">
                  <span>ETH</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">Ethereum</h3>
                <p className="opacity-70">ETH</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {ethBalanceData ? parseFloat(formatEther(ethBalanceData.value)).toFixed(4) : "0.0000"} ETH
              </p>
              <p className="text-lg opacity-70">
                $
                {ethBalanceData
                  ? (parseFloat(formatEther(ethBalanceData.value)) * (prices.ethereum?.usd || 0)).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    )
                  : "0.00"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Balances */}
      <div className="grid gap-6">
        {tokenBalances.map(token => (
          <div key={token.address} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-secondary text-secondary-content rounded-full w-12">
                      <span className="text-xs">{token.symbol}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{token.name}</h3>
                    <p className="opacity-70">{token.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {parseFloat(token.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{" "}
                    {token.symbol}
                  </p>
                  <p className="text-lg opacity-70">
                    $
                    {token.usdValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-sm opacity-50">
                    $
                    {token.usdPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{" "}
                    per {token.symbol}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tokenBalances.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-lg opacity-70">No token balances found or still loading...</p>
        </div>
      )}
    </div>
  );
};
