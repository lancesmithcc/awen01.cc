let wasm_bindgen_typography = (function(exports) {
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }

    /**
     * Parse an image aspect-ratio spec (`"16:9"`, `"4:3"`, `"1:1"`, …) into
     * `{ "w": 16, "h": 9, "ratio": 1.7778 }`.
     * @param {string} spec
     * @returns {string}
     */
    function aspect_ratio(spec) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ptr0 = passStringToWasm0(spec, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.aspect_ratio(ptr0, len0);
            deferred2_0 = ret[0];
            deferred2_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    exports.aspect_ratio = aspect_ratio;

    /**
     * Resolve the type scale in rem (`round((base * ratio^step) / 16, 3)`),
     * matching the `--bsc-font-*` tokens in `tokens.css`. Returns `{ name: rem }`.
     * @param {number} base_px
     * @param {number} ratio
     * @param {string} levels_json
     * @returns {string}
     */
    function font_rem(base_px, ratio, levels_json) {
        let deferred4_0;
        let deferred4_1;
        try {
            const val2 = +base_px;
            const val3 = +ratio;
            const ptr0 = passStringToWasm0(levels_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.font_rem(val2, val3, ptr0, len0);
            deferred4_0 = ret[0];
            deferred4_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    exports.font_rem = font_rem;

    /**
     * Width of one grid column at a given content width:
     * `(content_width - (columns - 1) * gutter) / columns`.
     * @param {number} content_width_px
     * @param {number} columns
     * @param {number} gutter_px
     * @returns {number}
     */
    function grid_column_width(content_width_px, columns, gutter_px) {
        const ret = wasm.grid_column_width(content_width_px, columns, gutter_px);
        return ret;
    }
    exports.grid_column_width = grid_column_width;

    /**
     * Width of a span of `span` columns (including intervening gutters).
     * @param {number} content_width_px
     * @param {number} columns
     * @param {number} gutter_px
     * @param {number} span
     * @returns {number}
     */
    function grid_span_width(content_width_px, columns, gutter_px, span) {
        const ret = wasm.grid_span_width(content_width_px, columns, gutter_px, span);
        return ret;
    }
    exports.grid_span_width = grid_span_width;

    /**
     * Resolve the spacing scale in px (`round(base * multiplier, 1)`).
     * `scale_json` is a JSON array of multipliers (e.g. `[0.5,1,2,3,4,6,8,12]`).
     * Returns a JSON array of px values.
     * @param {number} base_px
     * @param {string} scale_json
     * @returns {string}
     */
    function spacing_px(base_px, scale_json) {
        let deferred3_0;
        let deferred3_1;
        try {
            const val2 = +base_px;
            const ptr0 = passStringToWasm0(scale_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.spacing_px(val2, ptr0, len0);
            deferred3_0 = ret[0];
            deferred3_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    exports.spacing_px = spacing_px;

    /**
     * Resolve the spacing scale as CSS token strings (`--bsc-space-*`), matching
     * `tokens.css` (2 decimals with trailing zeros stripped). Returns a JSON array
     * of strings.
     * @param {number} base_px
     * @param {string} scale_json
     * @returns {string}
     */
    function spacing_tokens(base_px, scale_json) {
        let deferred3_0;
        let deferred3_1;
        try {
            const val2 = +base_px;
            const ptr0 = passStringToWasm0(scale_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.spacing_tokens(val2, ptr0, len0);
            deferred3_0 = ret[0];
            deferred3_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
        }
    }
    exports.spacing_tokens = spacing_tokens;

    /**
     * Resolve the modular type scale in px (`round(base * ratio^step, 1)`).
     * `levels_json` is an ordered JSON object of `{ name: step }`, e.g.
     * `{"caption":-1,"body":0,"h1":5}`. Returns a JSON object `{ name: px }`.
     * @param {number} base_px
     * @param {number} ratio
     * @param {string} levels_json
     * @returns {string}
     */
    function type_scale_px(base_px, ratio, levels_json) {
        let deferred4_0;
        let deferred4_1;
        try {
            const val2 = +base_px;
            const val3 = +ratio;
            const ptr0 = passStringToWasm0(levels_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.type_scale_px(val2, val3, ptr0, len0);
            deferred4_0 = ret[0];
            deferred4_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
        }
    }
    exports.type_scale_px = type_scale_px;
    function __wbg_get_imports() {
        const import0 = {
            __proto__: null,
            __wbindgen_init_externref_table: function() {
                const table = wasm.__wbindgen_externrefs;
                table.set(0, undefined);
                table.set(1024, undefined);
                table.set(1025, null);
                table.set(1026, true);
                table.set(1027, false);
            },
        };
        return {
            __proto__: null,
            "./brandboss_typography_bg.js": import0,
        };
    }

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    let cachedUint8ArrayMemory0 = null;
    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function passStringToWasm0(arg, malloc, realloc) {
        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }
        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = cachedTextEncoder.encodeInto(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
    cachedTextDecoder.decode();
    function decodeText(bytes) {
        return cachedTextDecoder.decode(bytes);
    }

    const cachedTextEncoder = new TextEncoder();

    if (!('encodeInto' in cachedTextEncoder)) {
        cachedTextEncoder.encodeInto = function (arg, view) {
            const buf = cachedTextEncoder.encode(arg);
            view.set(buf);
            return {
                read: arg.length,
                written: buf.length
            };
        };
    }

    let WASM_VECTOR_LEN = 0;

    let wasmModule, wasmInstance, wasm;
    function __wbg_finalize_init(instance, module) {
        wasmInstance = instance;
        wasm = instance.exports;
        wasmModule = module;
        cachedUint8ArrayMemory0 = null;
        wasm.__wbindgen_start();
        return wasm;
    }

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (!module.ok) {
                throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
            }

            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);
                } catch (e) {
                    const validResponse = expectedResponseType(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else { throw e; }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);
        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };
            } else {
                return instance;
            }
        }

        function expectedResponseType(type) {
            switch (type) {
                case 'basic': case 'cors': case 'default': return true;
            }
            return false;
        }
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (module !== undefined) {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();
        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }
        const instance = new WebAssembly.Instance(module, imports);
        return __wbg_finalize_init(instance, module);
    }

    let __wbg_init_promise;
    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;
        if (__wbg_init_promise === undefined) {
            __wbg_init_promise = __wbg_init_once(module_or_path);
            __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
        }
        return __wbg_init_promise;
    }

    async function __wbg_init_once(module_or_path) {

        if (module_or_path !== undefined) {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (module_or_path === undefined && script_src !== undefined) {
            module_or_path = script_src.replace(/\.js$/, "_bg.wasm");
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    return Object.assign(__wbg_init, { initSync }, exports);
})({ __proto__: null });
