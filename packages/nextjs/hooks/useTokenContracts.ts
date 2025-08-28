import { useReadContract } from "wagmi";
import { TOKENS, ERC20_ABI } from "../class/PortfolioTracker";

export const useTokenContracts = (connectedAddress: `0x${string}` | undefined) => {
  // Call all hooks at top level - WETH (index 0)
  const wethBalance = useReadContract({
    address: TOKENS[0].address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: false },
  });
  const wethDecimals = useReadContract({
    address: TOKENS[0].address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: false },
  });
  const wethSymbol = useReadContract({
    address: TOKENS[0].address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: false },
  });

  // USDT (index 1)
  const usdtBalance = useReadContract({
    address: TOKENS[1].address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: false },
  });
  const usdtDecimals = useReadContract({
    address: TOKENS[1].address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: false },
  });
  const usdtSymbol = useReadContract({
    address: TOKENS[1].address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: false },
  });

  // USDC (index 2)
  const usdcBalance = useReadContract({
    address: TOKENS[2].address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: false },
  });
  const usdcDecimals = useReadContract({
    address: TOKENS[2].address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: false },
  });
  const usdcSymbol = useReadContract({
    address: TOKENS[2].address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: false },
  });

  // ARB (index 3)
  const arbBalance = useReadContract({
    address: TOKENS[3].address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: false },
  });
  const arbDecimals = useReadContract({
    address: TOKENS[3].address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: false },
  });
  const arbSymbol = useReadContract({
    address: TOKENS[3].address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: false },
  });

  // Return structured data
  return [
    { balance: wethBalance, decimals: wethDecimals, symbol: wethSymbol, token: TOKENS[0] },
    { balance: usdtBalance, decimals: usdtDecimals, symbol: usdtSymbol, token: TOKENS[1] },
    { balance: usdcBalance, decimals: usdcDecimals, symbol: usdcSymbol, token: TOKENS[2] },
    { balance: arbBalance, decimals: arbDecimals, symbol: arbSymbol, token: TOKENS[3] },
  ];
};
