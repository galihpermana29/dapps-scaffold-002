export const multicallAbi = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate",
    outputs: [
      { name: "blockNumber", type: "uint256" },
      { name: "returnData", type: "bytes[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Simple multicall contract for batch transfers
export const multiSendAbi = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "multiSendERC20",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    name: "multiSendETH",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// For local testing, we'll use a simple approach with multiple transfer calls
export const MULTICALL_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Local deployment address
