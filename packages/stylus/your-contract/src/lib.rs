//!
//! YourContract in Stylus Rust
//!
//! A smart contract that allows changing a state variable of the contract and tracking the changes
//! It also allows the owner to withdraw the Ether in the contract
//!
//! This is the Stylus Rust equivalent of the Solidity YourContract.
//!

// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::string::String;
use alloc::vec::Vec;
use core::ptr;

/// Import items from the SDK. The prelude contains common traits and macros.
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
    stylus_core::log,
};

/// Import OpenZeppelin Ownable functionality
use openzeppelin_stylus::access::ownable::{self, IOwnable, Ownable};

/// Error types for the contract
#[derive(SolidityError, Debug)]
pub enum Error {
    UnauthorizedAccount(ownable::OwnableUnauthorizedAccount),
    InvalidOwner(ownable::OwnableInvalidOwner),
}

impl From<ownable::Error> for Error {
    fn from(value: ownable::Error) -> Self {
        match value {
            ownable::Error::UnauthorizedAccount(e) => Error::UnauthorizedAccount(e),
            ownable::Error::InvalidOwner(e) => Error::InvalidOwner(e),
        }
    }
}

// Define events
sol! {
    event GreetingChange(address indexed greetingSetter, string newGreeting, bool premium, uint256 value);
    event NativeTokenSent(address indexed from, address indexed to, uint256 amount);
    event BatchNativeTokenSent(address indexed from, uint256 totalAmount, uint256 recipientCount);
    event ERC20TokenSent(address indexed token, address indexed from, address indexed to, uint256 amount);
    event BatchERC20TokenSent(address indexed token, address indexed from, uint256 totalAmount, uint256 recipientCount);
}

// Define persistent storage using the Solidity ABI.
// `YourContract` will be the entrypoint.
sol_storage! {
    #[entrypoint]
    pub struct YourContract {
        Ownable ownable;
        string greeting;
        bool premium;
        uint256 total_counter;
        mapping(address => uint256) user_greeting_counter;
        uint256 total_native_sent;
        uint256 total_erc20_sent;
        mapping(address => uint256) user_native_sent;
        mapping(address => uint256) user_erc20_sent;
    }
}

/// Declare that `YourContract` is a contract with the following external methods.
#[public]
#[implements(IOwnable<Error = Error>)]
impl YourContract {
    #[constructor]
    pub fn constructor(&mut self, initial_owner: Address) -> Result<(), Error> {
        // Initialize Ownable with the initial owner using OpenZeppelin pattern
        self.ownable.constructor(initial_owner)?;
        self.greeting.set_str("Building Unstoppable Apps!!!");
        self.premium.set(false);
        self.total_counter.set(U256::ZERO);
        self.total_native_sent.set(U256::ZERO);
        self.total_erc20_sent.set(U256::ZERO);
        Ok(())
    }

    /// Gets the current greeting
    pub fn greeting(&self) -> String {
        self.greeting.get_string()
    }

    /// Gets the premium status
    pub fn premium(&self) -> bool {
        self.premium.get()
    }

    /// Gets the total counter
    pub fn total_counter(&self) -> U256 {
        self.total_counter.get()
    }

    /// Gets the user greeting counter for a specific address
    pub fn user_greeting_counter(&self, user: Address) -> U256 {
        self.user_greeting_counter.get(user)
    }

    /// Function that allows anyone to change the state variable "greeting" of the contract and increase the counters
    #[payable]
    pub fn set_greeting(&mut self, new_greeting: String) {
        // Change state variables
        self.greeting.set_str(&new_greeting);

        // Increment counters
        let current_total = self.total_counter.get();
        self.total_counter.set(current_total + U256::from(1));

        let sender: Address = self.vm().msg_sender();
        let current_user_count = self.user_greeting_counter.get(sender);
        self.user_greeting_counter
            .insert(sender, current_user_count + U256::from(1));

        // Set premium based on msg.value
        let msg_value = self.vm().msg_value();
        let is_premium = msg_value > U256::ZERO;
        self.premium.set(is_premium);

        // Emit the event
        log(
            self.vm(),
            GreetingChange {
                greetingSetter: sender,
                newGreeting: new_greeting,
                premium: is_premium,
                value: msg_value,
            },
        );
    }

    /// Function that allows the owner to withdraw all the Ether in the contract
    /// The function can only be called by the owner of the contract
    pub fn withdraw(&mut self) -> Result<(), Error> {
        // Check if caller is owner using OpenZeppelin's only_owner
        self.ownable.only_owner()?;

        // Get contract balance and transfer to owner using transfer_eth
        let balance = self.vm().balance(self.vm().contract_address());
        if balance > U256::ZERO {
            let owner = self.ownable.owner();
            let _ = self.vm().transfer_eth(owner, balance);
        }

        Ok(())
    }

    /// Send native token (ETH) to a single recipient
    #[payable]
    pub fn send_native_individual(&mut self, recipient: Address, amount: U256) {
        // Transfer native token
        let _ = self.vm().transfer_eth(recipient, amount);

        let sender = self.vm().msg_sender();
        
        // Update counters
        let current_total = self.total_native_sent.get();
        self.total_native_sent.set(current_total + amount);
        
        let current_user = self.user_native_sent.get(sender);
        self.user_native_sent.insert(sender, current_user + amount);

        // Emit event
        log(
            self.vm(),
            NativeTokenSent {
                from: sender,
                to: recipient,
                amount,
            },
        );
    }

    /// Send native token (ETH) to multiple recipients in batch
    #[payable]
    pub fn send_native_batch(&mut self, recipients: Vec<Address>, amounts: Vec<U256>) {
        let sender = self.vm().msg_sender();
        let mut total_amount = U256::ZERO;

        // Send to each recipient
        for (i, recipient) in recipients.iter().enumerate() {
            let amount = amounts[i];
            let _ = self.vm().transfer_eth(*recipient, amount);
            total_amount += amount;
        }

        // Update counters
        let current_total = self.total_native_sent.get();
        self.total_native_sent.set(current_total + total_amount);
        
        let current_user = self.user_native_sent.get(sender);
        self.user_native_sent.insert(sender, current_user + total_amount);

        // Emit event
        log(
            self.vm(),
            BatchNativeTokenSent {
                from: sender,
                totalAmount: total_amount,
                recipientCount: U256::from(recipients.len()),
            },
        );
    }

    /// Get total native tokens sent through the contract
    pub fn get_total_native_sent(&self) -> U256 {
        self.total_native_sent.get()
    }

    /// Get native tokens sent by a specific user
    pub fn get_user_native_sent(&self, user: Address) -> U256 {
        self.user_native_sent.get(user)
    }

    /// Send ERC-20 token to a single recipient
    /// Note: User must approve this contract to spend tokens before calling
    pub fn send_erc20_individual(&mut self, token: Address, recipient: Address, amount: U256) {
        let sender = self.vm().msg_sender();

        // Create transferFrom call data: transferFrom(address from, address to, uint256 amount)
        // Function selector for transferFrom(address,address,uint256) is 0x23b872dd
        let mut call_data = Vec::with_capacity(100);
        call_data.extend_from_slice(&[0x23, 0xb8, 0x72, 0xdd]); // transferFrom selector
        
        // Encode sender address (32 bytes, left-padded)
        let mut sender_bytes = [0u8; 32];
        sender_bytes[12..32].copy_from_slice(sender.as_slice());
        call_data.extend_from_slice(&sender_bytes);
        
        // Encode recipient address (32 bytes, left-padded)
        let mut recipient_bytes = [0u8; 32];
        recipient_bytes[12..32].copy_from_slice(recipient.as_slice());
        call_data.extend_from_slice(&recipient_bytes);
        
        // Encode amount (32 bytes, big-endian)
        let amount_bytes = amount.to_be_bytes::<32>();
        call_data.extend_from_slice(&amount_bytes);

        // Make the call to the ERC-20 contract using raw call
        unsafe {
            let mut return_size = 0usize;
            let _ = self.vm().call_contract(
                token.as_ptr(),
                call_data.as_ptr(),
                call_data.len(),
                ptr::null(),
                0,
                &mut return_size,
            );
        }

        // Update counters
        let current_total = self.total_erc20_sent.get();
        self.total_erc20_sent.set(current_total + amount);
        
        let current_user = self.user_erc20_sent.get(sender);
        self.user_erc20_sent.insert(sender, current_user + amount);

        // Emit event
        log(
            self.vm(),
            ERC20TokenSent {
                token,
                from: sender,
                to: recipient,
                amount,
            },
        );
    }

    /// Send ERC-20 token to multiple recipients in batch
    /// Note: User must approve this contract to spend tokens before calling
    pub fn send_erc20_batch(&mut self, token: Address, recipients: Vec<Address>, amounts: Vec<U256>) {
        let sender = self.vm().msg_sender();
        let mut total_amount = U256::ZERO;

        // Send to each recipient
        for (i, recipient) in recipients.iter().enumerate() {
            let amount = amounts[i];
            
            // Create transferFrom call data: transferFrom(address from, address to, uint256 amount)
            let mut call_data = Vec::with_capacity(100);
            call_data.extend_from_slice(&[0x23, 0xb8, 0x72, 0xdd]); // transferFrom selector
            
            // Encode sender address (32 bytes, left-padded)
            let mut sender_bytes = [0u8; 32];
            sender_bytes[12..32].copy_from_slice(sender.as_slice());
            call_data.extend_from_slice(&sender_bytes);
            
            // Encode recipient address (32 bytes, left-padded)
            let mut recipient_bytes = [0u8; 32];
            recipient_bytes[12..32].copy_from_slice(recipient.as_slice());
            call_data.extend_from_slice(&recipient_bytes);
            
            // Encode amount (32 bytes, big-endian)
            let amount_bytes = amount.to_be_bytes::<32>();
            call_data.extend_from_slice(&amount_bytes);

            // Make the call to the ERC-20 contract using raw call
            unsafe {
                let mut return_size = 0usize;
                let _ = self.vm().call_contract(
                    token.as_ptr(),
                    call_data.as_ptr(),
                    call_data.len(),
                    ptr::null(),
                    0,
                    &mut return_size,
                );
            }
            
            total_amount += amount;
        }

        // Update counters
        let current_total = self.total_erc20_sent.get();
        self.total_erc20_sent.set(current_total + total_amount);
        
        let current_user = self.user_erc20_sent.get(sender);
        self.user_erc20_sent.insert(sender, current_user + total_amount);

        // Emit event
        log(
            self.vm(),
            BatchERC20TokenSent {
                token,
                from: sender,
                totalAmount: total_amount,
                recipientCount: U256::from(recipients.len()),
            },
        );
    }

    /// Get total ERC-20 tokens sent through the contract
    pub fn get_total_erc20_sent(&self) -> U256 {
        self.total_erc20_sent.get()
    }

    /// Get ERC-20 tokens sent by a specific user
    pub fn get_user_erc20_sent(&self, user: Address) -> U256 {
        self.user_erc20_sent.get(user)
    }

    /// Allow contract to receive ETH (equivalent to receive() function)
    #[payable]
    pub fn receive_ether(&self) {
        // This function allows the contract to receive ETH
        // The #[payable] attribute allows it to accept value
    }
}

/// Implementation of the IOwnable interface
#[public]
impl IOwnable for YourContract {
    type Error = Error;

    fn owner(&self) -> Address {
        self.ownable.owner()
    }

    fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Self::Error> {
        Ok(self.ownable.transfer_ownership(new_owner)?)
    }

    fn renounce_ownership(&mut self) -> Result<(), Self::Error> {
        Ok(self.ownable.renounce_ownership()?)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use stylus_sdk::testing::*;

    #[no_mangle]
    pub unsafe extern "C" fn emit_log(_pointer: *const u8, _len: usize, _: usize) {}
    #[no_mangle]
    pub unsafe extern "C" fn msg_sender(_sender: *mut u8) {}

    #[test]
    fn test_your_contract() {
        let vm = TestVM::default();
        let mut contract = YourContract::from(&vm);

        // Test initialization
        let owner_addr = Address::from([1u8; 20]);
        let _ = contract.constructor(owner_addr);

        assert_eq!(contract.owner(), owner_addr);
        assert_eq!(contract.greeting(), "Building Unstoppable Apps!!!");
        assert_eq!(contract.premium(), false);
        assert_eq!(contract.total_counter(), U256::ZERO);

        // Test setting greeting without payment
        contract.set_greeting("Hello World".to_string());
        assert_eq!(contract.greeting(), "Hello World");
        assert_eq!(contract.premium(), false);
        assert_eq!(contract.total_counter(), U256::from(1));

        // Test user greeting counter
        let sender = vm.msg_sender();
        assert_eq!(contract.user_greeting_counter(sender), U256::from(1));

        // Test setting greeting with payment
        vm.set_value(U256::from(100));
        contract.set_greeting("Premium Hello".to_string());
        assert_eq!(contract.greeting(), "Premium Hello");
        assert_eq!(contract.premium(), true);
        assert_eq!(contract.total_counter(), U256::from(2));
        assert_eq!(contract.user_greeting_counter(sender), U256::from(2));
    }
}
