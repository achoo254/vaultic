//! Tests for password generator and share key generation.

use vaultic_crypto::{generate_password, generate_share_key, PasswordGenOptions};

#[test]
fn default_options_generate_16_char_password() {
    let opts = PasswordGenOptions::default();
    let pw = generate_password(&opts).unwrap();
    assert_eq!(pw.len(), 16);
}

#[test]
fn respects_custom_length() {
    let opts = PasswordGenOptions {
        length: 32,
        ..Default::default()
    };
    let pw = generate_password(&opts).unwrap();
    assert_eq!(pw.len(), 32);
}

#[test]
fn contains_at_least_one_from_each_enabled_category() {
    let opts = PasswordGenOptions {
        length: 20,
        uppercase: true,
        lowercase: true,
        digits: true,
        symbols: true,
    };

    // Run multiple times to increase confidence
    for _ in 0..10 {
        let pw = generate_password(&opts).unwrap();
        assert!(
            pw.chars().any(|c| c.is_ascii_uppercase()),
            "missing uppercase"
        );
        assert!(
            pw.chars().any(|c| c.is_ascii_lowercase()),
            "missing lowercase"
        );
        assert!(pw.chars().any(|c| c.is_ascii_digit()), "missing digit");
        assert!(pw.chars().any(|c| !c.is_alphanumeric()), "missing symbol");
    }
}

#[test]
fn only_uppercase_produces_uppercase_only() {
    let opts = PasswordGenOptions {
        length: 20,
        uppercase: true,
        lowercase: false,
        digits: false,
        symbols: false,
    };
    let pw = generate_password(&opts).unwrap();
    assert!(pw.chars().all(|c| c.is_ascii_uppercase()));
}

#[test]
fn rejects_too_short_length() {
    let opts = PasswordGenOptions {
        length: 3,
        ..Default::default()
    };
    assert!(generate_password(&opts).is_err());
}

#[test]
fn rejects_too_long_length() {
    let opts = PasswordGenOptions {
        length: 200,
        ..Default::default()
    };
    assert!(generate_password(&opts).is_err());
}

#[test]
fn rejects_no_categories_enabled() {
    let opts = PasswordGenOptions {
        length: 16,
        uppercase: false,
        lowercase: false,
        digits: false,
        symbols: false,
    };
    assert!(generate_password(&opts).is_err());
}

#[test]
fn share_key_is_32_bytes() {
    let key = generate_share_key();
    assert_eq!(key.as_bytes().len(), 32);
}

#[test]
fn share_keys_are_unique() {
    let k1 = generate_share_key();
    let k2 = generate_share_key();
    assert_ne!(k1.as_bytes(), k2.as_bytes());
}
