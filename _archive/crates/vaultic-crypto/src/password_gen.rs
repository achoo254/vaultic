//! Secure random password generation with configurable character sets.

use rand::seq::SliceRandom;
use rand::Rng;

use crate::error::CryptoError;

const UPPERCASE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
const DIGITS: &[u8] = b"0123456789";
const SYMBOLS: &[u8] = b"!@#$%^&*()-_=+[]{};:,.<>?/";

const MIN_LENGTH: usize = 8;
const MAX_LENGTH: usize = 128;

/// Options for password generation.
#[derive(Debug, Clone)]
pub struct PasswordGenOptions {
    pub length: usize,
    pub uppercase: bool,
    pub lowercase: bool,
    pub digits: bool,
    pub symbols: bool,
}

impl Default for PasswordGenOptions {
    fn default() -> Self {
        Self {
            length: 16,
            uppercase: true,
            lowercase: true,
            digits: true,
            symbols: true,
        }
    }
}

/// Generate a cryptographically random password with the given options.
///
/// Guarantees at least one character from each enabled category.
pub fn generate_password(options: &PasswordGenOptions) -> Result<String, CryptoError> {
    if options.length < MIN_LENGTH || options.length > MAX_LENGTH {
        return Err(CryptoError::InvalidInput(format!(
            "password length must be {MIN_LENGTH}-{MAX_LENGTH}, got {}",
            options.length
        )));
    }

    // Build charset from enabled categories
    let mut charsets: Vec<&[u8]> = Vec::new();
    if options.uppercase {
        charsets.push(UPPERCASE);
    }
    if options.lowercase {
        charsets.push(LOWERCASE);
    }
    if options.digits {
        charsets.push(DIGITS);
    }
    if options.symbols {
        charsets.push(SYMBOLS);
    }

    if charsets.is_empty() {
        return Err(CryptoError::InvalidInput(
            "at least one character category must be enabled".into(),
        ));
    }

    if options.length < charsets.len() {
        return Err(CryptoError::InvalidInput(
            "password length too short to include one char from each enabled category".into(),
        ));
    }

    let mut rng = rand::thread_rng();

    // Guarantee at least one character from each enabled category
    let mut password: Vec<u8> = charsets
        .iter()
        .map(|cs| cs[rng.gen_range(0..cs.len())])
        .collect();

    // Build combined pool for remaining characters
    let pool: Vec<u8> = charsets.iter().flat_map(|cs| cs.iter().copied()).collect();

    // Fill remaining length from combined pool
    for _ in password.len()..options.length {
        password.push(pool[rng.gen_range(0..pool.len())]);
    }

    // Shuffle to avoid predictable category positions
    password.shuffle(&mut rng);

    // Safe: all chars are ASCII
    Ok(String::from_utf8(password).expect("password chars are all ASCII"))
}

use rand::RngCore;

/// A 256-bit share key with automatic zeroization on drop.
#[derive(zeroize::Zeroize, zeroize::ZeroizeOnDrop)]
pub struct ShareKey(pub [u8; 32]);

impl ShareKey {
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

/// Generate a random 256-bit key for secure sharing.
pub fn generate_share_key() -> ShareKey {
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    ShareKey(key)
}
