#!/usr/bin/env bash
# Build all WASM modules and place the glue + payload into their plugins.
#
# Requires: rustc/cargo (with the `wasm32-unknown-unknown` target installed)
# and the `wasm-bindgen` CLI on PATH. `wasm-pack` is NOT required.
set -euo pipefail

cd "$(dirname "$0")"

REPO_ROOT="$(cd .. && pwd)"
TARGET="wasm32-unknown-unknown"

build_crate() {
	local crate="$1"
	local out_name="$2"
	local out_dir="$3"

	echo "▶ building ${crate} (${TARGET})…"
	cargo build --release --target "${TARGET}" -p "${crate}"

	echo "▶ wasm-bindgen glue → ${out_dir}"
	mkdir -p "${out_dir}"
	wasm-bindgen \
		--target no-modules \
		--no-typescript \
		--out-dir "${out_dir}" \
		--out-name "${out_name}" \
		"target/${TARGET}/release/${crate//-/_}.wasm"
}

build_crate \
	"brandboss-color" \
	"brandboss_color" \
	"${REPO_ROOT}/wp-content/plugins/brandboss/assets/wasm"

build_crate \
	"dlt-mode" \
	"dlt_mode" \
	"${REPO_ROOT}/wp-content/plugins/awen01-dark-light-transcendent/assets/wasm"

echo "✔ done"
