/**
 * AWEN01 fixed header — scroll-aware hide/show.
 *
 * - Hides the header when scrolling down past a threshold.
 * - Reveals the header immediately when scrolling up.
 * - Uses requestAnimationFrame for performance.
 * - Respects prefers-reduced-motion.
 */

(function () {
	const HEADER_SEL = '.gb-element-b4674d84';
	const HIDDEN_CLASS = 'awen-header-hidden';
	const SCROLL_THRESHOLD = 60; // px of scroll before hiding kicks in

	const header = document.querySelector(HEADER_SEL);
	if (!header) return;

	let lastScrollY = window.scrollY;
	let ticking = false;

	/* ---- Scroll direction tracking ---- */
	function onScroll() {
		const currentScrollY = window.scrollY;

		if (currentScrollY <= 0) {
			// At the very top — always show
			header.classList.remove(HIDDEN_CLASS);
		} else if (currentScrollY > lastScrollY && currentScrollY > SCROLL_THRESHOLD) {
			// Scrolling down past threshold — hide
			header.classList.add(HIDDEN_CLASS);
		} else if (currentScrollY < lastScrollY) {
			// Scrolling up — show
			header.classList.remove(HIDDEN_CLASS);
		}

		lastScrollY = currentScrollY;
		ticking = false;
	}

	window.addEventListener('scroll', function () {
		if (!ticking) {
			requestAnimationFrame(onScroll);
			ticking = true;
		}
	}, { passive: true });
})();

(function () {
	const DEMO_SEL = '[data-ubgs-pack-demo]';
	const TRIGGER_SEL = '[data-ubgs-demo-pack]';
	const DEFAULT_PACK = 'water';

	const demos = {
		elemental: {
			pack: 'water',
			label: 'Elemental',
			title: 'Water ripples, fire, clouds, and earth disturbance.',
			body: 'The demo opens on Water Ripples: a responsive caustic field that reacts to cursor, taps, and scroll.'
		},
		luxury: {
			pack: 'silk',
			label: 'Luxury',
			title: 'Silk, marble, pearl, crystal, metal, and smoke.',
			body: 'Flowing Silk shows how luxury packs can feel tactile without becoming heavy or distracting.'
		},
		retro: {
			pack: 'synthgrid',
			label: 'Retro Future',
			title: 'Synth grids, wire mountains, circuitry, and pixel aurora.',
			body: 'Synthwave Grid gives a clearer product-demo moment for more technical or nostalgic pages.'
		},
		ascii: {
			pack: 'matrixrain',
			label: 'ASCII Art',
			title: 'Character-grid motion for code, text, and signal pages.',
			body: 'Matrix Rain demonstrates the character-based packs without making the AWEN01 site feel like generic cyberpunk.'
		},
		sonic: {
			pack: 'waveform',
			label: 'Sonic',
			title: 'Waveforms, spectrum bars, strings, and cymatics.',
			body: 'Waveform makes the music lineage visible: motion that feels driven by sound and gesture.'
		}
	};

	function renderDemo(stage, key) {
		if (!stage || !window.UltraBGs) return;
		const demo = demos[key] || demos.elemental;
		const pack = window.UltraBGs.packs[demo.pack] ? demo.pack : DEFAULT_PACK;
		stage.setAttribute('data-ubgs-pack-demo', key);

		if (stage._awenUbgsInstance) {
			window.UltraBGs.unmount(stage._awenUbgsInstance);
			stage._awenUbgsInstance = null;
		}

		const canvasHost = document.createElement('div');
		canvasHost.className = 'ubgs-pack-demo__canvas';
		stage.replaceChildren(canvasHost);

		stage._awenUbgsInstance = window.UltraBGs.mount(canvasHost, pack, window.UltraBGs.sanitizeConfig({
			colors: ['#08110f', '#36d6c7', '#a98bff', '#6b9cff'],
			opacity: 0.88,
			speed: 0.72,
			density: 1.08,
			zIndex: 0,
			fps: 18,
			maxDpr: 0.65
		}));

		const meta = document.createElement('div');
		meta.className = 'ubgs-pack-demo__meta';
		meta.innerHTML = '<p></p><h3></h3><span></span>';
		meta.querySelector('p').textContent = demo.label + ' demo';
		meta.querySelector('h3').textContent = demo.title;
		meta.querySelector('span').textContent = demo.body;
		stage.appendChild(meta);
	}

	function initPackDemos() {
		document.querySelectorAll(DEMO_SEL).forEach(function (stage) {
			const root = stage.closest('.ubgs-pack-demo') || document;
			const triggers = Array.from(root.querySelectorAll(TRIGGER_SEL));
			const initial = stage.getAttribute('data-ubgs-pack-demo') || 'elemental';
			renderDemo(stage, initial);

			triggers.forEach(function (trigger) {
				trigger.addEventListener('click', function () {
					const key = trigger.getAttribute('data-ubgs-demo-pack') || 'elemental';
					triggers.forEach(function (item) {
						item.classList.toggle('is-active', item === trigger);
						item.setAttribute('aria-pressed', item === trigger ? 'true' : 'false');
					});
					renderDemo(stage, key);
				});
			});
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initPackDemos);
	} else {
		initPackDemos();
	}
})();
