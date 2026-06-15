<?php
/**
 * Secure API key storage.
 *
 * Keys are encrypted at rest with XSalsa20-Poly1305 (libsodium secretbox).
 * The encryption key is derived from WP's AUTH salts, so ciphertext in the
 * database is useless without access to wp-config.php. Keys are NEVER sent
 * to the browser — all provider calls are proxied server-side (BSC_Rest).
 */

defined( 'ABSPATH' ) || exit;

class BSC_Keys {

	const OPTION = 'bsc_api_keys';

	/** Supported services. */
	public static function services() {
		return array( 'openrouter', 'deepseek', 'minimax', 'fal' );
	}

	private static function key() {
		// 32-byte key derived from install-specific salts.
		return substr( hash( 'sha256', wp_salt( 'auth' ) . '|bsc', true ), 0, SODIUM_CRYPTO_SECRETBOX_KEYBYTES );
	}

	public static function set( $service, $plaintext ) {
		if ( ! in_array( $service, self::services(), true ) ) {
			return false;
		}
		$all = get_option( self::OPTION, array() );

		if ( '' === trim( (string) $plaintext ) ) {
			unset( $all[ $service ] );
		} else {
			$nonce            = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$cipher           = sodium_crypto_secretbox( $plaintext, $nonce, self::key() );
			$all[ $service ]  = base64_encode( $nonce . $cipher );
			sodium_memzero( $plaintext );
		}

		return update_option( self::OPTION, $all, false ); // autoload: no
	}

	public static function get( $service ) {
		$all = get_option( self::OPTION, array() );
		if ( empty( $all[ $service ] ) ) {
			return null;
		}
		$raw = base64_decode( $all[ $service ] );
		if ( strlen( $raw ) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES ) {
			return null;
		}
		$nonce  = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$cipher = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$plain  = sodium_crypto_secretbox_open( $cipher, $nonce, self::key() );
		return false === $plain ? null : $plain;
	}

	/** For the admin UI: which services have a key saved (booleans only). */
	public static function status() {
		$all = get_option( self::OPTION, array() );
		$out = array();
		foreach ( self::services() as $s ) {
			$out[ $s ] = ! empty( $all[ $s ] );
		}
		return $out;
	}
}
