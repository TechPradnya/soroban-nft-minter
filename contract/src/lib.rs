//! NFT Minter contract
//!
//! A minimal, gas-lean single-collection NFT contract for Stellar Soroban.
//! Deliberately scoped to what a Level 2 submission needs: mint with
//! metadata, ownership lookup, transfer, and events for real-time
//! front-end sync. Not a full SEP-41/NFT standard implementation.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short,
    Address, Env, String, Symbol,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    TokenCount,
    Owner(u64),       // token_id -> owner Address
    TokenUri(u64),    // token_id -> metadata URI (e.g. ipfs://...)
    OwnedCount(Address), // owner -> number of tokens held
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum NftError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotOwner = 3,
    TokenNotFound = 4,
    NotAuthorized = 5,
}

const MINT_EVENT: Symbol = symbol_short!("mint");
const TRANSFER_EVT: Symbol = symbol_short!("transfer");

#[contract]
pub struct NftMinter;

#[contractimpl]
impl NftMinter {
    /// One-time setup. `admin` is recorded for bookkeeping / future
    /// admin-only actions, but no longer required to mint (see below).
    pub fn initialize(env: Env, admin: Address) -> Result<(), NftError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(NftError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenCount, &0u64);
        Ok(())
    }

    /// Mint a new NFT to `to` with a metadata URI (JSON on IPFS, typically).
    /// Returns the new token_id. Emits a `mint` event so the frontend can
    /// live-update without polling the whole ledger.
    ///
    /// Anyone can mint, but only to themselves: `to` must sign the
    /// transaction. This keeps the "who can mint" model open (any
    /// connected wallet) while still requiring a real signature so no one
    /// can mint NFTs into someone else's account without consent.
    pub fn mint(env: Env, to: Address, token_uri: String) -> Result<u64, NftError> {
        to.require_auth();

        // Admin must still exist (i.e. `initialize` was called) so the
        // contract has a known owner for any future admin-only actions,
        // even though minting itself no longer requires that signature.
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(NftError::NotInitialized);
        }

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0);
        let token_id = count;
        count += 1;

        env.storage().instance().set(&DataKey::TokenCount, &count);
        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &to);
        env.storage()
            .persistent()
            .set(&DataKey::TokenUri(token_id), &token_uri);

        let owned: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::OwnedCount(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::OwnedCount(to.clone()), &(owned + 1));

        env.events()
            .publish((MINT_EVENT, to.clone()), (token_id, token_uri));

        Ok(token_id)
    }

    /// Transfer an owned token. Only the current owner can call this.
    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) -> Result<(), NftError> {
        from.require_auth();

        let owner: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .ok_or(NftError::TokenNotFound)?;

        if owner != from {
            return Err(NftError::NotOwner);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &to);

        env.events()
            .publish((TRANSFER_EVT, from, to), token_id);

        Ok(())
    }

    pub fn owner_of(env: Env, token_id: u64) -> Result<Address, NftError> {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .ok_or(NftError::TokenNotFound)
    }

    pub fn token_uri(env: Env, token_id: u64) -> Result<String, NftError> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenUri(token_id))
            .ok_or(NftError::TokenNotFound)
    }

    pub fn total_supply(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::TokenCount)
            .unwrap_or(0)
    }

    pub fn balance_of(env: Env, owner: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::OwnedCount(owner))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn mint_and_read_back() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, NftMinter);
        let client = NftMinterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&admin);

        let uri = String::from_str(&env, "ipfs://bafy.../metadata.json");
        let token_id = client.mint(&user, &uri);

        assert_eq!(token_id, 0);
        assert_eq!(client.owner_of(&token_id), user);
        assert_eq!(client.balance_of(&user), 1);
        assert_eq!(client.total_supply(), 1);
    }

    #[test]
    fn transfer_moves_ownership() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, NftMinter);
        let client = NftMinterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.initialize(&admin);
        let uri = String::from_str(&env, "ipfs://bafy.../1.json");
        let token_id = client.mint(&alice, &uri);

        client.transfer(&alice, &bob, &token_id);
        assert_eq!(client.owner_of(&token_id), bob);
    }
}