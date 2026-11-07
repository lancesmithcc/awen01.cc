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
	# Optional: distinct global init function for `--target no-modules` so
	# multiple modules can be enqueued on the same page without clashing.
	local global_name="${4:-}"

	echo "▶ building ${crate} (${TARGET})…"
	cargo build --release --target "${TARGET}" -p "${crate}"

	echo "▶ wasm-bindgen glue → ${out_dir}"
	mkdir -p "${out_dir}"
	if [[ -n "${global_name}" ]]; then
		wasm-bindgen \
			--target no-modules \
			--no-typescript \
			--no-modules-global "${global_name}" \
			--out-dir "${out_dir}" \
			--out-name "${out_name}" \
			"target/${TARGET}/release/${crate//-/_}.wasm"
	else
		wasm-bindgen \
			--target no-modules \
			--no-typescript \
			--out-dir "${out_dir}" \
			--out-name "${out_name}" \
			"target/${TARGET}/release/${crate//-/_}.wasm"
	fi
}

build_crate \
	"brandboss-color" \
	"brandboss_color" \
	"${REPO_ROOT}/wp-content/plugins/brandboss/assets/wasm"

build_crate \
	"dlt-mode" \
	"dlt_mode" \
	"${REPO_ROOT}/wp-content/plugins/awen01-dark-light-transcendent/assets/wasm"
	"ultrabgs-math" \
	"ultrabgs_math" \
	"${REPO_ROOT}/wp-content/plugins/ultrabgs/assets/wasm"
	"brandboss-typography" \
	"brandboss_typography" \
	"${REPO_ROOT}/wp-content/plugins/brandboss/assets/wasm" \
	"wasm_bindgen_typography"
	"yolo-scroll" \
	"yolo_scroll" \
	"${REPO_ROOT}/wp-content/plugins/yolo-scroll/assets/wasm"

echo "✔ done"
