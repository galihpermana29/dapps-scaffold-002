//!
//! PortfolioReader in Stylus Rust
//!
//! A smart contract that aggregates multiple token balances in a single call
//! Optimized for batch reading of ERC20 token balances for portfolio tracking
//!

// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;

/// Import items from the SDK. The prelude contains common traits and macros.
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
    call::Call,
};

/// ERC20 interface for balance queries
sol! {
    interface IERC20 {
        function balanceOf(address account) external view returns (uint256);
        function decimals() external view returns (uint8);
        function symbol() external view returns (string memory);
        function name() external view returns (string memory);
    }
}

/// Token information structure
#[derive(Clone, Debug)]
pub struct TokenInfo {
    pub token_address: Address,
    pub balance: U256,
    pub decimals: u8,
    pub symbol: alloc::string::String,
    pub name: alloc::string::String,
}

/// Batch balance result structure
#[derive(Clone, Debug)]
pub struct BatchBalanceResult {
    pub user_address: Address,
    pub eth_balance: U256,
    pub token_count: U256,
    pub tokens: Vec<TokenInfo>,
}

// Define persistent storage
sol_storage! {
    #[entrypoint]
    pub struct PortfolioReader {
        // No state needed for this contract - it's purely for reading
    }
}

/// Declare that `PortfolioReader` is a contract with the following external methods.
#[public]
impl PortfolioReader {
    /// Constructor - no initialization needed
    #[constructor]
    pub fn constructor(&mut self) -> Result<(), Vec<u8>> {
        Ok(())
    }

    /// Get ETH balance for an address
    pub fn get_eth_balance(&self, user: Address) -> U256 {
        self.vm().balance(user)
    }

    /// Get single token balance
    pub fn get_token_balance(&self, token: Address, user: Address) -> Result<U256, Vec<u8>> {
        let ierc20 = IERC20::new(token);
        match ierc20.balance_of(self, user) {
            Ok(balance) => Ok(balance),
            Err(_) => Ok(U256::ZERO), // Return 0 if call fails
        }
    }

    /// Get token decimals
    pub fn get_token_decimals(&self, token: Address) -> Result<u8, Vec<u8>> {
        let ierc20 = IERC20::new(token);
        match ierc20.decimals(self) {
            Ok(decimals) => Ok(decimals),
            Err(_) => Ok(18), // Default to 18 decimals if call fails
        }
    }

    /// Get token symbol
    pub fn get_token_symbol(&self, token: Address) -> Result<alloc::string::String, Vec<u8>> {
        let ierc20 = IERC20::new(token);
        match ierc20.symbol(self) {
            Ok(symbol) => Ok(symbol),
            Err(_) => Ok(alloc::string::String::from("UNKNOWN")), // Default if call fails
        }
    }

    /// Get token name
    pub fn get_token_name(&self, token: Address) -> Result<alloc::string::String, Vec<u8>> {
        let ierc20 = IERC20::new(token);
        match ierc20.name(self) {
            Ok(name) => Ok(name),
            Err(_) => Ok(alloc::string::String::from("Unknown Token")), // Default if call fails
        }
    }

    /// Batch read multiple token balances for a user
    /// Returns array of balances in the same order as input tokens
    pub fn batch_get_balances(&self, tokens: Vec<Address>, user: Address) -> Vec<U256> {
        let mut balances = Vec::new();
        
        for token in tokens {
            let balance = match self.get_token_balance(token, user) {
                Ok(bal) => bal,
                Err(_) => U256::ZERO,
            };
            balances.push(balance);
        }
        
        balances
    }

    /// Batch read token information (balance, decimals, symbol, name) for multiple tokens
    /// This is the most comprehensive batch read function
    pub fn batch_get_token_info(&self, tokens: Vec<Address>, user: Address) -> Vec<(U256, u8, alloc::string::String, alloc::string::String)> {
        let mut results = Vec::new();
        
        for token in tokens {
            let balance = match self.get_token_balance(token, user) {
                Ok(bal) => bal,
                Err(_) => U256::ZERO,
            };
            
            let decimals = match self.get_token_decimals(token) {
                Ok(dec) => dec,
                Err(_) => 18,
            };
            
            let symbol = match self.get_token_symbol(token) {
                Ok(sym) => sym,
                Err(_) => alloc::string::String::from("UNKNOWN"),
            };
            
            let name = match self.get_token_name(token) {
                Ok(n) => n,
                Err(_) => alloc::string::String::from("Unknown Token"),
            };
            
            results.push((balance, decimals, symbol, name));
        }
        
        results
    }

    /// Get complete portfolio information for a user
    /// Returns ETH balance and all token information in one call
    pub fn get_portfolio(&self, tokens: Vec<Address>, user: Address) -> (U256, Vec<(Address, U256, u8, alloc::string::String, alloc::string::String)>) {
        let eth_balance = self.get_eth_balance(user);
        let mut token_info = Vec::new();
        
        for token in tokens {
            let balance = match self.get_token_balance(token, user) {
                Ok(bal) => bal,
                Err(_) => U256::ZERO,
            };
            
            let decimals = match self.get_token_decimals(token) {
                Ok(dec) => dec,
                Err(_) => 18,
            };
            
            let symbol = match self.get_token_symbol(token) {
                Ok(sym) => sym,
                Err(_) => alloc::string::String::from("UNKNOWN"),
            };
            
            let name = match self.get_token_name(token) {
                Ok(n) => n,
                Err(_) => alloc::string::String::from("Unknown Token"),
            };
            
            token_info.push((token, balance, decimals, symbol, name));
        }
        
        (eth_balance, token_info)
    }

    /// Check if multiple addresses are contracts
    /// Useful for validating token addresses before batch operations
    pub fn batch_is_contract(&self, addresses: Vec<Address>) -> Vec<bool> {
        let mut results = Vec::new();
        
        for addr in addresses {
            let code_size = self.vm().code_size(addr);
            results.push(code_size > U256::ZERO);
        }
        
        results
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use stylus_sdk::testing::*;

    #[test]
    fn test_portfolio_reader() {
        let vm = TestVM::default();
        let mut contract = PortfolioReader::from(&vm);

        // Test initialization
        let _ = contract.constructor();

        // Test ETH balance (will be 0 in test environment)
        let test_addr = Address::from([1u8; 20]);
        let eth_balance = contract.get_eth_balance(test_addr);
        assert_eq!(eth_balance, U256::ZERO);

        // Test batch contract check
        let addresses = vec![test_addr, Address::from([2u8; 20])];
        let is_contract_results = contract.batch_is_contract(addresses);
        assert_eq!(is_contract_results.len(), 2);
        assert_eq!(is_contract_results[0], false); // Test addresses are not contracts
        assert_eq!(is_contract_results[1], false);
    }
}
