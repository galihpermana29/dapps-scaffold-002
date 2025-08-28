"use client";

import { useState } from "react";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSendTransaction,
  useGasPrice,
} from "wagmi";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import MultiSendClass, { Token, Recipient, GasEstimate, ActualGasUsed } from "../class/MultiSend";

// Tokens including native ETH for local testing
const TOKENS: Token[] = [
  {
    address: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    isNative: true,
  },
  {
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1" as `0x${string}`,
    symbol: "WETH",
    name: "Wrapped Ethereum",
    decimals: 18,
    isNative: false,
  },
  {
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" as `0x${string}`,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    isNative: false,
  },
  {
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    isNative: false,
  },
  {
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548" as `0x${string}`,
    symbol: "ARB",
    name: "Arbitrum",
    decimals: 18,
    isNative: false,
  },
];

// Types are now imported from the class file

export const MultiSend = () => {
  const { address: connectedAddress } = useAccount();
  const [selectedToken, setSelectedToken] = useState<Token>(TOKENS[0]);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", address: "", amount: "", status: "initial" },
    { id: "2", address: "", amount: "", status: "initial" },
  ]);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendMode, setSendMode] = useState<"individual" | "batch">("batch");
  const [actualGasUsed, setActualGasUsed] = useState<ActualGasUsed | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, { address?: string; amount?: string }>>({});

  const { data: tokenBalance } = useBalance({
    address: connectedAddress,
    token: selectedToken.isNative ? undefined : selectedToken.address,
  });

  const { address } = useAccount();
  const { data: gasPrice } = useGasPrice();
  const publicClient = usePublicClient();

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { sendTransactionAsync, data: ethTxHash, isPending: isEthPending } = useSendTransaction();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError,
  } = useWaitForTransactionReceipt({
    hash: txHash || ethTxHash,
  });
  console.log(txHash, "tx hash?", ethTxHash);
  // Recipient management using class methods
  const addRecipient = () => {
    setRecipients(MultiSendClass.addRecipient(recipients));
  };

  const removeRecipient = (id: string) => {
    setRecipients(MultiSendClass.removeRecipient(recipients, id));
  };

  const updateRecipient = (id: string, field: "address" | "amount", value: string) => {
    setRecipients(MultiSendClass.updateRecipient(recipients, id, field, value));

    // Validate input and update errors
    const errors = { ...validationErrors };
    if (!errors[id]) errors[id] = {};

    if (field === "address") {
      const validation = MultiSendClass.validateAddress(value, address);
      if (validation.isValid) {
        delete errors[id].address;
      } else {
        errors[id].address = validation.error;
      }
    } else if (field === "amount") {
      const balanceString = tokenBalance ? formatUnits(tokenBalance.value, tokenBalance.decimals) : undefined;
      const validation = MultiSendClass.validateAmount(value, balanceString, selectedToken.decimals);
      if (validation.isValid) {
        delete errors[id].amount;
      } else {
        errors[id].amount = validation.error;
      }
    }

    // Clean up empty error objects
    if (Object.keys(errors[id]).length === 0) {
      delete errors[id];
    }

    setValidationErrors(errors);
  };

  const resetState = () => {
    setRecipients(MultiSendClass.resetToInitialState());
    setValidationErrors({});
    setGasEstimate(null);
    setActualGasUsed(null);
  };

  // Use class methods for validation and calculation
  const validRecipients = MultiSendClass.validateRecipients(recipients);
  const totalAmount = MultiSendClass.calculateTotalAmount(validRecipients);

  // Gas estimation using class method
  const estimateGas = async () => {
    if (!address || !gasPrice || !publicClient) return;

    setIsEstimating(true);
    try {
      const estimate = await MultiSendClass.estimateGas(
        validRecipients,
        selectedToken,
        address as `0x${string}`,
        gasPrice,
        publicClient,
      );
      setGasEstimate(estimate);
    } catch (error) {
      console.error("Gas estimation failed:", error);
    } finally {
      setIsEstimating(false);
    }
  };

  // Send tokens individually using class method
  const sendIndividually = async () => {
    setIsSending(true);
    try {
      await MultiSendClass.sendIndividually(
        validRecipients,
        selectedToken,
        sendTransactionAsync,
        writeContract,
        txHash,
        setRecipients,
      );

      // Note: Manual reset via button instead of automatic timeout
    } catch (error) {
      console.error("Individual send failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Send tokens in batch using class method
  const sendBatch = async () => {
    setIsSending(true);
    try {
      await MultiSendClass.sendBatch(
        validRecipients,
        selectedToken,
        sendTransactionAsync,
        writeContract,
        txHash,
        publicClient!,
        gasEstimate,
        setRecipients,
        setActualGasUsed,
      );

      // Note: Manual reset via button instead of automatic timeout
    } catch (error) {
      console.error("Batch send failed:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold">Multi-Send Tool</h1>
        <div className="badge badge-primary">Send to Multiple Recipients</div>
      </div>

      {!connectedAddress && (
        <div className="alert alert-warning mb-6">
          <span>Please connect your wallet to use the Multi-Send tool.</span>
        </div>
      )}

      {/* Token Selection */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Select Token</h2>
          <div className="flex gap-4 flex-wrap">
            {TOKENS.map(token => (
              <button
                key={token.address}
                className={`btn ${selectedToken.address === token.address ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSelectedToken(token)}
              >
                {token.symbol}
              </button>
            ))}
          </div>

          {tokenBalance && (
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <p className="text-sm opacity-70">Available Balance:</p>
              <p className="text-xl font-bold">
                {parseFloat(formatUnits(tokenBalance.value, selectedToken.decimals)).toFixed(4)} {selectedToken.symbol}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recipients */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title">Recipients ({validRecipients.length} valid)</h2>
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm" onClick={addRecipient}>
                Add Recipient
              </button>
              <button className="btn btn-secondary btn-sm" onClick={resetState}>
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {recipients.map((recipient, index) => (
              <div key={recipient.id} className="p-4 bg-base-200 rounded-lg">
                <div className="flex gap-4 items-center">
                  <span className="w-8 text-center font-bold">{index + 1}</span>

                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="0x..."
                      className={`input input-bordered w-full ${
                        validationErrors[recipient.id]?.address ? "input-error" : ""
                      }`}
                      value={recipient.address}
                      onChange={e => updateRecipient(recipient.id, "address", e.target.value)}
                    />
                    {validationErrors[recipient.id]?.address && (
                      <div className="text-error text-sm mt-1">{validationErrors[recipient.id].address}</div>
                    )}
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="Amount"
                      className={`input input-bordered w-full ${
                        validationErrors[recipient.id]?.amount ? "input-error" : ""
                      }`}
                      value={recipient.amount}
                      onChange={e => updateRecipient(recipient.id, "amount", e.target.value)}
                    />
                    {validationErrors[recipient.id]?.amount && (
                      <div className="text-error text-sm mt-1">{validationErrors[recipient.id].amount}</div>
                    )}
                  </div>

                  <div className="w-20">
                    {recipient.status === "pending" && <div className="badge">Pending</div>}
                    {recipient.status === "sending" && <div className="badge badge-warning">Sending</div>}
                    {recipient.status === "success" && (
                      <div className="badge badge-success" title={recipient.txHash || "Success"}>
                        Success
                        {recipient.txHash && <span className="ml-1 text-xs">{recipient.txHash.slice(0, 6)}...</span>}
                      </div>
                    )}
                    {recipient.status === "failed" && <div className="badge badge-error">Failed</div>}
                    {recipient.status === "initial" && <div className="badge badge-info">Initial</div>}
                  </div>

                  {recipients.length > 1 && (
                    <button className="btn btn-error btn-sm" onClick={() => removeRecipient(recipient.id)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalAmount > 0 && (
            <div className="mt-4 p-4 bg-primary/10 rounded-lg">
              <p className="text-lg font-bold">
                Total: {totalAmount.toFixed(4)} {selectedToken.symbol}
              </p>
              {tokenBalance && totalAmount > parseFloat(formatUnits(tokenBalance.value, selectedToken.decimals)) && (
                <p className="text-error mt-2">⚠️ Insufficient balance</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gas Estimation */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Gas Estimation</h2>

          <div className="flex gap-4 mb-4 items-center justify-between">
            <button
              className="btn btn-outline"
              onClick={estimateGas}
              disabled={validRecipients.length === 0 || isEstimating}
            >
              {isEstimating ? "Estimating..." : "Estimate Gas"}
            </button>
          </div>

          {gasEstimate && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Individual Gas</div>
                <div className="stat-value text-lg">{gasEstimate.individual.toString()}</div>
                <div className="stat-desc">gas units</div>
              </div>

              <div className="stat bg-warning/20 rounded-lg">
                <div className="stat-title">Individual Fee</div>
                <div className="stat-value text-lg">{parseFloat(gasEstimate.individualFee).toFixed(6)} ETH</div>
                <div className="stat-desc">estimated cost</div>
              </div>

              <div className="stat bg-info/20 rounded-lg">
                <div className="stat-title">Batch Fee</div>
                <div className="stat-value text-lg">{parseFloat(gasEstimate.batchFee).toFixed(6)} ETH</div>
                <div className="stat-desc">estimated cost</div>
              </div>

              <div className="stat bg-primary/20 rounded-lg">
                <div className="stat-title">Savings</div>
                <div className="stat-value text-lg text-primary">{gasEstimate.savings.toFixed(1)}%</div>
                <div className="stat-desc">with batch</div>
              </div>

              {actualGasUsed && (
                <div className="stat bg-success/20 rounded-lg">
                  <div className="stat-title">Accuracy</div>
                  <div
                    className={`stat-value text-lg ${actualGasUsed.accuracy > 95 ? "text-success" : actualGasUsed.accuracy > 85 ? "text-warning" : "text-error"}`}
                  >
                    {actualGasUsed.accuracy.toFixed(1)}%
                  </div>
                  <div className="stat-desc">estimation accuracy</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Send Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex gap-4 items-center justify-between">
            <h2 className="card-title">Send Tokens</h2>

            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${sendMode === "individual" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSendMode("individual")}
              >
                Individual
              </button>
              <button
                className={`btn btn-sm ${sendMode === "batch" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSendMode("batch")}
              >
                Batch
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              className="btn btn-primary flex-1"
              onClick={sendMode === "batch" ? sendBatch : sendIndividually}
              disabled={
                !connectedAddress ||
                validRecipients.length === 0 ||
                isSending ||
                isPending ||
                isEthPending ||
                (tokenBalance && totalAmount > parseFloat(formatUnits(tokenBalance.value, selectedToken.decimals)))
              }
            >
              {isSending || isPending ? "Sending..." : `Send ${sendMode === "batch" ? "Batch" : "Individual"}`}
            </button>
          </div>

          {(isConfirming || isSuccess || isError) && (
            <div className="mt-4">
              {isConfirming && (
                <div className="alert alert-info">
                  Confirming transaction...
                  {recipients.some(r => r.status === "sending" && r.txHash) && (
                    <div className="mt-2 space-y-1">
                      {recipients
                        .filter(r => r.status === "sending" && r.txHash)
                        .map(r => (
                          <div key={r.id}>
                            <a
                              href={`/blockexplorer/transaction/${r.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary text-sm"
                            >
                              View transaction: {r.txHash!.slice(0, 10)}...{r.txHash!.slice(-8)}
                            </a>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {isSuccess && (
                <div className="alert alert-success">
                  Transaction confirmed!
                  {recipients.some(r => r.status === "success" && r.txHash) && (
                    <div className="mt-2 space-y-1">
                      {recipients
                        .filter(r => r.status === "success" && r.txHash)
                        .map(r => (
                          <div key={r.id}>
                            <a
                              href={`/blockexplorer/transaction/${r.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary text-sm"
                            >
                              View transaction: {r.txHash!.slice(0, 10)}...{r.txHash!.slice(-8)}
                            </a>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {isError && <div className="alert alert-error">Transaction failed!</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
