import { erc20Abi, formatEther, parseUnits, encodeFunctionData } from "viem";
import { multicallAbi } from "../contracts/multicall";

export interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  isNative: boolean;
}

export interface Recipient {
  id: string;
  address: string;
  amount: string;
  status: "pending" | "sending" | "success" | "failed" | "initial";
  txHash?: string;
}

export interface GasEstimate {
  individual: bigint;
  batch: bigint;
  savings: number;
  individualFee: string;
  batchFee: string;
}

export interface ActualGasUsed {
  estimated: bigint;
  actual: bigint;
  accuracy: number;
}

class MultiSendClass {
  // Recipient management
  static addRecipient(recipients: Recipient[]): Recipient[] {
    const newId = (recipients.length + 1).toString();
    return [...recipients, { id: newId, address: "", amount: "", status: "initial" }];
  }

  static removeRecipient(recipients: Recipient[], id: string): Recipient[] {
    if (recipients.length > 1) {
      return recipients.filter(r => r.id !== id);
    }
    return recipients;
  }

  static updateRecipient(recipients: Recipient[], id: string, field: "address" | "amount", value: string): Recipient[] {
    return recipients.map(r => (r.id === id ? { ...r, [field]: value } : r));
  }

  // Validation
  static validateRecipients(recipients: Recipient[]): Recipient[] {
    return recipients.filter(r => r.address.match(/^0x[a-fA-F0-9]{40}$/) && r.amount && parseFloat(r.amount) > 0);
  }

  static validateAddress(
    address: string,
    connectedAddress?: string,
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (!address) {
      return { isValid: false, error: "Address is required" };
    }

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { isValid: false, error: "Invalid address format" };
    }

    if (connectedAddress && address.toLowerCase() === connectedAddress.toLowerCase()) {
      return { isValid: false, error: "Cannot send to your own address" };
    }

    return { isValid: true };
  }

  static validateAmount(
    amount: string,
    balance?: string,
    decimals: number = 18,
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (!amount) {
      return { isValid: false, error: "Amount is required" };
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { isValid: false, error: "Amount must be greater than 0" };
    }

    if (balance) {
      const balanceNum = parseFloat(balance);
      if (numAmount > balanceNum) {
        return { isValid: false, error: "Amount exceeds balance" };
      }
    }

    return { isValid: true };
  }

  static calculateTotalAmount(validRecipients: Recipient[]): number {
    return validRecipients.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  }

  static resetToInitialState(): Recipient[] {
    return [
      { id: "1", address: "", amount: "", status: "initial" },
      { id: "2", address: "", amount: "", status: "initial" },
    ];
  }

  // Gas estimation
  static async estimateGas(
    validRecipients: Recipient[],
    selectedToken: Token,
    address: `0x${string}`,
    gasPrice: bigint,
    publicClient: any,
  ): Promise<GasEstimate | null> {
    if (validRecipients.length === 0 || !gasPrice || !address || !publicClient) return null;

    try {
      let individualGas = BigInt(0);
      let batchGas = BigInt(0);

      if (selectedToken.isNative) {
        // Estimate gas for individual ETH transfers
        for (const recipient of validRecipients) {
          const amount = parseUnits(recipient.amount, selectedToken.decimals);
          try {
            const gas = await publicClient.estimateGas({
              account: address,
              to: recipient.address as `0x${string}`,
              value: amount,
            });
            individualGas += gas;
          } catch {
            individualGas += BigInt(21000); // Fallback to standard ETH transfer gas
          }
        }
        // For ETH, batch is same as individual (sequential sends)
        batchGas = individualGas;
      } else {
        // Estimate gas for individual ERC20 transfers
        for (const recipient of validRecipients) {
          const amount = parseUnits(recipient.amount, selectedToken.decimals);
          try {
            const gas = await publicClient.estimateGas({
              account: address,
              to: selectedToken.address,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [recipient.address as `0x${string}`, amount],
              }),
            });
            individualGas += gas;
          } catch {
            individualGas += BigInt(65000); // Fallback for ERC20 transfer
          }
        }

        // Estimate gas for batch ERC20 transfer using multicall
        try {
          const calls = validRecipients.map(recipient => {
            const amount = parseUnits(recipient.amount, selectedToken.decimals);
            return {
              target: selectedToken.address,
              callData: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [recipient.address as `0x${string}`, amount],
              }),
            };
          });

          batchGas = await publicClient.estimateGas({
            account: address,
            to: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
            data: encodeFunctionData({
              abi: multicallAbi,
              functionName: "aggregate",
              args: [calls],
            }),
          });
        } catch {
          // Fallback estimation for batch (typically 30% savings)
          batchGas = BigInt(50000) + (individualGas * BigInt(70)) / BigInt(100);
        }
      }

      const savings = individualGas > batchGas ? Number(((individualGas - batchGas) * BigInt(100)) / individualGas) : 0;

      // Calculate actual fees in ETH (gas units × gas price)
      const individualFee = formatEther(individualGas * gasPrice);
      const batchFee = formatEther(batchGas * gasPrice);

      return {
        individual: individualGas,
        batch: batchGas,
        savings: Math.max(0, savings),
        individualFee,
        batchFee,
      };
    } catch (error) {
      console.error("Gas estimation failed:", error);
      return null;
    }
  }

  // Individual sending logic
  static async sendIndividually(
    validRecipients: Recipient[],
    selectedToken: Token,
    sendTransactionAsync: any,
    writeContract: any,
    txHash: string | undefined,
    setRecipients: (updater: (prev: Recipient[]) => Recipient[]) => void,
  ): Promise<void> {
    for (const recipient of validRecipients) {
      try {
        // Update status to sending
        setRecipients(prev => prev.map(r => (r.id === recipient.id ? { ...r, status: "sending" } : r)));

        const amount = parseUnits(recipient.amount, selectedToken.decimals);
        let transactionHash: string | undefined;

        if (selectedToken.isNative) {
          // Send native ETH - capture the returned hash directly
          transactionHash = await sendTransactionAsync({
            to: recipient.address as `0x${string}`,
            value: amount,
          });
        } else {
          // Send ERC20 token
          await writeContract({
            address: selectedToken.address,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient.address as `0x${string}`, amount],
          });
          // For ERC20, get hash from hook state
          transactionHash = txHash;
        }

        // Update status to success with the specific transaction hash
        setRecipients(prev =>
          prev.map(r => (r.id === recipient.id ? { ...r, status: "success", txHash: transactionHash } : r)),
        );
      } catch (error) {
        console.error(`Failed to send to ${recipient.address}:`, error);
        setRecipients(prev => prev.map(r => (r.id === recipient.id ? { ...r, status: "failed" } : r)));
      }
    }
  }

  // Batch sending logic
  static async sendBatch(
    validRecipients: Recipient[],
    selectedToken: Token,
    sendTransactionAsync: any,
    writeContract: any,
    txHash: string | undefined,
    publicClient: any,
    gasEstimate: GasEstimate | null,
    setRecipients: (updater: (prev: Recipient[]) => Recipient[]) => void,
    setActualGasUsed: (data: ActualGasUsed) => void,
  ): Promise<void> {
    try {
      // Mark all as sending
      setRecipients(prev =>
        prev.map(r => (validRecipients.some(vr => vr.id === r.id) ? { ...r, status: "sending" } : r)),
      );

      if (selectedToken.isNative) {
        // For native ETH, send transactions sequentially to avoid nonce conflicts
        for (let i = 0; i < validRecipients.length; i++) {
          const recipient = validRecipients[i];
          const amount = parseUnits(recipient.amount, selectedToken.decimals);

          try {
            const txHash = await sendTransactionAsync({
              to: recipient.address as `0x${string}`,
              value: amount,
            });

            // Get transaction receipt to compare actual vs estimated gas
            if (publicClient) {
              try {
                const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
                const actualGas = receipt.gasUsed;

                // Calculate accuracy if we have gas estimate
                if (gasEstimate) {
                  const estimatedPerTx = gasEstimate.individual / BigInt(validRecipients.length);
                  const accuracy = Number((BigInt(100) * actualGas) / estimatedPerTx);
                  console.log(
                    `🔍 Gas Validation - Estimated: ${estimatedPerTx}, Actual: ${actualGas}, Accuracy: ${accuracy}%`,
                  );

                  // Store validation data for UI display
                  setActualGasUsed({
                    estimated: estimatedPerTx,
                    actual: actualGas,
                    accuracy,
                  });
                }
              } catch (error) {
                console.log("Could not fetch transaction receipt for gas validation:", error);
              }
            }

            // Update individual recipient status as each transaction completes
            setRecipients(prev => prev.map(r => (r.id === recipient.id ? { ...r, status: "success", txHash } : r)));
          } catch (error) {
            console.error(`Failed to send ETH to ${recipient.address}:`, error);

            // Mark this recipient as failed
            setRecipients(prev => prev.map(r => (r.id === recipient.id ? { ...r, status: "failed" } : r)));
          }
        }
      } else {
        // For ERC20 tokens, create multicall batch transfer
        const calls = validRecipients.map(recipient => {
          const amount = parseUnits(recipient.amount, selectedToken.decimals);
          return encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient.address as `0x${string}`, amount],
          });
        });

        // Use multicall for ERC20 batch transfers
        await writeContract({
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
          abi: multicallAbi,
          functionName: "aggregate",
          args: [calls.map(callData => ({ target: selectedToken.address, callData }))],
        });

        // Mark all as success with same batch transaction hash
        setRecipients(prev =>
          prev.map(r => (validRecipients.some(vr => vr.id === r.id) ? { ...r, status: "success", txHash: txHash } : r)),
        );
      }
    } catch (error) {
      console.error("Batch send failed:", error);
      setRecipients(prev =>
        prev.map(r => (validRecipients.some(vr => vr.id === r.id) ? { ...r, status: "failed" } : r)),
      );
    }
  }
}

export default MultiSendClass;
