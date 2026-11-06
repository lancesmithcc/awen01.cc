/* BrandBoss — admin app (no build step). */
( function () {
	'use strict';

	const state = BSC.brand;
	let keys = BSC.keys;
	let activeTab = 'quickstart';
	const root = document.getElementById( 'bsc-app' );

	/* Quick Start scratch state (not part of the brand object until extrapolated). */
	const qs = { logo_attachment_id: 0, logo_url: '', seeds: [ '#2f6feb' ], heading_font: '', body_font: '', vibe: [ '', '', '' ], industry: '', strategy: 'committed' };

	/* WASM color engine — optional. Loaded async; when present it powers the
	   live palette preview and contrast math. Falls back to the JS math below. */
	let wasm = null;
	if ( typeof wasm_bindgen !== 'undefined' && BSC.wasm_url ) {
		wasm_bindgen( { module_or_path: BSC.wasm_url } ).then( () => {
			wasm = wasm_bindgen;
			render();
		} ).catch( () => {} );
	}

	/* Extract dominant colors from an image via canvas (client-side seed suggestion). */
	function extractColors( url, cb ) {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			const c = document.createElement( 'canvas' );
			const size = 64;
			c.width = c.height = size;
			const ctx = c.getContext( '2d' );
			ctx.drawImage( img, 0, 0, size, size );
			let data;
			try { data = ctx.getImageData( 0, 0, size, size ).data; } catch ( e ) { return cb( [] ); }
			const buckets = {};
			for ( let i = 0; i < data.length; i += 4 ) {
				const a = data[ i + 3 ];
				if ( a < 200 ) continue; // skip transparency
				const r = data[ i ], g = data[ i + 1 ], b = data[ i + 2 ];
				const max = Math.max( r, g, b ), min = Math.min( r, g, b );
				if ( max - min < 18 ) continue; // skip near-grays
				const key = ( r >> 4 ) + ',' + ( g >> 4 ) + ',' + ( b >> 4 ); // 16-level buckets
				buckets[ key ] = buckets[ key ] || { n: 0, r: 0, g: 0, b: 0 };
				const bk = buckets[ key ];
				bk.n++; bk.r += r; bk.g += g; bk.b += b;
			}
			const top = Object.values( buckets ).sort( ( a, b ) => b.n - a.n ).slice( 0, 3 )
				.map( ( bk ) => '#' + [ bk.r, bk.g, bk.b ].map( ( v ) => Math.round( v / bk.n ).toString( 16 ).padStart( 2, '0' ) ).join( '' ) );
			cb( top );
		};
		img.onerror = () => cb( [] );
		img.src = url;
	}

	function tabQuickStart() {
		const wrap = el( 'div' );
		wrap.appendChild( el( 'p', { class: 'bsc-hint' },
			'Give the engine the minimum — a logo, up to three colors, a type combo, three voice words — and it composes the full standard: an OKLCH-derived 12-role palette with contrast-gated text variants and a 50–900 ramp, modular type scale, spacing system, logo treatment rules, imagery and tone guidelines. Math decides everything math can decide; AI only writes the judgment copy (grounded in the built-in design fundamentals).' ) );

		// --- Logo (Core Asset Protocol: mandatory) ---
		wrap.appendChild( el( 'h3', {}, '1 · Logo (required)' ) );
		const logoRow = el( 'div', { class: 'bsc-qs-logo' } );
		function drawLogo() {
			logoRow.innerHTML = '';
			if ( qs.logo_url ) logoRow.appendChild( el( 'img', { src: qs.logo_url, class: 'bsc-thumb' } ) );
			logoRow.appendChild( el( 'button', { class: 'button', type: 'button', onclick: () => mediaPick( ( id, url ) => {
				qs.logo_attachment_id = id; qs.logo_url = url;
				extractColors( url, ( colors ) => {
					if ( colors.length ) { qs.seeds = colors; toast( 'Pulled ' + colors.length + ' seed color(s) from the logo' ); }
					drawLogo(); drawSeeds();
				} );
				drawLogo();
			} ) }, qs.logo_url ? 'Replace logo' : 'Choose logo' ) );
		}
		drawLogo();
		wrap.appendChild( logoRow );
		wrap.appendChild( el( 'p', { class: 'bsc-hint' }, 'Seed colors are auto-extracted from the logo — the logo is the brand\'s highest-recognition asset, so the palette derives from it, not the other way around.' ) );

		// --- Seeds ---
		wrap.appendChild( el( 'h3', {}, '2 · Seed colors (1–3)' ) );
		const seedRow = el( 'div', { class: 'bsc-qs-seeds' } );
		const preview = el( 'div', { class: 'bsc-qs-preview' } );

		/* Live palette composed in the browser by the WASM color engine. */
		function swatchChip( label, hex, dark ) {
			return el( 'span', { class: 'bsc-mini-swatch', title: label + ' ' + hex }, [
				el( 'span', { class: 'bsc-mini-swatch-chip', style: 'background:' + hex }, null ),
				el( 'span', { class: 'bsc-mini-swatch-label', style: dark ? 'color:#8a8a8a' : '' }, label ),
			] );
		}
		function drawPalettePreview() {
			preview.innerHTML = '';
			if ( ! wasm ) {
				preview.appendChild( el( 'p', { class: 'bsc-hint' }, 'Loading WASM color engine… the live palette preview appears once it is ready. (The server still composes the palette on Extrapolate.)' ) );
				return;
			}
			let p;
			try {
				p = JSON.parse( wasm.compose_palette( JSON.stringify( qs.seeds ) ) );
			} catch ( e ) {
				return;
			}
			preview.appendChild( el( 'p', { class: 'bsc-hint' }, 'Live palette — composed in the browser from your seeds (OKLCH, contrast-gated).' ) );

			const roles = el( 'div', { class: 'bsc-swatches' } );
			[ 'primary', 'secondary', 'accent', 'surface', 'bg', 'ink', 'muted', 'border', 'primary_text', 'success', 'warning', 'danger' ].forEach( ( k ) => {
				roles.appendChild( swatchChip( k.replace( '_', ' ' ), p[ k ] ) );
			} );
			preview.appendChild( roles );

			const ramp = el( 'div', { class: 'bsc-swatches bsc-ramp' } );
			[ '50', '100', '200', '300', '400', '500', '600', '700', '800', '900' ].forEach( ( step ) => {
				ramp.appendChild( swatchChip( step, p.ramp[ step ] ) );
			} );
			preview.appendChild( el( 'p', { class: 'bsc-hint' }, 'Primary ramp (50–900)' ) );
			preview.appendChild( ramp );

			const dark = el( 'div', { class: 'bsc-swatches' } );
			[ 'bg', 'surface', 'ink', 'muted', 'primary' ].forEach( ( k ) => {
				dark.appendChild( swatchChip( 'dark ' + k, p.dark[ k ], true ) );
			} );
			preview.appendChild( el( 'p', { class: 'bsc-hint' }, 'Dark theme counterparts' ) );
			preview.appendChild( dark );
		}

		function drawSeeds() {
			seedRow.innerHTML = '';
			qs.seeds.forEach( ( s, i ) => {
				seedRow.appendChild( el( 'span', { class: 'bsc-qs-seed' }, [
					el( 'input', { type: 'color', value: s, oninput: ( e ) => { qs.seeds[ i ] = e.target.value; drawPalettePreview(); } } ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { qs.seeds.splice( i, 1 ); drawSeeds(); } }, '×' ),
				] ) );
			} );
			if ( qs.seeds.length < 3 ) {
				seedRow.appendChild( el( 'button', { class: 'button', type: 'button', onclick: () => { qs.seeds.push( '#888888' ); drawSeeds(); } }, '+ Seed' ) );
			}
			drawPalettePreview();
		}
		drawSeeds();
		wrap.appendChild( seedRow );
		wrap.appendChild( el( 'p', { class: 'bsc-hint' }, 'Seed 1 = primary. Seed 2 (optional) = secondary; seed 3 (optional) = accent. Anything you leave out is composed for you in OKLCH around seed 1.' ) );
		wrap.appendChild( preview );

		// --- Type combo ---
		wrap.appendChild( el( 'h3', {}, '3 · Type combo' ) );
		qs.fonts = qs.fonts || [ { role: 'heading', family: '' }, { role: 'body', family: '' } ];
		const fontBox = el( 'div', { class: 'bsc-list' } );
		function drawFonts() {
			fontBox.innerHTML = '';
			qs.fonts.forEach( ( f, i ) => {
				fontBox.appendChild( el( 'div', { class: 'bsc-list-row' }, [
					select( f, 'role', [ 'heading', 'subheading', 'body', 'caption', 'mono', 'accent', 'display' ] ),
					el( 'input', { type: 'text', value: f.family || '', placeholder: 'Font family, e.g. Bricolage Grotesque', oninput: ( e ) => { f.family = e.target.value; } } ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { qs.fonts.splice( i, 1 ); drawFonts(); } }, '×' ),
				] ) );
			} );
			fontBox.appendChild( el( 'button', { class: 'button', type: 'button', onclick: () => { qs.fonts.push( { role: 'accent', family: '' } ); drawFonts(); } }, '+ Add font' ) );
		}
		drawFonts();
		wrap.appendChild( fontBox );
		wrap.appendChild( el( 'p', { class: 'bsc-hint' }, 'Pair on a contrast axis (serif + sans, geometric + humanist) — or enter one family for several roles and commit to weight contrast instead. Add as many roles as the system needs.' ) );

		// --- Voice + context ---
		wrap.appendChild( el( 'h3', {}, '4 · Voice & context' ) );
		const vibeRow = el( 'div', { class: 'bsc-grid-3' } );
		qs.vibe.forEach( ( v, i ) => vibeRow.appendChild( field( 'Voice word ' + ( i + 1 ), el( 'input', {
			type: 'text', value: v, placeholder: [ 'e.g. rooted', 'e.g. handmade', 'e.g. luminous' ][ i ],
			oninput: ( e ) => { qs.vibe[ i ] = e.target.value; },
		} ) ) ) );
		wrap.appendChild( vibeRow );
		wrap.appendChild( el( 'p', { class: 'bsc-hint' }, 'Physical-object words, not "modern" or "elegant".' ) );
		wrap.appendChild( el( 'div', { class: 'bsc-grid-3' }, [
			field( 'Industry / what they do', text( qs, 'industry', { placeholder: 'e.g. regenerative landscaping, Vancouver Island' } ) ),
			field( 'Color strategy', select( qs, 'strategy', [ 'restrained', 'committed', 'full', 'drenched' ] ),
				'restrained: neutrals + ≤10% accent · committed: primary carries 30–60% · full: 3–4 deliberate roles · drenched: the surface IS the color' ),
		] ) );

		// --- Go ---
		wrap.appendChild( el( 'button', {
			class: 'button button-primary button-hero', type: 'button',
			onclick: async ( e ) => {
				const btn = e.target;
				btn.disabled = true; btn.textContent = 'Composing palette, scales, and rules…';
				try {
					const res = await wp.apiFetch( { path: '/bsc/v1/extrapolate', method: 'POST', data: {
						name: state.identity.name,
						logo_attachment_id: qs.logo_attachment_id,
						seeds: qs.seeds,
						fonts: qs.fonts.filter( ( f ) => f.family ),
						vibe: qs.vibe.filter( Boolean ),
						industry: qs.industry,
						strategy: qs.strategy,
					} } );
					Object.assign( state, res.brand );
					( res.warnings || [] ).forEach( ( w ) => toast( w, false ) );
					toast( 'Full brand standard generated — review each tab, then Save.' );
					activeTab = 'colors';
					render();
				} catch ( err ) {
					toast( err.message || 'Extrapolation failed', false );
					btn.disabled = false; btn.textContent = 'Extrapolate full brand standard';
				}
			},
		}, 'Extrapolate full brand standard' ) );

		return wrap;
	}

	function tabAIUse() {
		const wrap = el( 'div', { class: 'bsc-feature-page bsc-aiuse' } );
		wrap.appendChild( el( 'section', { class: 'bsc-feature-hero' }, [
			el( 'p', { class: 'bsc-feature-kicker' }, 'Machine-readable brand standards' ),
			el( 'h2', {}, 'Turn a brand system into instructions an AI can actually follow.' ),
			el( 'p', {}, 'The guide is not only a PDF for humans. Every saved brand becomes structured JSON, Markdown, and CSS tokens that can be handed to design agents, build agents, and creative tools as a concrete source of truth.' ),
		] ) );

		wrap.appendChild( el( 'div', { class: 'bsc-feature-flow' }, [
			el( 'div', {}, [ el( 'strong', {}, '1. Define' ), el( 'span', {}, 'Logo, palette, type, spacing, voice, imagery, usage rules.' ) ] ),
			el( 'div', {}, [ el( 'strong', {}, '2. Export' ), el( 'span', {}, 'brand.json, brand.md, tokens.css, and the public guide page.' ) ] ),
			el( 'div', {}, [ el( 'strong', {}, '3. Instruct' ), el( 'span', {}, 'Give those files to OpenDesign, Huashu, Impeccable, Claude design, Codex, or another agent workflow.' ) ] ),
			el( 'div', {}, [ el( 'strong', {}, '4. Generate' ), el( 'span', {}, 'Assets, web sections, social graphics, prompts, launch materials, and design-system code.' ) ] ),
		] ) );

		wrap.appendChild( el( 'h3', {}, 'What the AI receives' ) );
		wrap.appendChild( el( 'div', { class: 'bsc-feature-cards' }, [
			featureCard( 'brand.json', 'A structured contract for software: token names, color roles, accessibility data, typography rules, logo assets, voice, imagery rules, and layout settings.' ),
			featureCard( 'brand.md', 'A readable creative brief for language models: the same rules in a concise execution document that can be pasted into a skill, agent, or project memory.' ),
			featureCard( 'tokens.css', 'Production CSS custom properties that let generated HTML, GenerateBlocks sections, and theme components use the exact same named decisions.' ),
			featureCard( 'Guide page', 'A human-facing source of truth for clients, collaborators, and reviewers. The AI has rules, humans have context.' ),
		] ) );

		wrap.appendChild( el( 'h3', {}, 'Agent workflows this enables' ) );
		wrap.appendChild( el( 'div', { class: 'bsc-feature-cards bsc-feature-cards--wide' }, [
			featureCard( 'OpenDesign and Huashu', 'Use the exported system as the prompt substrate for visual exploration. The model can vary composition without inventing a new palette, voice, or type scale.' ),
			featureCard( 'Impeccable', 'Use brand.json and brand.md as design context before polishing a landing page, component library, dashboard, or WordPress block layout.' ),
			featureCard( 'Claude design or Codex', 'Ask for GenerateBlocks sections, CSS modules, image prompts, slide decks, social carousels, or product mockups that cite the active tokens and rules.' ),
		] ) );

		wrap.appendChild( el( 'h3', {}, 'Prompt pattern' ) );
		wrap.appendChild( el( 'pre', { class: 'bsc-prompt-card' }, 'Use brand.json and brand.md as binding context. Create three homepage hero directions for this brand. Use only named color tokens, respect contrast pairings, use the typography scale, and explain which brand rules each direction satisfies. Do not invent new visual motifs.' ) );

		wrap.appendChild( el( 'h3', {}, 'Guardrails carried into generation' ) );
		wrap.appendChild( el( 'ul', { class: 'bsc-feature-list' }, [
			el( 'li', {}, 'Color roles and contrast pairings prevent illegible or off-brand output.' ),
			el( 'li', {}, 'Typography, spacing, and layout tokens keep assets coherent across pages and formats.' ),
			el( 'li', {}, 'Voice and imagery rules keep spiritual, technical, luxury, playful, or editorial brands from collapsing into generic AI style.' ),
			el( 'li', {}, 'Logo rules and approved assets give agents exact constraints for mockups, exports, and generated collateral.' ),
		] ) );

		return wrap;
	}

	function featureCard( title, body ) {
		return el( 'article', { class: 'bsc-feature-card' }, [
			el( 'strong', {}, title ),
			el( 'p', {}, body ),
		] );
	}


	/* ---------------------------------------------------------- helpers */

	function el( tag, attrs = {}, children = [] ) {
		const n = document.createElement( tag );
		for ( const [ k, v ] of Object.entries( attrs ) ) {
			if ( k === 'class' ) n.className = v;
			else if ( k === 'html' ) n.innerHTML = v;
			else if ( k.startsWith( 'on' ) ) n.addEventListener( k.slice( 2 ), v );
			else if ( v !== false && v !== null && v !== undefined ) n.setAttribute( k, v );
		}
		( Array.isArray( children ) ? children : [ children ] ).forEach( ( c ) => {
			if ( c === null || c === undefined ) return;
			n.appendChild( typeof c === 'string' ? document.createTextNode( c ) : c );
		} );
		return n;
	}

	function field( label, input, hint ) {
		return el( 'div', { class: 'bsc-field' }, [
			el( 'label', {}, label ),
			input,
			hint ? el( 'p', { class: 'bsc-hint' }, hint ) : null,
		] );
	}

	function text( obj, key, attrs = {} ) {
		return el( 'input', Object.assign( {
			type: 'text',
			value: obj[ key ] ?? '',
			oninput: ( e ) => { obj[ key ] = e.target.value; },
		}, attrs ) );
	}

	function num( obj, key, attrs = {} ) {
		return el( 'input', Object.assign( {
			type: 'number', step: 'any',
			value: obj[ key ] ?? '',
			oninput: ( e ) => { obj[ key ] = parseFloat( e.target.value ) || 0; },
		}, attrs ) );
	}

	function area( obj, key, rows = 4 ) {
		return el( 'textarea', {
			rows,
			oninput: ( e ) => { obj[ key ] = e.target.value; },
		}, obj[ key ] ?? '' );
	}

	function select( obj, key, options ) {
		const s = el( 'select', { onchange: ( e ) => { obj[ key ] = e.target.value; } },
			options.map( ( o ) => el( 'option', { value: o, selected: obj[ key ] === o }, o ) ) );
		return s;
	}

	/** Repeater of free strings (dos/donts, attributes). */
	function stringList( arr, placeholder ) {
		const wrap = el( 'div', { class: 'bsc-list' } );
		function draw() {
			wrap.innerHTML = '';
			arr.forEach( ( v, i ) => {
				wrap.appendChild( el( 'div', { class: 'bsc-list-row' }, [
					el( 'input', { type: 'text', value: v, placeholder, oninput: ( e ) => { arr[ i ] = e.target.value; } } ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { arr.splice( i, 1 ); draw(); } }, '×' ),
				] ) );
			} );
			wrap.appendChild( el( 'button', { class: 'button', type: 'button', onclick: () => { arr.push( '' ); draw(); } }, '+ Add' ) );
		}
		draw();
		return wrap;
	}

	function mediaPick( cb ) {
		const frame = wp.media( { title: 'Select asset', multiple: false } );
		frame.on( 'select', () => {
			const a = frame.state().get( 'selection' ).first().toJSON();
			cb( a.id, a.url );
		} );
		frame.open();
	}

	function thumb( id ) {
		const img = el( 'img', { class: 'bsc-thumb' } );
		if ( id ) {
			wp.apiFetch( { path: '/wp/v2/media/' + id } ).then( ( m ) => { img.src = m.source_url; } ).catch( () => {} );
		}
		return img;
	}

	function toast( msg, ok = true ) {
		const t = el( 'div', { class: 'bsc-toast' + ( ok ? '' : ' bsc-toast-err' ) }, msg );
		document.body.appendChild( t );
		setTimeout( () => t.remove(), 3500 );
	}

	/* WCAG math (mirrors PHP). */
	function lum( hex ) {
		hex = hex.replace( '#', '' );
		if ( hex.length === 3 ) hex = hex.split( '' ).map( ( c ) => c + c ).join( '' );
		const rgb = [ 0, 2, 4 ].map( ( i ) => parseInt( hex.substr( i, 2 ), 16 ) / 255 )
			.map( ( c ) => ( c <= 0.04045 ? c / 12.92 : Math.pow( ( c + 0.055 ) / 1.055, 2.4 ) ) );
		return 0.2126 * rgb[ 0 ] + 0.7152 * rgb[ 1 ] + 0.0722 * rgb[ 2 ];
	}
	function ratio( a, b ) {
		if ( wasm ) {
			return wasm.contrast_ratio( a, b ).toFixed( 2 );
		}
		const l1 = lum( a ), l2 = lum( b );
		return ( ( Math.max( l1, l2 ) + 0.05 ) / ( Math.min( l1, l2 ) + 0.05 ) ).toFixed( 2 );
	}

	/* AI text helper button. */
	function aiButton( label, promptBuilder, apply ) {
		return el( 'button', {
			class: 'button bsc-ai-btn', type: 'button',
			onclick: async ( e ) => {
				const btn = e.target;
				btn.disabled = true; btn.textContent = 'Generating…';
				try {
					const res = await wp.apiFetch( {
						path: '/bsc/v1/ai/text', method: 'POST',
						data: {
							provider: state.ai.text_provider,
							model: state.ai.text_model,
							prompt: promptBuilder(),
						},
					} );
					apply( res.text );
					render();
					toast( 'Generated ✓' );
				} catch ( err ) {
					toast( err.message || 'Generation failed', false );
				}
				btn.disabled = false; btn.textContent = label;
			},
		}, label );
	}

	function brandContext() {
		return 'Brand: ' + state.identity.name +
			( state.identity.tagline ? ' — ' + state.identity.tagline : '' ) +
			( state.identity.mission ? '\nMission: ' + state.identity.mission : '' ) +
			'\nColors: ' + state.colors.map( ( c ) => c.name + ' ' + c.hex + ' (' + c.role + ')' ).join( ', ' );
	}

	/* ------------------------------------------------------------- tabs */

	const tabs = {
		quickstart: tabQuickStart,
		aiuse: tabAIUse,
		identity: tabIdentity,
		logos: tabLogos,
		colors: tabColors,
		typography: tabTypography,
		spacing: tabSpacing,
		imagery: tabImagery,
		library: tabLibrary,
		context: tabContext,
		tone: tabTone,
		ai: tabAI,
		export: tabExport,
	};
	const tabLabels = {
		quickstart: '⚡ Quick Start',
		aiuse: 'AI Use Cases',
		identity: 'Identity', logos: 'Logos & Lockups', colors: 'Color', typography: 'Typography',
		spacing: 'Spacing & Layout', imagery: 'Imagery', library: 'Asset Library', context: 'In Application', tone: 'Voice & Tone', ai: 'AI & API Keys', export: 'Export & Sync',
	};

	/** Section on/off pill used by optional sections. */
	function sectionToggle( key, label ) {
		state.sections = state.sections || {};
		const pill = el( 'label', { class: 'bsc-switch' }, [
			el( 'input', { type: 'checkbox', checked: !! state.sections[ key ], onchange: ( e ) => { state.sections[ key ] = e.target.checked; } } ),
			el( 'span', { class: 'bsc-switch-track' }, el( 'span', { class: 'bsc-switch-thumb' } ) ),
			el( 'span', {}, label ),
		] );
		return el( 'div', { class: 'bsc-section-toggle' }, pill );
	}

	function tabIdentity() {
		return el( 'div', {}, [
			sectionToggle( 'identity', 'Include the Identity / Mission section in the guide, PDF, and exports' ),
			field( 'Brand name', text( state.identity, 'name' ) ),
			field( 'Tagline', text( state.identity, 'tagline' ) ),
			field( 'Mission / positioning', area( state.identity, 'mission', 5 ) ),
			aiButton( 'Draft mission with AI', () =>
				'Write a 2–3 sentence brand mission/positioning statement.\n' + brandContext(),
				( t ) => { state.identity.mission = t.trim(); } ),
		] );
	}

	function tabLogos() {
		const wrap = el( 'div' );

		function assetRepeater( arr, fields, addLabel ) {
			const box = el( 'div', { class: 'bsc-cards' } );
			function draw() {
				box.innerHTML = '';
				arr.forEach( ( item, i ) => {
					const card = el( 'div', { class: 'bsc-card' }, [
						thumb( item.attachment_id ),
						el( 'button', { class: 'button', type: 'button', onclick: () => mediaPick( ( id ) => { item.attachment_id = id; draw(); } ) }, item.attachment_id ? 'Replace file' : 'Choose file' ),
						...fields( item ),
						el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { arr.splice( i, 1 ); draw(); } }, 'Remove' ),
					] );
					box.appendChild( card );
				} );
				box.appendChild( el( 'button', { class: 'button button-secondary', type: 'button', onclick: () => { arr.push( { attachment_id: 0 } ); draw(); } }, addLabel ) );
			}
			draw();
			return box;
		}

		wrap.appendChild( el( 'h3', {}, 'Logo variations' ) );
		wrap.appendChild( assetRepeater( state.logos, ( item ) => [
			field( 'Label', text( item, 'label', { placeholder: 'Primary horizontal' } ) ),
			field( 'Variant', select( item, 'variant', [ 'primary', 'inverse', 'mark', 'wordmark', 'mono' ] ) ),
			field( 'Min size (px)', num( item, 'min_size_px' ) ),
			field( 'Clearspace rule', text( item, 'clearspace', { placeholder: 'Height of the "x" on all sides' } ) ),
			field( 'Background', select( item, 'background', [ 'any', 'light', 'dark' ] ) ),
		], '+ Add logo variation' ) );

		wrap.appendChild( el( 'h3', {}, 'Approved lockups / presentations' ) );
		wrap.appendChild( assetRepeater( state.lockups, ( item ) => [
			field( 'Label', text( item, 'label', { placeholder: 'Logo + tagline, stacked' } ) ),
			field( 'Usage', area( item, 'usage', 2 ) ),
		], '+ Add lockup' ) );

		wrap.appendChild( el( 'h3', {}, 'Logo treatment — DO' ) );
		wrap.appendChild( stringList( state.logo_rules.dos, 'e.g. Maintain clearspace at all sizes' ) );
		wrap.appendChild( el( 'h3', {}, 'Logo treatment — DO NOT' ) );
		wrap.appendChild( stringList( state.logo_rules.donts, 'e.g. Do not stretch, recolor, or add drop shadows' ) );
		wrap.appendChild( aiButton( 'Suggest dos & don’ts with AI', () =>
			'List 6 logo usage DOS and 6 DON\'TS for this brand as two plain lists separated by the line "---". One rule per line, no numbering.\n' + brandContext(),
			( t ) => {
				const [ dos, donts ] = t.split( '---' );
				if ( dos ) state.logo_rules.dos = dos.trim().split( '\n' ).map( ( s ) => s.replace( /^[-•\s]+/, '' ) ).filter( Boolean );
				if ( donts ) state.logo_rules.donts = donts.trim().split( '\n' ).map( ( s ) => s.replace( /^[-•\s]+/, '' ) ).filter( Boolean );
			} ) );
		return wrap;
	}

	function tabColors() {
		const wrap = el( 'div' );
		const box = el( 'div', { class: 'bsc-cards' } );

		function draw() {
			box.innerHTML = '';
			state.colors.forEach( ( c, i ) => {
				box.appendChild( el( 'div', { class: 'bsc-card' }, [
					el( 'div', { class: 'bsc-swatch', style: 'background:' + ( c.hex || '#fff' ) } ),
					field( 'Name', text( c, 'name', { oninput: ( e ) => { c.name = e.target.value; c.slug = e.target.value.toLowerCase().replace( /[^a-z0-9]+/g, '-' ); } } ) ),
					field( 'Hex', el( 'input', { type: 'color', value: c.hex || '#000000', oninput: ( e ) => { c.hex = e.target.value; draw(); drawMatrix(); } } ) ),
					field( 'Role', select( c, 'role', [ 'primary', 'secondary', 'accent', 'neutral', 'surface', 'text' ] ) ),
					field( 'Usage', area( c, 'usage', 2 ) ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { state.colors.splice( i, 1 ); draw(); drawMatrix(); } }, 'Remove' ),
				] ) );
			} );
			box.appendChild( el( 'button', { class: 'button button-secondary', type: 'button', onclick: () => { state.colors.push( { slug: '', name: '', hex: '#333333', role: 'primary', usage: '' } ); draw(); drawMatrix(); } }, '+ Add color' ) );
		}

		const matrix = el( 'div', { class: 'bsc-matrix' } );
		function drawMatrix() {
			matrix.innerHTML = '';
			if ( state.colors.length < 2 ) return;
			matrix.appendChild( el( 'h3', {}, 'WCAG contrast matrix (live)' ) );
			const table = el( 'table', { class: 'widefat striped' } );
			table.appendChild( el( 'tr', {}, [ el( 'th', {}, 'Pair' ), el( 'th', {}, 'Ratio' ), el( 'th', {}, 'AA text' ), el( 'th', {}, 'AAA text' ), el( 'th', {}, 'UI 3:1' ) ] ) );
			state.colors.forEach( ( a ) => state.colors.forEach( ( b ) => {
				if ( a === b || ! a.hex || ! b.hex ) return;
				const r = parseFloat( ratio( a.hex, b.hex ) );
				table.appendChild( el( 'tr', {}, [
					el( 'td', {}, [ el( 'span', { class: 'bsc-pair', style: 'color:' + a.hex + ';background:' + b.hex }, ' Aa ' ), ' ' + ( a.name || a.hex ) + ' on ' + ( b.name || b.hex ) ] ),
					el( 'td', {}, r + ':1' ),
					el( 'td', { class: r >= 4.5 ? 'bsc-pass' : 'bsc-fail' }, r >= 4.5 ? 'Pass' : 'Fail' ),
					el( 'td', { class: r >= 7 ? 'bsc-pass' : 'bsc-fail' }, r >= 7 ? 'Pass' : 'Fail' ),
					el( 'td', { class: r >= 3 ? 'bsc-pass' : 'bsc-fail' }, r >= 3 ? 'Pass' : 'Fail' ),
				] ) );
			} ) );
			matrix.appendChild( table );
		}

		draw();
		drawMatrix();
		wrap.appendChild( box );
		wrap.appendChild( matrix );
		if ( BSC.gp_active ) {
			wrap.appendChild( el( 'p', { class: 'bsc-hint' }, '✓ GeneratePress detected — saving syncs these to GP Global Colors (available in all GenerateBlocks color pickers).' ) );
		}
		return wrap;
	}

	function tabTypography() {
		const wrap = el( 'div' );
		const box = el( 'div', { class: 'bsc-cards' } );
		function draw() {
			box.innerHTML = '';
			state.typography.fonts.forEach( ( f, i ) => {
				box.appendChild( el( 'div', { class: 'bsc-card' }, [
					field( 'Role', select( f, 'role', [ 'heading', 'subheading', 'body', 'caption', 'mono', 'accent', 'display' ] ) ),
					field( 'Family', text( f, 'family', { placeholder: 'Fraunces' } ) ),
					field( 'Fallback stack', text( f, 'fallback', { placeholder: 'Georgia, serif' } ) ),
					field( 'Source', select( f, 'source', [ 'google', 'adobe', 'self', 'system' ] ) ),
					field( 'Weights (comma sep.)', el( 'input', {
						type: 'text', value: ( f.weights || [] ).join( ', ' ),
						oninput: ( e ) => { f.weights = e.target.value.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean ); },
					} ) ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { state.typography.fonts.splice( i, 1 ); draw(); } }, 'Remove' ),
				] ) );
			} );
			box.appendChild( el( 'button', { class: 'button button-secondary', type: 'button', onclick: () => { state.typography.fonts.push( { role: 'body', family: '', fallback: '', source: 'google', weights: [] } ); draw(); } }, '+ Add font' ) );
		}
		draw();
		wrap.appendChild( box );

		const s = state.typography.scale;
		wrap.appendChild( el( 'div', { class: 'bsc-grid-3' }, [
			field( 'Base size (px)', num( s, 'base_px' ) ),
			field( 'Scale ratio', num( s, 'ratio' ), 'e.g. 1.25 (major third), 1.333 (perfect fourth), 1.618 (golden)' ),
			field( 'Body line-height', num( state.typography.line_height, 'body' ) ),
			field( 'Heading line-height', num( state.typography.line_height, 'heading' ) ),
		] ) );
		wrap.appendChild( field( 'Typography notes', area( state.typography, 'notes', 3 ), 'Tracking, case rules, where each face is used…' ) );
		return wrap;
	}

	function tabSpacing() {
		const wrap = el( 'div' );
		state.layout = state.layout || { grid_columns: 12, gutter_px: 24, margin: '', max_width_px: 1200, principles: [] };

		wrap.appendChild( el( 'h3', {}, 'Spacing system' ) );
		wrap.appendChild( field( 'Base unit (px)', num( state.spacing, 'base_px' ) ) );
		wrap.appendChild( field( 'Scale multipliers (comma sep.)', el( 'input', {
			type: 'text', value: state.spacing.scale.join( ', ' ),
			oninput: ( e ) => { state.spacing.scale = e.target.value.split( ',' ).map( ( s ) => parseFloat( s ) ).filter( ( n ) => ! isNaN( n ) ); },
		} ), 'Multiplied by the base unit. Tokens become --bsc-space-1 …' ) );
		wrap.appendChild( field( 'Spacing notes', area( state.spacing, 'notes', 3 ) ) );

		wrap.appendChild( el( 'h3', {}, 'Grid & layout' ) );
		wrap.appendChild( el( 'div', { class: 'bsc-grid-3' }, [
			field( 'Grid columns', num( state.layout, 'grid_columns' ) ),
			field( 'Gutter (px)', num( state.layout, 'gutter_px' ) ),
			field( 'Max content width (px)', num( state.layout, 'max_width_px' ) ),
			field( 'Page margins', text( state.layout, 'margin', { placeholder: 'clamp(24px, 5vw, 96px)' } ) ),
		] ) );
		wrap.appendChild( el( 'h3', {}, 'Composition principles' ) );
		state.layout.principles = state.layout.principles || [];
		wrap.appendChild( stringList( state.layout.principles, 'e.g. Leave a clear third for type on any hero image' ) );

		wrap.appendChild( el( 'h3', {}, 'Layout ratios' ) );
		const box = el( 'div', { class: 'bsc-list' } );
		function draw() {
			box.innerHTML = '';
			state.ratios.layout.forEach( ( r, i ) => {
				box.appendChild( el( 'div', { class: 'bsc-list-row' }, [
					el( 'input', { type: 'text', value: r.label || '', placeholder: 'Golden ratio', oninput: ( e ) => { r.label = e.target.value; } } ),
					el( 'input', { type: 'text', value: r.value || '', placeholder: '1:1.618', oninput: ( e ) => { r.value = e.target.value; } } ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { state.ratios.layout.splice( i, 1 ); draw(); } }, '×' ),
				] ) );
			} );
			box.appendChild( el( 'button', { class: 'button', type: 'button', onclick: () => { state.ratios.layout.push( {} ); draw(); } }, '+ Add ratio' ) );
		}
		draw();
		wrap.appendChild( box );
		wrap.appendChild( el( 'h3', {}, 'Allowed image aspect ratios' ) );
		wrap.appendChild( stringList( state.ratios.image_aspects, '16:9' ) );
		return wrap;
	}

	function tabImagery() {
		const wrap = el( 'div' );
		wrap.appendChild( field( 'Image style description', area( state.imagery, 'style', 4 ), 'This doubles as the base prompt for AI image generation.' ) );
		wrap.appendChild( field( 'Treatments', area( state.imagery, 'treatments', 2 ), 'Duotone, grain, overlays, corner radius…' ) );
		wrap.appendChild( el( 'h3', {}, 'Imagery — DO' ) );
		wrap.appendChild( stringList( state.imagery.dos, '' ) );
		wrap.appendChild( el( 'h3', {}, 'Imagery — DO NOT' ) );
		wrap.appendChild( stringList( state.imagery.donts, '' ) );

		wrap.appendChild( el( 'h3', {}, 'Generate brand assets (fal.ai)' ) );
		const promptBox = el( 'textarea', { rows: 3, placeholder: 'Describe the asset…' } );
		const kind = el( 'select', {}, [
			el( 'option', { value: 'raster' }, 'Raster — GPT Image' ),
			el( 'option', { value: 'vector' }, 'Vector — Recraft' ),
		] );
		const out = el( 'div', { class: 'bsc-gen-out' } );
		wrap.appendChild( el( 'div', { class: 'bsc-gen' }, [
			promptBox, kind,
			el( 'button', {
				class: 'button button-primary', type: 'button',
				onclick: async ( e ) => {
					const btn = e.target;
					btn.disabled = true; btn.textContent = 'Generating…';
					try {
						const res = await wp.apiFetch( {
							path: '/bsc/v1/ai/image', method: 'POST',
							data: { kind: kind.value, prompt: ( state.imagery.style ? state.imagery.style + '. ' : '' ) + promptBox.value },
						} );
						out.prepend( el( 'figure', {}, [
							el( 'img', { src: res.url } ),
							el( 'figcaption', {}, res.attachment_id ? 'Saved to Media Library (#' + res.attachment_id + ')' : 'Remote only' ),
						] ) );
						if ( res.attachment_id ) state.imagery.examples.push( res.attachment_id );
						toast( 'Asset generated ✓' );
					} catch ( err ) {
						toast( err.message || 'Generation failed', false );
					}
					btn.disabled = false; btn.textContent = 'Generate';
				},
			}, 'Generate' ),
		] ) );
		wrap.appendChild( out );
		return wrap;
	}

	/* Asset Library — four shared brand image categories. Approved items become
	   referenced brand standards (brand.json / brand.md) and feed Stockboss. */
	const LIBRARY_CATEGORIES = [
		[ 'graphics', 'Graphical Elements' ],
		[ 'icons', 'Icons' ],
		[ 'stock', 'Stock Imagery' ],
		[ 'illustrations', 'Illustrations' ],
	];

	function tabLibrary() {
		const wrap = el( 'div' );
		state.asset_library = state.asset_library || {};

		wrap.appendChild( el( 'p', { class: 'bsc-hint' },
			'Approved images here are the brand\'s canonical visual assets. They\'re written into brand.json and brand.md, and shared with Stockboss so generated imagery stays on-brand. Stockboss can also push approved generations straight into these categories.' ) );

		LIBRARY_CATEGORIES.forEach( ( [ slug, label ] ) => {
			state.asset_library[ slug ] = state.asset_library[ slug ] || [];
			const arr = state.asset_library[ slug ];

			wrap.appendChild( el( 'h3', {}, label ) );
			const box = el( 'div', { class: 'bsc-cards' } );

			function draw() {
				box.innerHTML = '';
				arr.forEach( ( item, i ) => {
					item.approved = item.approved !== false; // default approved
					box.appendChild( el( 'div', { class: 'bsc-card' }, [
						thumb( item.attachment_id ),
						el( 'button', { class: 'button', type: 'button', onclick: () => mediaPick( ( id ) => { item.attachment_id = id; draw(); } ) }, item.attachment_id ? 'Replace' : 'Choose image' ),
						field( 'Label', text( item, 'label', { placeholder: label + ' asset' } ) ),
						field( 'Prompt / note', area( item, 'prompt', 2 ) ),
						el( 'label', { class: 'bsc-switch' }, [
							el( 'input', { type: 'checkbox', checked: item.approved !== false, onchange: ( e ) => { item.approved = e.target.checked; } } ),
							el( 'span', { class: 'bsc-switch-track' }, el( 'span', { class: 'bsc-switch-thumb' } ) ),
							el( 'span', {}, 'Approved (counts as a brand standard)' ),
						] ),
						el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { arr.splice( i, 1 ); draw(); } }, 'Remove' ),
					] ) );
				} );
				box.appendChild( el( 'button', { class: 'button button-secondary', type: 'button', onclick: () => { arr.push( { attachment_id: 0, label: '', prompt: '', approved: true, source: 'brandboss' } ); draw(); } }, '+ Add ' + label ) );
			}
			draw();
			wrap.appendChild( box );
		} );

		return wrap;
	}

	function tabContext() {
		const wrap = el( 'div' );
		state.context = state.context || { intro: '', items: [] };
		wrap.appendChild( sectionToggle( 'context', 'Include the Brand In Application section (stationery, signage, mockups)' ) );
		wrap.appendChild( field( 'Intro', area( state.context, 'intro', 2 ), 'One or two lines framing the applications shown.' ) );

		const box = el( 'div', { class: 'bsc-cards' } );
		function draw() {
			box.innerHTML = '';
			state.context.items.forEach( ( item, i ) => {
				box.appendChild( el( 'div', { class: 'bsc-card' }, [
					thumb( item.attachment_id ),
					el( 'button', { class: 'button', type: 'button', onclick: () => mediaPick( ( id ) => { item.attachment_id = id; draw(); } ) }, item.attachment_id ? 'Replace' : 'Choose image' ),
					field( 'Caption', text( item, 'caption', { placeholder: 'Business cards — charcoal face, linen reverse' } ) ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { state.context.items.splice( i, 1 ); draw(); } }, 'Remove' ),
				] ) );
			} );
			box.appendChild( el( 'button', { class: 'button button-secondary', type: 'button', onclick: () => { state.context.items.push( { attachment_id: 0, caption: '' } ); draw(); } }, '+ Add application' ) );
		}
		draw();
		wrap.appendChild( box );
		return wrap;
	}

	function tabTone() {
		const wrap = el( 'div' );
		wrap.appendChild( sectionToggle( 'voice', 'Include the Voice & Tone section in the guide, PDF, and exports' ) );
		wrap.appendChild( el( 'h3', {}, 'Voice attributes' ) );
		wrap.appendChild( stringList( state.tone.attributes, 'warm, direct, grounded…' ) );
		wrap.appendChild( field( 'Guidelines', area( state.tone, 'guidelines', 6 ) ) );
		wrap.appendChild( aiButton( 'Draft tone guidelines with AI', () =>
			'Write voice & tone guidelines (~150 words) plus 3 say/don\'t-say example pairs formatted as DO: ... / DONT: ... lines.\nVoice attributes: ' + state.tone.attributes.join( ', ' ) + '\n' + brandContext(),
			( t ) => { state.tone.guidelines = t.trim(); } ) );

		wrap.appendChild( el( 'h3', {}, 'Say this / not that' ) );
		const box = el( 'div', { class: 'bsc-list' } );
		function draw() {
			box.innerHTML = '';
			state.tone.examples.forEach( ( ex, i ) => {
				box.appendChild( el( 'div', { class: 'bsc-list-row' }, [
					el( 'input', { type: 'text', value: ex.do || '', placeholder: '✅ Say…', oninput: ( e ) => { ex.do = e.target.value; } } ),
					el( 'input', { type: 'text', value: ex.dont || '', placeholder: '❌ Not…', oninput: ( e ) => { ex.dont = e.target.value; } } ),
					el( 'button', { class: 'button bsc-x', type: 'button', onclick: () => { state.tone.examples.splice( i, 1 ); draw(); } }, '×' ),
				] ) );
			} );
			box.appendChild( el( 'button', { class: 'button', type: 'button', onclick: () => { state.tone.examples.push( {} ); draw(); } }, '+ Add pair' ) );
		}
		draw();
		wrap.appendChild( box );
		return wrap;
	}

	function tabAI() {
		const wrap = el( 'div' );
		wrap.appendChild( el( 'h3', {}, 'Text generation' ) );
		wrap.appendChild( el( 'div', { class: 'bsc-grid-3' }, [
			field( 'Provider', select( state.ai, 'text_provider', [ 'openrouter', 'deepseek', 'minimax' ] ) ),
			field( 'Model', text( state.ai, 'text_model', { placeholder: 'deepseek/deepseek-chat-v3' } ) ),
		] ) );
		wrap.appendChild( el( 'h3', {}, 'Image models (fal.ai)' ) );
		wrap.appendChild( el( 'div', { class: 'bsc-grid-3' }, [
			field( 'Vector model', text( state.ai, 'fal_vector_model' ) ),
			field( 'Raster model', text( state.ai, 'fal_raster_model' ), 'Point this at the GPT Image 2 endpoint when fal exposes it.' ),
		] ) );

		wrap.appendChild( el( 'h3', {}, 'API keys' ) );
		wrap.appendChild( el( 'p', { class: 'bsc-hint' }, 'Keys are encrypted at rest (libsodium, salt-derived key) and are never sent to the browser. Leave blank to keep the current key; type "clear" to remove.' ) );
		const inputs = {};
		[ 'openrouter', 'deepseek', 'minimax', 'fal' ].forEach( ( svc ) => {
			inputs[ svc ] = el( 'input', { type: 'password', autocomplete: 'new-password', placeholder: keys[ svc ] ? '•••••••• (saved)' : 'Not set' } );
			wrap.appendChild( field( svc, inputs[ svc ] ) );
		} );
		wrap.appendChild( el( 'button', {
			class: 'button button-primary', type: 'button',
			onclick: async ( e ) => {
				const payload = {};
				for ( const [ svc, input ] of Object.entries( inputs ) ) {
					if ( input.value === 'clear' ) payload[ svc ] = '';
					else if ( input.value.trim() ) payload[ svc ] = input.value.trim();
				}
				if ( ! Object.keys( payload ).length ) return toast( 'Nothing to save' );
				const res = await wp.apiFetch( { path: '/bsc/v1/keys', method: 'POST', data: { keys: payload } } );
				keys = res.status;
				render();
				toast( 'Keys saved ✓' );
			},
		}, 'Save keys' ) );
		return wrap;
	}

	function tabExport() {
		const wrap = el( 'div' );
		wrap.appendChild( el( 'p', {}, 'Saving the brand automatically regenerates human and machine-readable exports. Use these files as the source of truth for AI design agents, GenerateBlocks builds, production CSS, and client review.' ) );
		wrap.appendChild( el( 'ul', { class: 'bsc-exports' }, [
			el( 'li', {}, el( 'a', { href: BSC.exports.json, target: '_blank' }, 'brand.json — machine-readable (tokens, rules, contrast matrix, asset URLs)' ) ),
			el( 'li', {}, el( 'a', { href: BSC.exports.md, target: '_blank' }, 'brand.md — AI execution brief with asset links' ) ),
			el( 'li', {}, el( 'a', { href: BSC.exports.tokens, target: '_blank' }, 'tokens.css — CSS custom properties (auto-enqueued site-wide)' ) ),
		] ) );
		wrap.appendChild( el( 'h3', {}, 'Guide page & PDF' ) );
		if ( BSC.guide_url ) {
			wrap.appendChild( el( 'p', {}, [
				el( 'a', { class: 'button', href: BSC.guide_url, target: '_blank' }, 'View guide page' ),
				' Use the “Download PDF” button on the page (print stylesheet with exact colors).',
			] ) );
		} else {
			wrap.appendChild( el( 'a', { class: 'button button-primary', href: BSC.create_guide_url }, 'Create guide page' ) );
		}
		return wrap;
	}

	/* ----------------------------------------------------------- render */

	async function save() {
		try {
			if ( state.sections ) state.tone.enabled = !! state.sections.voice;
			await wp.apiFetch( { path: '/bsc/v1/brand', method: 'POST', data: { brand: state } } );
			toast( 'Brand saved — exports regenerated ✓' );
		} catch ( err ) {
			toast( err.message || 'Save failed', false );
		}
	}

	function render() {
		root.innerHTML = '';
		root.appendChild( el( 'div', { class: 'bsc-head' }, [
			el( 'h1', {}, 'BrandBoss' ),
			el( 'button', { class: 'button button-primary button-hero', type: 'button', onclick: save }, 'Save brand' ),
		] ) );
		root.appendChild( el( 'nav', { class: 'bsc-tabs' },
			Object.keys( tabs ).map( ( id ) => el( 'a', {
				href: '#', class: id === activeTab ? 'active' : '',
				onclick: ( e ) => { e.preventDefault(); activeTab = id; render(); },
			}, tabLabels[ id ] ) ) ) );
		root.appendChild( el( 'div', { class: 'bsc-panel' }, tabs[ activeTab ]() ) );
	}

	render();
}() );
